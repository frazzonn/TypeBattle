import { randomBytes } from "node:crypto";
import type { Request, Response } from "express";

import {
  addDays,
  evaluate,
  generateDailyWords,
  isDateKey,
  isValidGuess,
  normalizeGuess,
  randomAnswer,
  todayKey,
  writtenForm,
  type Mark,
} from "../cifra/cifraWords.js";
import { db } from "../prisma/db.js";
import { getTagsForUsers } from "../tags/userTags.js";

// Cifra: adivinhar palavras de 5 letras pelas dicas de cada palpite.
//   Diária: 1, 2 ou 4 palavras ao mesmo tempo, as mesmas para todo mundo no dia.
//   Contra o relógio: uma palavra atrás da outra; errar as 6 tentativas encerra.
// As respostas ficam só no servidor; o navegador recebe só as cores.

// ---------------------------------------------------------------- comum

export const DAILY_BOARDS = [1, 2, 4] as const;
// Tentativas por modo: mais palavras, mais chances.
const MAX_ATTEMPTS: Record<number, number> = { 1: 6, 2: 7, 4: 9 };

interface InstantLike {
  epochMilliseconds: number;
}
// Datas do Prisma são Temporal.Instant (o polyfill é carregado em db.ts).
const { Temporal } = globalThis as unknown as {
  Temporal: { Instant: { fromEpochMilliseconds(ms: number): InstantLike } };
};

function parseBoards(value: unknown): number | null {
  const boards = Number(value);
  return (DAILY_BOARDS as readonly number[]).includes(boards) ? boards : null;
}

