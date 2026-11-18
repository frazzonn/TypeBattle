import jwt from "jsonwebtoken";
import type { Request, Response } from "express";

import { CHASE_DELAY_MS, getChaserPosition } from "../battle/chase.js";
import { DEFAULT_LANGUAGE, isLanguageCode } from "../battle/textGenerator.js";
import { isDictionaryWord, normalizeWord } from "../pavio/pavioWords.js";
import { db } from "../prisma/db.js";
import { getTagsForUsers, isAdminEmail } from "../tags/userTags.js";
import { ALLOWED_WORD_COUNTS } from "./TypingResultController.js";

// Jogos do Arcade com ranking. O score de cada um:
//   orbita: pontos · pavio: palavras · chase: milissegundos aguentados.
export const ARCADE_GAMES = ["orbita", "pavio", "chase"] as const;
type ArcadeGame = (typeof ARCADE_GAMES)[number];

const RANKING_LIMIT = 100;
// Acima disso não é plausível para um humano (o mesmo limite do teste solo).
const MAX_PPM = 350;

interface ArcadeInput {
  game: ArcadeGame;
  score: number;
  language: string;
  details: Record<string, number | string>;
}

function isInt(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}

function ppmFor(letters: number, ms: number): number {
  return Math.round(letters / 5 / (ms / 60_000));
}

// Confere se os números fazem sentido juntos; o resultado vem do navegador.
export function validateArcade(body: unknown): ArcadeInput | string {
  const input = (body ?? {}) as Record<string, unknown>;
  const game = input.game;

  if (game === "orbita") {
    const { score, letters, seconds, wave, bestCombo, killed, accuracy } = input;
    if (
      !isInt(score, 0, 10_000_000) || !isInt(letters, 1, 100_000) || !isInt(seconds, 3, 7200) ||
      !isInt(wave, 1, 1000) || !isInt(bestCombo, 0, 100_000) || !isInt(killed, 0, 100_000) ||
      !isInt(accuracy, 0, 100)
    ) {
      return "Resultado inválido.";
    }
    const ppm = ppmFor(letters, seconds * 1000);
    // Cada letra vale no máximo 30 pontos (10 com multiplicador x3);
    // cada palavra tem pelo menos 3 letras.
    if (ppm > MAX_PPM || score > letters * 30 || killed * 3 > letters || bestCombo > killed) {
      return "Resultado inválido.";
    }
    return { game, score, language: DEFAULT_LANGUAGE, details: { wave, bestCombo, killed, ppm, accuracy, seconds } };
  }

  if (game === "pavio") {
    const { words, seconds } = input;
    if (!Array.isArray(words) || words.length > 2000 || !isInt(seconds, 1, 7200)) {
      return "Resultado inválido.";
    }
    // Toda palavra precisa existir e não pode repetir.
    const seen = new Set<string>();
    for (const raw of words) {
      if (typeof raw !== "string") return "Resultado inválido.";
      const word = normalizeWord(raw);
      if (word.length < 3 || seen.has(word) || !isDictionaryWord(word)) return "Resultado inválido.";
      seen.add(word);
    }
    // Pelo menos ~1 s por palavra (digitar e mandar).
    if (seen.size > seconds) return "Resultado inválido.";
    const longest = [...seen].reduce((best, word) => (word.length > best.length ? word : best), "");
    return { game, score: seen.size, language: DEFAULT_LANGUAGE, details: { seconds, longest } };
  }

  if (game === "chase") {
    const { ms, characters, errors, accuracy, language } = input;
    if (
      !isInt(ms, CHASE_DELAY_MS, 30 * 60 * 1000) || !isInt(characters, 0, 1_000_000) ||
      !isInt(errors, 0, 1_000_000) || !isInt(accuracy, 0, 100) || errors > characters
    ) {
      return "Resultado inválido.";
    }
    if (language !== undefined && !isLanguageCode(language)) return "Idioma inválido.";
    // Quem aguentou até ms digitou pelo menos até onde o perseguidor chegou.
    const ppm = ppmFor(characters - errors, ms);
    if (ppm > MAX_PPM || characters < getChaserPosition(ms) * 0.9 - 5) {
      return "Resultado inválido.";
    }
    return {
      game,
      score: ms,
      language: typeof language === "string" ? language : DEFAULT_LANGUAGE,
      details: { ppm, accuracy, errors },
    };
  }

  return "Jogo inválido.";
}

