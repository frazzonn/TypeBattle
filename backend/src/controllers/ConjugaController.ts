import { randomBytes } from "node:crypto";
import type { Request, Response } from "express";

import { normalizeWord, readDataJson } from "../lib/dataFiles.js";
import { db } from "../prisma/db.js";

// Conjuga: aparece um verbo e a pessoa digita as conjugações dele contra o
// relógio. Cada forma certa preenche a(s) casa(s) da tabela. As tabelas vêm de
// backend/data/conjuga/verbs.json (scripts/build-conjuga.mjs) e ficam só no
// servidor: o navegador recebe a forma quando acerta.

const TENSES = ["presente", "perfeito", "imperfeito", "futuro", "condicional", "subjuntivo"] as const;
const PERSONS = 5; // eu, tu, ele, nós, eles

interface VerbEntry {
  verb: string;
  irregular: boolean;
  presente: string[];
  perfeito: string[];
  imperfeito: string[];
  futuro: string[];
  condicional: string[];
  subjuntivo: string[];
  gerundio: string;
  participio: string;
}

// Casa da tabela: "presente:0" (eu) ... "subjuntivo:4" (eles), "gerundio", "participio".
type CellKey = string;
const TOTAL_CELLS = TENSES.length * PERSONS + 2;

const START_MS = 90_000;
// Completar um tempo inteiro e o verbo inteiro soma tempo; pular custa.
const TENSE_BONUS_MS = 3_000;
const VERB_BONUS_MS = 15_000;
const SKIP_COST_MS = 5_000;
const GRACE_MS = 1_500;
const MAX_RUNS = 5_000;

let verbs: VerbEntry[] | null = null;
function getVerbs(): VerbEntry[] {
  verbs ??= readDataJson<VerbEntry[]>("conjuga/verbs.json");
  return verbs;
}

// Forma sem acento -> casas em que ela vale ("corremos": presente e perfeito).
function cellsByForm(entry: VerbEntry): Map<string, { cell: CellKey; written: string }[]> {
  const map = new Map<string, { cell: CellKey; written: string }[]>();
  const add = (cell: CellKey, written: string) => {
    const key = normalizeWord(written);
    map.set(key, [...(map.get(key) ?? []), { cell, written }]);
  };
  for (const tense of TENSES) entry[tense].forEach((written, person) => add(`${tense}:${person}`, written));
  add("gerundio", entry.gerundio);
  add("participio", entry.participio);
  return map;
}

function allCells(entry: VerbEntry): Record<CellKey, string> {
  const cells: Record<CellKey, string> = {};
  for (const tense of TENSES) entry[tense].forEach((written, person) => (cells[`${tense}:${person}`] = written));
  cells.gerundio = entry.gerundio;
  cells.participio = entry.participio;
  return cells;
}

interface Run {
  userId: number | null;
  startedAt: number;
  endsAt: number;
  entry: VerbEntry;
  forms: Map<string, { cell: CellKey; written: string }[]>;
  // Casas preenchidas do verbo atual: chave -> forma com acento.
  filled: Record<CellKey, string>;
  used: Set<string>;
  // Casas preenchidas em todos os verbos (a pontuação).
  score: number;
  verbsDone: number;
  // O verbo anterior com todas as formas (para mostrar o que faltou).
  previous: { verb: string; cells: Record<CellKey, string>; filled: CellKey[] } | null;
  finished: boolean;
}

const runs = new Map<string, Run>();

function pickVerb(used: Set<string>): VerbEntry {
  const list = getVerbs();
  for (let i = 0; i < 50; i += 1) {
    const entry = list[Math.floor(Math.random() * list.length)];
    if (!used.has(entry.verb)) return entry;
  }
  return list[Math.floor(Math.random() * list.length)];
}

function setVerb(run: Run, entry: VerbEntry) {
  run.entry = entry;
  run.forms = cellsByForm(entry);
  run.filled = {};
  run.used.add(entry.verb);
}

// Quantas letras tem cada forma (a tela desenha uma casinha por letra).
function lengths(entry: VerbEntry): Record<CellKey, number> {
  return Object.fromEntries(Object.entries(allCells(entry)).map(([cell, written]) => [cell, [...written].length]));
}

function state(id: string, run: Run) {
  return {
    id,
    verb: run.entry.verb,
    irregular: run.entry.irregular,
    filled: run.filled,
    lengths: lengths(run.entry),
    totalCells: TOTAL_CELLS,
    score: run.score,
    verbsDone: run.verbsDone,
    endsAt: run.endsAt,
    serverNow: Date.now(),
    finished: run.finished,
    previous: run.previous,
    // No fim, a tabela inteira do verbo atual (para ver o que faltou).
    solution: run.finished ? allCells(run.entry) : null,
  };
}