function parseGuesses(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

interface Row {
  word: string;
  // Com acento, quando o palpite é uma das respostas ("opção").
  written: string;
  // Cores em cada palavra (null = aquela palavra já tinha sido descoberta).
  marks: (Mark[] | null)[];
}

// Monta o tabuleiro a partir dos palpites, em ordem.
function play(answers: string[], guesses: string[], maxAttempts: number) {
  const solvedAt: (number | null)[] = answers.map(() => null);
  const rows: Row[] = guesses.map((word, index) => {
    const marks = answers.map((answer, board) => {
      if (solvedAt[board] !== null) return null;
      if (word === answer) solvedAt[board] = index;
      return evaluate(word, answer);
    });
    return { word, written: answers.includes(word) ? writtenForm(word) : word, marks };
  });
  const won = solvedAt.every((value) => value !== null);
  return { rows, solvedAt, won, finished: won || guesses.length >= maxAttempts };
}

function invalidGuessResponse(response: Response) {
  return response.status(400).json({ code: "INVALID_WORD", message: "Essa palavra não está no dicionário." });
}

// ---------------------------------------------------------------- diária

// Palavras já carregadas (dia|modo). Depois de gravadas no banco elas só
// mudam pelo admin, que atualiza este cache; assim cada palpite não precisa
// consultar o banco de novo.
const dailyWordsCache = new Map<string, string[]>();

async function getDailyWords(date: string, boards: number): Promise<string[]> {
  const key = `${date}|${boards}`;
  const cached = dailyWordsCache.get(key);
  if (cached) return cached;
  const words = await loadDailyWords(date, boards);
  // Guarda só o dia de hoje e os próximos (os antigos não são mais pedidos).
  for (const old of dailyWordsCache.keys()) if (old.slice(0, 10) < todayKey()) dailyWordsCache.delete(old);
  dailyWordsCache.set(key, words);
  return words;
}

// Palavras de um dia: as escolhidas pelo admin ou o sorteio automático.
// O sorteio fica gravado na primeira vez que alguém abre o dia, para não
// mudar se a lista de respostas for atualizada no meio do dia.
async function loadDailyWords(date: string, boards: number): Promise<string[]> {
  const saved = await db.orm.public.CifraDaily.select("words").first({ date, boards });
  if (saved) return saved.words.split(",");

  const words = generateDailyWords(date, boards);
  try {
    await db.orm.public.CifraDaily.create({ date, boards, words: words.join(","), custom: false });
    return words;
  } catch {
    // Outro pedido gravou o mesmo dia ao mesmo tempo: vale o que está no banco.
    const again = await db.orm.public.CifraDaily.select("words").first({ date, boards });
    if (again) return again.words.split(",");
    throw new Error("Não foi possível gravar as palavras do dia.");
  }
}

// Meia-noite de Brasília (UTC-3) do dia seguinte, para o contador do próximo desafio.
function nextDailyAt(date: string): number {
  return Date.parse(`${addDays(date, 1)}T03:00:00Z`);
}

interface DailyPlayRow {
  guesses: string;
  startedAt: InstantLike;
  finishedAt: InstantLike | null | undefined;
  durationMs: number | null | undefined;
}

function dailyState(date: string, boards: number, answers: string[], guesses: string[], saved: DailyPlayRow | null) {
  const maxAttempts = MAX_ATTEMPTS[boards];
  const result = play(answers, guesses, maxAttempts);
  return {
    date,
    boards,
    maxAttempts,
    ...result,
    // As respostas só aparecem quando acaba.
    answers: result.finished ? answers.map(writtenForm) : null,
    // Logado: o servidor mede o tempo. Convidado: o navegador mede.
    started: Boolean(saved),
    startedAt: saved ? saved.startedAt.epochMilliseconds : null,
    durationMs: saved?.durationMs ?? null,
    serverNow: Date.now(),
    nextAt: nextDailyAt(date),
  };
}

async function findPlay(userId: number, date: string, boards: number) {
  return db.orm.public.CifraDailyPlay.select("id", "guesses", "startedAt", "finishedAt", "durationMs").first({
    userId,
    date,
    boards,
  });
}

// GET /api/cifra/daily/:boards — o desafio de hoje (e o progresso de quem está logado).
export async function getDaily(request: Request, response: Response) {
  try {
    const boards = parseBoards(request.params.boards);
    if (!boards) return response.status(400).json({ message: "Modo inválido." });

    const date = todayKey();
    const answers = await getDailyWords(date, boards);
    const userId = request.user?.userId;
    const saved = userId ? await findPlay(userId, date, boards) : null;

    return response
      .status(200)
      .json(dailyState(date, boards, answers, saved ? parseGuesses(saved.guesses) : [], saved ?? null));
  } catch (error) {
    console.error("ERRO AO BUSCAR CIFRA DIÁRIA:", error);
    return response.status(500).json({ message: "Erro ao carregar o desafio do dia." });
  }
}

// POST /api/cifra/daily/:boards/start — começa a contar o tempo (logado).
export async function startDaily(request: Request, response: Response) {
  try {
    const boards = parseBoards(request.params.boards);
    const userId = request.user?.userId;
    if (!boards) return response.status(400).json({ message: "Modo inválido." });
    if (!userId) return response.status(401).json({ message: "Entre na sua conta." });

    const date = todayKey();
    const answers = await getDailyWords(date, boards);
    let saved = await findPlay(userId, date, boards);
    if (!saved) {
      try {
        await db.orm.public.CifraDailyPlay.create({ userId, date, boards });
      } catch {
        // Duas abas começaram juntas: segue com a que gravou.
      }
      saved = await findPlay(userId, date, boards);
    }

    return response
      .status(200)
      .json(dailyState(date, boards, answers, saved ? parseGuesses(saved.guesses) : [], saved ?? null));
  } catch (error) {
    console.error("ERRO AO COMEÇAR CIFRA DIÁRIA:", error);
    return response.status(500).json({ message: "Erro ao começar o desafio." });
  }
}

// POST /api/cifra/daily/:boards/guess — um palpite.
// Logado: o progresso fica no banco. Convidado: o navegador manda os palpites
// anteriores (previous) e guarda o progresso no próprio aparelho.
export async function guessDaily(request: Request, response: Response) {
  try {
    const boards = parseBoards(request.params.boards);
    if (!boards) return response.status(400).json({ message: "Modo inválido." });

    const date = todayKey();
    // O dia virou enquanto a pessoa jogava: o tabuleiro dela é de ontem.
    if (request.body?.date !== undefined && request.body.date !== date) {
      return response.status(409).json({ code: "DAY_CHANGED", message: "Já começou o desafio de um novo dia." });
    }

    const guess = normalizeGuess(request.body?.guess);
    if (!isValidGuess(guess)) return invalidGuessResponse(response);

    const answers = await getDailyWords(date, boards);
    const maxAttempts = MAX_ATTEMPTS[boards];
    const userId = request.user?.userId;

    if (!userId) {
      const previous = Array.isArray(request.body?.previous) ? request.body.previous.map(normalizeGuess) : [];
      if (previous.length >= maxAttempts || !previous.every(isValidGuess)) {
        return response.status(400).json({ message: "Partida inválida." });
      }
      if (play(answers, previous, maxAttempts).finished) {
        return response.status(409).json({ message: "Você já terminou o desafio de hoje." });
      }
      return response.status(200).json(dailyState(date, boards, answers, [...previous, guess], null));
    }

    let saved = await findPlay(userId, date, boards);
    if (!saved) {
      await db.orm.public.CifraDailyPlay.create({ userId, date, boards }).catch(() => undefined);
      saved = await findPlay(userId, date, boards);
    }
    if (!saved) throw new Error("Partida diária não encontrada.");

    const guesses = parseGuesses(saved.guesses);
    if (play(answers, guesses, maxAttempts).finished) {
      return response.status(409).json({ message: "Você já terminou o desafio de hoje." });
    }

    const next = [...guesses, guess];
    const result = play(answers, next, maxAttempts);
    const now = Date.now();
    const durationMs = result.finished ? now - saved.startedAt.epochMilliseconds : null;

    await db.orm.public.CifraDailyPlay.where({ id: saved.id }).update({
      guesses: JSON.stringify(next),
      attempts: next.length,
      won: result.won,
      ...(result.finished
        ? { finishedAt: Temporal.Instant.fromEpochMilliseconds(now), durationMs }
        : {}),
    });

    return response.status(200).json(
      dailyState(date, boards, answers, next, { ...saved, durationMs }),
    );
  } catch (error) {
    console.error("ERRO NO PALPITE DA CIFRA DIÁRIA:", error);
    return response.status(500).json({ message: "Erro ao enviar o palpite." });
  }
}

// GET /api/cifra/daily/:boards/ranking — quem acertou hoje: menos tentativas,
// depois menos tempo.
export async function getDailyRanking(request: Request, response: Response) {
  try {
    const boards = parseBoards(request.params.boards);
    if (!boards) return response.status(400).json({ message: "Modo inválido." });
    const date = isDateKey(request.query.date) ? request.query.date : todayKey();

    const winners = await db.orm.public.CifraDailyPlay.where({ date, boards, won: true })
      .orderBy([
        (row) => row.attempts.asc(),
        (row) => row.durationMs.asc(),
        (row) => row.id.asc(),
      ])
      .select("userId", "attempts", "durationMs")
      .all();

    const banned = await db.orm.public.User.where({ banned: true }).select("id").all();
    const bannedIds = new Set(banned.map((user) => user.id));
    const top = winners.filter((row) => !bannedIds.has(row.userId)).slice(0, 100);

    const userIds = top.map((row) => row.userId);
    const users = userIds.length
      ? await db.orm.public.User.where((user) => user.id.in(userIds)).select("id", "name", "avatarUrl").all()
      : [];
    const usersById = new Map(users.map((user) => [user.id, user]));
    const tagsByUser = await getTagsForUsers(userIds);

    return response.status(200).json({
      date,
      boards,
      ranking: top.map((row, index) => ({
        position: index + 1,
        userId: row.userId,
        name: usersById.get(row.userId)?.name ?? "Usuário",
        avatarUrl: usersById.get(row.userId)?.avatarUrl ?? null,
        tags: tagsByUser.get(row.userId) ?? [],
        attempts: row.attempts,
        durationMs: row.durationMs ?? 0,
      })),
    });
  } catch (error) {
    console.error("ERRO AO BUSCAR RANKING DA CIFRA:", error);
    return response.status(500).json({ message: "Erro ao buscar o ranking." });
  }
}

// ---------------------------------------------------------------- contra o relógio

const RUN_ATTEMPTS = 6;
const RUN_START_MS = 120_000;
// Acertar soma tempo: 20 s + 5 s por tentativa que sobrou.
const RUN_BONUS_MS = 20_000;
const RUN_BONUS_PER_SPARE_MS = 5_000;
// Folga para a demora da rede no último palpite.
const RUN_GRACE_MS = 1_500;
const MAX_RUNS = 5_000;

interface Run {
  userId: number | null;
  startedAt: number;
  endsAt: number;
  answer: string;
  used: Set<string>;
  guesses: string[];
  solved: string[];
  finished: boolean;
}

// Partidas em andamento (na memória; uma reinicialização do servidor as encerra).
const runs = new Map<string, Run>();

function runState(id: string, run: Run) {
  const result = play([run.answer], run.guesses, RUN_ATTEMPTS);
  return {
    id,
    maxAttempts: RUN_ATTEMPTS,
    rows: result.rows,
    score: run.solved.length,
    solved: run.solved.map(writtenForm),
    endsAt: run.endsAt,
    serverNow: Date.now(),
    finished: run.finished,
    // A palavra que faltou, quando a partida acaba sem acertá-la.
    answer: run.finished ? writtenForm(run.answer) : null,
  };
}

// Encerra e grava no ranking (logado e com pelo menos uma palavra).
function finishRun(run: Run) {
  if (run.finished) return;
  run.finished = true;
  if (run.userId === null || run.solved.length === 0) return;
  const seconds = Math.max(1, Math.round((Math.min(Date.now(), run.endsAt) - run.startedAt) / 1000));
  void db.orm.public.ArcadeResult.create({
    userId: run.userId,
    game: "cifra",
    score: run.solved.length,
    language: "portuguese",
    details: JSON.stringify({ seconds, last: writtenForm(run.solved[run.solved.length - 1]) }),
  }).catch((error: unknown) => console.error("ERRO AO SALVAR CIFRA:", error));
}

// Partidas abandonadas: encerra quando o tempo acaba e apaga depois de um tempo.
setInterval(() => {
  const now = Date.now();
  for (const [id, run] of runs) {
    if (!run.finished && now > run.endsAt + RUN_GRACE_MS) finishRun(run);
    if (run.finished && now > run.endsAt + 10 * 60_000) runs.delete(id);
  }
}, 15_000).unref();

// POST /api/cifra/run — começa uma partida contra o relógio.
export function startRun(request: Request, response: Response) {
  if (runs.size >= MAX_RUNS) {
    return response.status(503).json({ message: "Muitas partidas agora. Tente em instantes." });
  }
  const id = randomBytes(16).toString("hex");
  const now = Date.now();
  const run: Run = {
    userId: request.user?.userId ?? null,
    startedAt: now,
    endsAt: now + RUN_START_MS,
    answer: randomAnswer(new Set()),
    used: new Set(),
    guesses: [],
    solved: [],
    finished: false,
  };
  run.used.add(run.answer);
  runs.set(id, run);
  return response.status(201).json(runState(id, run));
}

function getRun(request: Request, response: Response): [string, Run] | null {
  const id = String(request.params.runId ?? "");
  const run = runs.get(id);
  if (!run) {
    response.status(404).json({ message: "Partida não encontrada ou encerrada." });
    return null;
  }
  return [id, run];
}

// POST /api/cifra/run/:runId/guess — um palpite na palavra atual.
export function guessRun(request: Request, response: Response) {
  const found = getRun(request, response);
  if (!found) return;
  const [id, run] = found;

  if (!run.finished && Date.now() > run.endsAt + RUN_GRACE_MS) finishRun(run);
  if (run.finished) return response.status(200).json(runState(id, run));

  const guess = normalizeGuess(request.body?.guess);
  if (!isValidGuess(guess)) return invalidGuessResponse(response);

  run.guesses.push(guess);
  const marks = evaluate(guess, run.answer);

  if (guess === run.answer) {
    // Acertou: ganha tempo e vem a próxima palavra.
    const spare = RUN_ATTEMPTS - run.guesses.length;
    run.endsAt += RUN_BONUS_MS + spare * RUN_BONUS_PER_SPARE_MS;
    run.solved.push(run.answer);
    run.answer = randomAnswer(run.used);
    run.used.add(run.answer);
    run.guesses = [];
    return response.status(200).json({
      ...runState(id, run),
      last: { word: guess, written: writtenForm(guess), marks, solved: true },
    });
  }

  // Errou as 6: acabou.
  if (run.guesses.length >= RUN_ATTEMPTS) finishRun(run);
  return response.status(200).json({ ...runState(id, run), last: { word: guess, written: guess, marks, solved: false } });
}

// POST /api/cifra/run/:runId/finish — o relógio do navegador zerou.
export function finishRunRequest(request: Request, response: Response) {
  const found = getRun(request, response);
  if (!found) return;
  const [id, run] = found;
  // Só encerra se o tempo do servidor também acabou (com uma folga pequena).
  if (!run.finished && Date.now() >= run.endsAt - 1_000) finishRun(run);
  return response.status(200).json(runState(id, run));
}

// ---------------------------------------------------------------- admin

function parseWordList(value: unknown, boards: number): string[] | string {
  const raw = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[\s,;]+/) : [];
  const words = raw.map(normalizeGuess).filter(Boolean);
  if (words.length !== boards) return `Informe ${boards} palavra${boards > 1 ? "s" : ""}.`;
  const invalid = words.find((word) => !isValidGuess(word));
  if (invalid) return `"${invalid}" não é uma palavra de 5 letras do dicionário.`;
  if (new Set(words).size !== words.length) return "As palavras precisam ser diferentes.";
  return words;
}

