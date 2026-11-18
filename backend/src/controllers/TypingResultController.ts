import type { Request, Response } from "express";

import { DEFAULT_LANGUAGE, isLanguageCode } from "../battle/textGenerator.js";
import { db } from "../prisma/db.js";
import { getTagsForUsers } from "../tags/userTags.js";

const ALLOWED_DURATIONS = [15, 30, 60];
// Modo palavras: tamanhos de texto que têm ranking.
export const ALLOWED_WORD_COUNTS = [10, 25, 50, 100];
// Modo palavras: no máximo 30 minutos para terminar o texto.
const MAX_WORDS_MS = 30 * 60 * 1000;

// Acima disso o resultado não é plausível para um humano.
const MAX_PPM = 350;

// Quantidade máxima de jogadores retornada pelo ranking.
const RANKING_LIMIT = 100;

interface TypingResultInput {
  ppm: number;
  accuracy: number;
  errors: number;
  characters: number;
  duration: number;
  language: string;
  // JSON com a letra esperada e quantas vezes errou nela.
  missedKeys: string;
  // "time" (duração fixa) ou "words" (quanto levou para terminar o texto).
  mode: "time" | "words";
  wordCount: number | null;
  durationMs: number | null;
}

// Mais que isso não cabe num teste de 60 s.
const MAX_MISSED_KEYS = 100;

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

// Cada chave é um único caractere; a soma não pode passar do total de erros.
function validateMissedKeys(
  value: unknown,
  errors: number,
): Record<string, number> | null {
  if (value === undefined) return {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const entries = Object.entries(value);
  if (entries.length > MAX_MISSED_KEYS) return null;

  let total = 0;
  for (const [key, count] of entries) {
    if ([...key].length !== 1 || !isNonNegativeInteger(count)) return null;
    total += count;
  }

  return total <= errors ? Object.fromEntries(entries) : null;
}

// Lê o JSON salvo; dados antigos ou inválidos viram objeto vazio.
export function parseMissedKeys(value: string): Record<string, number> {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, number>)
      : {};
  } catch {
    return {};
  }
}

// Confere tipos, limites e se os números batem entre si.
export function validateTypingResult(body: unknown): TypingResultInput | string {
  if (!body || typeof body !== "object") {
    return "Todos os dados do resultado são obrigatórios.";
  }

  const { ppm, accuracy, errors, characters, duration, language, missedKeys, wordCount, durationMs } =
    body as Record<string, unknown>;
  // Clientes antigos não mandam o modo: é o modo tempo.
  const mode = (body as Record<string, unknown>).mode === "words" ? "words" : "time";

  if (
    ppm === undefined ||
    accuracy === undefined ||
    errors === undefined ||
    characters === undefined ||
    duration === undefined
  ) {
    return "Todos os dados do resultado são obrigatórios.";
  }

  if (
    !isNonNegativeInteger(ppm) ||
    !isNonNegativeInteger(accuracy) ||
    !isNonNegativeInteger(errors) ||
    !isNonNegativeInteger(characters) ||
    !isNonNegativeInteger(duration)
  ) {
    return "Os dados do resultado devem ser números inteiros positivos.";
  }

  // Tempo exato do teste: fixo no modo tempo; no modo palavras, quanto levou.
  let elapsedMs: number;
  if (mode === "words") {
    if (!isNonNegativeInteger(wordCount) || !ALLOWED_WORD_COUNTS.includes(wordCount)) {
      return "Quantidade de palavras inválida.";
    }
    if (!isNonNegativeInteger(durationMs) || durationMs < 1000 || durationMs > MAX_WORDS_MS) {
      return "Tempo do teste inválido.";
    }
    elapsedMs = durationMs;
  } else {
    if (!ALLOWED_DURATIONS.includes(duration)) {
      return "A duração deve ser 15, 30 ou 60 segundos.";
    }
    elapsedMs = duration * 1000;
  }

  // Clientes antigos não mandam o idioma: conta como português.
  if (language !== undefined && !isLanguageCode(language)) {
    return "Idioma inválido.";
  }

  if (ppm > MAX_PPM || accuracy > 100 || errors > characters) {
    return "Resultado inválido.";
  }

  // O frontend calcula PPM e precisão a partir dos caracteres digitados.
  const correct = characters - errors;
  const expectedPpm = Math.round(correct / 5 / (elapsedMs / 60_000));
  const expectedAccuracy =
    characters === 0 ? 100 : Math.round((correct / characters) * 100);

  if (
    Math.abs(ppm - expectedPpm) > 2 ||
    Math.abs(accuracy - expectedAccuracy) > 1
  ) {
    return "Resultado inválido.";
  }

  // Clientes antigos não mandam as teclas erradas.
  const validMissedKeys = validateMissedKeys(missedKeys, errors);
  if (!validMissedKeys) {
    return "Resultado inválido.";
  }

  return {
    ppm,
    accuracy,
    errors,
    characters,
    // No modo palavras, a duração é o tempo arredondado para segundos.
    duration: mode === "words" ? Math.max(1, Math.round(elapsedMs / 1000)) : duration,
    language: language ?? DEFAULT_LANGUAGE,
    missedKeys: JSON.stringify(validMissedKeys),
    mode,
    wordCount: mode === "words" ? (wordCount as number) : null,
    durationMs: mode === "words" ? elapsedMs : null,
  };
}