function finishRun(run: Run) {
  if (run.finished) return;
  run.finished = true;
  if (run.userId === null || run.score === 0) return;
  const seconds = Math.max(1, Math.round((Math.min(Date.now(), run.endsAt) - run.startedAt) / 1000));
  void db.orm.public.ArcadeResult.create({
    userId: run.userId,
    game: "conjuga",
    score: run.score,
    language: "portuguese",
    details: JSON.stringify({ seconds, verbs: run.verbsDone }),
  }).catch((error: unknown) => console.error("ERRO AO SALVAR CONJUGA:", error));
}

// Partidas abandonadas: encerra quando o tempo acaba e apaga depois.
setInterval(() => {
  const now = Date.now();
  for (const [id, run] of runs) {
    if (!run.finished && now > run.endsAt + GRACE_MS) finishRun(run);
    if (run.finished && now > run.endsAt + 10 * 60_000) runs.delete(id);
  }
}, 15_000).unref();

// Passa para o próximo verbo, guardando o atual para mostrar o que faltou.
function nextVerb(run: Run) {
  run.previous = { verb: run.entry.verb, cells: allCells(run.entry), filled: Object.keys(run.filled) };
  setVerb(run, pickVerb(run.used));
}

// POST /api/conjuga/run
export function startConjuga(request: Request, response: Response) {
  if (runs.size >= MAX_RUNS) {
    return response.status(503).json({ message: "Muitas partidas agora. Tente em instantes." });
  }
  const now = Date.now();
  const entry = pickVerb(new Set());
  const run: Run = {
    userId: request.user?.userId ?? null,
    startedAt: now,
    endsAt: now + START_MS,
    entry,
    forms: new Map(),
    filled: {},
    used: new Set(),
    score: 0,
    verbsDone: 0,
    previous: null,
    finished: false,
  };
  setVerb(run, entry);
  const id = randomBytes(16).toString("hex");
  runs.set(id, run);
  return response.status(201).json(state(id, run));
}

function getRun(request: Request, response: Response): [string, Run] | null {
  const id = String(request.params.runId ?? "");
  const run = runs.get(id);
  if (!run) {
    response.status(404).json({ message: "Partida não encontrada ou encerrada." });
    return null;
  }
  if (!run.finished && Date.now() > run.endsAt + GRACE_MS) finishRun(run);
  return [id, run];
}

// POST /api/conjuga/run/:runId/guess — uma forma do verbo atual.
export function guessConjuga(request: Request, response: Response) {
  const found = getRun(request, response);
  if (!found) return;
  const [id, run] = found;
  if (run.finished) return response.status(200).json({ ...state(id, run), result: "finished" });

  const word = normalizeWord(request.body?.word);
  const matches = run.forms.get(word);
  if (!matches) {
    return response.status(200).json({ ...state(id, run), result: "wrong", word });
  }
  const fresh = matches.filter((match) => !run.filled[match.cell]);
  if (fresh.length === 0) {
    return response.status(200).json({ ...state(id, run), result: "repeated", word });
  }

  let bonusMs = 0;
  const completedTenses: string[] = [];
  for (const match of fresh) {
    run.filled[match.cell] = match.written;
    run.score += 1;
    const tense = match.cell.split(":")[0];
    if ((TENSES as readonly string[]).includes(tense)) {
      const done = Array.from({ length: PERSONS }, (_, person) => run.filled[`${tense}:${person}`]).every(Boolean);
      if (done && !completedTenses.includes(tense)) {
        completedTenses.push(tense);
        bonusMs += TENSE_BONUS_MS;
      }
    }
  }

  const verbDone = Object.keys(run.filled).length >= TOTAL_CELLS;
  const doneVerb = run.entry.verb;
  if (verbDone) {
    bonusMs += VERB_BONUS_MS;
    run.verbsDone += 1;
    nextVerb(run);
  }
  run.endsAt += bonusMs;

  return response.status(200).json({
    ...state(id, run),
    result: "ok",
    word,
    cells: fresh.map((match) => match.cell),
    written: fresh[0].written,
    completedTenses,
    bonusMs,
    // Completou o verbo: a resposta já traz o próximo.
    completedVerb: verbDone ? doneVerb : null,
  });
}

// POST /api/conjuga/run/:runId/skip — pula para outro verbo (custa tempo).
export function skipConjuga(request: Request, response: Response) {
  const found = getRun(request, response);
  if (!found) return;
  const [id, run] = found;
  if (!run.finished) {
    run.endsAt -= SKIP_COST_MS;
    if (Date.now() >= run.endsAt) finishRun(run);
    else nextVerb(run);
  }
  return response.status(200).json(state(id, run));
}

// POST /api/conjuga/run/:runId/finish — o relógio do navegador zerou.
export function finishConjuga(request: Request, response: Response) {
  const found = getRun(request, response);
  if (!found) return;
  const [id, run] = found;
  if (!run.finished && Date.now() >= run.endsAt - 1_000) finishRun(run);
  return response.status(200).json(state(id, run));
}