// GET /api/admin/cifra?days=14 — os próximos dias, com as palavras de cada modo.
export async function adminListDaily(request: Request, response: Response) {
  try {
    const days = Math.min(60, Math.max(1, Number(request.query.days) || 14));
    const today = todayKey();
    const dates = Array.from({ length: days }, (_, i) => addDays(today, i));

    const [saved, plays] = await Promise.all([
      db.orm.public.CifraDaily.where((row) => row.date.in(dates)).select("date", "boards", "words", "custom").all(),
      db.orm.public.CifraDailyPlay.where((row) => row.date.in(dates)).select("date", "boards").all(),
    ]);
    const savedByKey = new Map(saved.map((row) => [`${row.date}|${row.boards}`, row]));
    const playCount = new Map<string, number>();
    for (const row of plays) {
      const key = `${row.date}|${row.boards}`;
      playCount.set(key, (playCount.get(key) ?? 0) + 1);
    }

    return response.status(200).json({
      today,
      days: dates.map((date) => ({
        date,
        modes: DAILY_BOARDS.map((boards) => {
          const key = `${date}|${boards}`;
          const row = savedByKey.get(key);
          const words = row ? row.words.split(",") : generateDailyWords(date, boards);
          return {
            boards,
            words: words.map(writtenForm),
            custom: row?.custom ?? false,
            plays: playCount.get(key) ?? 0,
          };
        }),
      })),
    });
  } catch (error) {
    console.error("ERRO AO LISTAR CIFRA (ADMIN):", error);
    return response.status(500).json({ message: "Erro ao carregar os desafios." });
  }
}