// Salva o resultado de um teste de digitação
export async function createTypingResult(request: Request, response: Response) {
  try {
    // O usuário vem do JWT validado pelo middleware
    const userId = request.user?.userId;

    if (!userId) {
      return response.status(401).json({
        message: "Usuário não autenticado.",
      });
    }

    const data = validateTypingResult(request.body);

    if (typeof data === "string") {
      return response.status(400).json({
        message: data,
      });
    }

    // Cria o resultado vinculado ao usuário autenticado
    const result = await db.orm.public.TypingResult.create({
      userId,
      ...data,
    });

    return response.status(201).json({
      message: "Resultado salvo com sucesso.",
      result,
    });
  } catch (error) {
    console.error("ERRO AO SALVAR RESULTADO:", error);

    return response.status(500).json({
      message: "Erro ao salvar resultado.",
    });
  }
}

// Busca os resultados do usuário autenticado
export async function getTypingResults(request: Request, response: Response) {
  try {
    // O usuário vem do JWT validado pelo middleware
    const userId = request.user?.userId;

    if (!userId) {
      return response.status(401).json({
        message: "Usuário não autenticado.",
      });
    }

    // Histórico e gráficos do perfil são do modo tempo; o modo palavras
    // aparece nos recordes (GET /users/:id/records).
    const results = await db.orm.public.TypingResult.where({ userId, mode: "time" })
      .orderBy([(result) => result.createdAt.asc(), (result) => result.id.asc()])
      .all();

    return response.status(200).json({
      results: results.map((result) => ({
        ...result,
        missedKeys: parseMissedKeys(result.missedKeys),
      })),
    });
  } catch (error) {
    console.error("ERRO AO BUSCAR RESULTADOS:", error);

    return response.status(500).json({
      message: "Erro ao buscar resultados.",
    });
  }
}

// Busca o ranking dos jogadores: modo tempo (por duração) ou modo palavras
// (por quantidade de palavras), sempre separado por idioma.
export async function getRanking(request: Request, response: Response) {
  try {
    const mode = request.query.mode === "words" ? "words" : "time";
    const duration = Number(request.query.duration);
    const wordCount = Number(request.query.wordCount);
    const language = request.query.language ?? DEFAULT_LANGUAGE;

    if (mode === "time" && !ALLOWED_DURATIONS.includes(duration)) {
      return response.status(400).json({
        message: "A duração deve ser 15, 30 ou 60 segundos.",
      });
    }

    if (mode === "words" && !ALLOWED_WORD_COUNTS.includes(wordCount)) {
      return response.status(400).json({
        message: "A quantidade de palavras deve ser 10, 25, 50 ou 100.",
      });
    }

    if (!isLanguageCode(language)) {
      return response.status(400).json({
        message: "Idioma inválido.",
      });
    }

    const filter =
      mode === "words"
        ? { mode, wordCount, language }
        : { mode, duration, language };

    // Melhor resultado de cada usuário (DISTINCT ON userId), calculado no banco.
    // Em caso de empate no PPM, vale o resultado mais antigo.
    const bestResults = await db.orm.public.TypingResult.where(filter)
      .orderBy([
        (result) => result.userId.asc(),
        (result) => result.ppm.desc(),
        (result) => result.createdAt.asc(),
        (result) => result.id.asc(),
      ])
      .distinctOn("userId")
      .select("userId", "ppm", "accuracy", "durationMs")
      .all();

    // Contas banidas não aparecem no ranking.
    const banned = await db.orm.public.User.where({ banned: true }).select("id").all();
    const bannedIds = new Set(banned.map((user) => user.id));

    const topResults = bestResults
      .filter((result) => !bannedIds.has(result.userId))
      // Maior PPM primeiro.
      .sort((a, b) => b.ppm - a.ppm)
      .slice(0, RANKING_LIMIT);

    // Busca só os nomes e fotos dos usuários que aparecem no ranking.
    const userIds = topResults.map((result) => result.userId);
    const users =
      userIds.length > 0
        ? await db.orm.public.User.where((user) => user.id.in(userIds))
            .select("id", "name", "avatarUrl")
            .all()
        : [];
    const usersById = new Map(users.map((user) => [user.id, user]));
    const tagsByUser = await getTagsForUsers(userIds);

    // Monta o ranking relacionando resultado e usuário.
    const ranking = topResults.map((result, index) => ({
      // Adiciona a posição do jogador.
      position: index + 1,
      userId: result.userId,
      name: usersById.get(result.userId)?.name ?? "Usuário",
      avatarUrl: usersById.get(result.userId)?.avatarUrl ?? null,
      tags: tagsByUser.get(result.userId) ?? [],
      ppm: result.ppm,
      accuracy: result.accuracy,
      // Modo palavras: quanto tempo levou no melhor resultado.
      durationMs: result.durationMs ?? null,
    }));

    return response.status(200).json({
      mode,
      duration: mode === "time" ? duration : null,
      wordCount: mode === "words" ? wordCount : null,
      language,
      ranking,
    });
  } catch (error) {
    console.error("ERRO AO BUSCAR RANKING:", error);

    return response.status(500).json({
      message: "Erro ao buscar ranking.",
    });
  }
}