function parseDetails(value: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

// POST /api/arcade-results — salva uma partida de quem está logado.
export async function createArcadeResult(request: Request, response: Response) {
  try {
    const userId = request.user?.userId;
    if (!userId) return response.status(401).json({ message: "Usuário não autenticado." });

    const data = validateArcade(request.body);
    if (typeof data === "string") return response.status(400).json({ message: data });

    await db.orm.public.ArcadeResult.create({
      userId,
      game: data.game,
      score: data.score,
      language: data.language,
      details: JSON.stringify(data.details),
    });

    return response.status(201).json({ message: "Resultado salvo." });
  } catch (error) {
    console.error("ERRO AO SALVAR RESULTADO DO ARCADE:", error);
    return response.status(500).json({ message: "Erro ao salvar o resultado." });
  }
}

// GET /api/arcade-results/ranking?game=pavio[&language=...] — melhor de cada um.
export async function getArcadeRanking(request: Request, response: Response) {
  try {
    const game = request.query.game;
    if (!ARCADE_GAMES.includes(game as ArcadeGame)) {
      return response.status(400).json({ message: "Jogo inválido." });
    }

    // Só a perseguição tem idioma escolhido pelo jogador.
    const language = game === "chase" ? (request.query.language ?? DEFAULT_LANGUAGE) : DEFAULT_LANGUAGE;
    if (!isLanguageCode(language)) return response.status(400).json({ message: "Idioma inválido." });

    const best = await db.orm.public.ArcadeResult.where({ game: game as string, language })
      .orderBy([
        (result) => result.userId.asc(),
        (result) => result.score.desc(),
        (result) => result.createdAt.asc(),
        (result) => result.id.asc(),
      ])
      .distinctOn("userId")
      .select("userId", "score", "details")
      .all();

    const banned = await db.orm.public.User.where({ banned: true }).select("id").all();
    const bannedIds = new Set(banned.map((user) => user.id));

    const top = best
      .filter((result) => !bannedIds.has(result.userId))
      .sort((a, b) => b.score - a.score)
      .slice(0, RANKING_LIMIT);

    const userIds = top.map((result) => result.userId);
    const users = userIds.length
      ? await db.orm.public.User.where((user) => user.id.in(userIds)).select("id", "name", "avatarUrl").all()
      : [];
    const usersById = new Map(users.map((user) => [user.id, user]));
    const tagsByUser = await getTagsForUsers(userIds);

    return response.status(200).json({
      game,
      language,
      ranking: top.map((result, index) => ({
        position: index + 1,
        userId: result.userId,
        name: usersById.get(result.userId)?.name ?? "Usuário",
        avatarUrl: usersById.get(result.userId)?.avatarUrl ?? null,
        tags: tagsByUser.get(result.userId) ?? [],
        score: result.score,
        details: parseDetails(result.details),
      })),
    });
  } catch (error) {
    console.error("ERRO AO BUSCAR RANKING DO ARCADE:", error);
    return response.status(500).json({ message: "Erro ao buscar o ranking." });
  }
}

// Recordes de um jogador: modo palavras do teste e jogos do Arcade.
export async function loadRecords(userId: number) {
  const [wordResults, arcadeResults] = await Promise.all([
    db.orm.public.TypingResult.where({ userId, mode: "words" })
      .select("ppm", "accuracy", "wordCount", "durationMs", "language")
      .all(),
    db.orm.public.ArcadeResult.where({ userId }).select("game", "score", "language", "details").all(),
  ]);

  const words = ALLOWED_WORD_COUNTS.map((wordCount) => {
    const results = wordResults.filter((result) => result.wordCount === wordCount);
    const best = results.reduce<(typeof results)[number] | null>(
      (top, result) => (!top || result.ppm > top.ppm ? result : top),
      null,
    );
    return {
      wordCount,
      played: results.length,
      best: best
        ? { ppm: best.ppm, accuracy: best.accuracy, durationMs: best.durationMs ?? null, language: best.language }
        : null,
    };
  });

  const arcade = Object.fromEntries(
    ARCADE_GAMES.map((game) => {
      const results = arcadeResults.filter((result) => result.game === game);
      const best = results.reduce<(typeof results)[number] | null>(
        (top, result) => (!top || result.score > top.score ? result : top),
        null,
      );
      return [
        game,
        {
          played: results.length,
          best: best ? { score: best.score, language: best.language, details: parseDetails(best.details) } : null,
        },
      ];
    }),
  );

  return { words, arcade };
}

// Mesmo critério do perfil público: o admin também vê contas escondidas.
function requesterIsAdmin(request: Request): boolean {
  const [type, token] = (request.headers.authorization ?? "").split(" ");
  const secret = process.env["JWT_SECRET"];
  if (type !== "Bearer" || !token || !secret) return false;
  try {
    const { email } = jwt.verify(token, secret) as { email?: string };
    return isAdminEmail(email);
  } catch {
    return false;
  }
}

// GET /api/users/:userId/records — público, como o perfil.
export async function getUserRecords(request: Request, response: Response) {
  try {
    const id = Number(request.params.userId);
    if (!Number.isInteger(id) || id <= 0) return response.status(400).json({ message: "Jogador inválido." });

    const user = await db.orm.public.User.select("id", "banned", "emailVerified").first({ id });
    if (!user || ((user.banned || !user.emailVerified) && !requesterIsAdmin(request))) {
      return response.status(404).json({ message: "Jogador não encontrado." });
    }

    return response.status(200).json(await loadRecords(id));
  } catch (error) {
    console.error("ERRO AO BUSCAR RECORDES:", error);
    return response.status(500).json({ message: "Erro ao buscar os recordes." });
  }
}