// Só dá para mexer em dias que ainda não chegaram, ou hoje se ninguém jogou.
async function editableError(date: string, boards: number): Promise<string | null> {
  const today = todayKey();
  if (date < today) return "Não dá para alterar um dia que já passou.";
  if (date === today) {
    const played = await db.orm.public.CifraDailyPlay.select("id").first({ date, boards });
    if (played) return "Alguém já jogou o desafio de hoje; ele não pode mais mudar.";
  }
  return null;
}

// PUT /api/admin/cifra/:date/:boards — o admin escolhe as palavras do dia.
export async function adminSetDaily(request: Request, response: Response) {
  try {
    const date = request.params.date;
    const boards = parseBoards(request.params.boards);
    if (!isDateKey(date) || !boards) return response.status(400).json({ message: "Dia ou modo inválido." });

    const words = parseWordList(request.body?.words, boards);
    if (typeof words === "string") return response.status(400).json({ message: words });

    const blocked = await editableError(date, boards);
    if (blocked) return response.status(409).json({ message: blocked });

    const existing = await db.orm.public.CifraDaily.select("id").first({ date, boards });
    if (existing) {
      await db.orm.public.CifraDaily.where({ id: existing.id }).update({ words: words.join(","), custom: true });
    } else {
      await db.orm.public.CifraDaily.create({ date, boards, words: words.join(","), custom: true });
    }

    dailyWordsCache.set(`${date}|${boards}`, words);
    return response.status(200).json({ date, boards, words: words.map(writtenForm), custom: true });
  } catch (error) {
    console.error("ERRO AO SALVAR CIFRA (ADMIN):", error);
    return response.status(500).json({ message: "Erro ao salvar as palavras." });
  }
}

// DELETE /api/admin/cifra/:date/:boards — volta para o sorteio automático.
export async function adminResetDaily(request: Request, response: Response) {
  try {
    const date = request.params.date;
    const boards = parseBoards(request.params.boards);
    if (!isDateKey(date) || !boards) return response.status(400).json({ message: "Dia ou modo inválido." });

    const blocked = await editableError(date, boards);
    if (blocked) return response.status(409).json({ message: blocked });

    const existing = await db.orm.public.CifraDaily.select("id").first({ date, boards });
    if (existing) await db.orm.public.CifraDaily.where({ id: existing.id }).delete();
    dailyWordsCache.delete(`${date}|${boards}`);
    return response.status(200).json({
      date,
      boards,
      words: generateDailyWords(date, boards).map(writtenForm),
      custom: false,
    });
  } catch (error) {
    console.error("ERRO AO RESETAR CIFRA (ADMIN):", error);
    return response.status(500).json({ message: "Erro ao voltar para o automático." });
  }
}
