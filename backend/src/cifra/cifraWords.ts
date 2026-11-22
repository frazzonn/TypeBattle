import { createHmac } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Palavras da Cifra: respostas (backend/data/cifra/answers.txt, geradas por
// scripts/build-cifra.mjs) e palpites aceitos (as palavras de 5 letras do
// dicionário do Pavio). Tudo sem acento e em minúsculas.

export const WORD_LENGTH = 5;

export type Mark = "correct" | "present" | "absent";

function findDataFile(path: string): string {
  const here = fileURLToPath(new URL(".", import.meta.url));
  const candidates = [
    resolve(process.cwd(), "data", path),
    resolve(here, "../../data", path),
    resolve(here, "../../../data", path),
  ];
  const found = candidates.find((file) => existsSync(file));
  if (!found) throw new Error(`Arquivo da Cifra não encontrado: ${path}`);
  return found;
}

function readLines(path: string): string[] {
  return readFileSync(findDataFile(path), "utf8").split(/\r?\n/).filter(Boolean);
}

let answers: string[] | null = null;
let spelling: Map<string, string> | null = null;
let valid: Set<string> | null = null;

function loadAnswers() {
  if (answers && spelling) return { answers, spelling };
  const list: string[] = [];
  const map = new Map<string, string>();
  for (const line of readLines("cifra/answers.txt")) {
    const [word, written] = line.split(" ");
    list.push(word);
    map.set(word, written ?? word);
  }
  answers = list;
  spelling = map;
  return { answers: list, spelling: map };
}

function getValid(): Set<string> {
  if (!valid) {
    valid = new Set(readLines("pavio/portuguese.txt").filter((word) => word.length === WORD_LENGTH));
    for (const word of loadAnswers().answers) valid.add(word);
  }
  return valid;
}

// "Cabeça" -> "cabeca".
export function normalizeGuess(value: unknown): string {
  return typeof value === "string"
    ? value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim()
    : "";
}

export function isValidGuess(word: string): boolean {
  return word.length === WORD_LENGTH && /^[a-z]+$/.test(word) && getValid().has(word);
}

// Como a palavra é escrita (com acento) para mostrar ao jogador.
export function writtenForm(word: string): string {
  return loadAnswers().spelling.get(word) ?? word;
}

// Cores de um palpite: primeiro as letras no lugar certo, depois as que
// existem em outra posição (cada letra da resposta só pode ser usada uma vez).
export function evaluate(guess: string, answer: string): Mark[] {
  const marks: Mark[] = Array.from({ length: WORD_LENGTH }, () => "absent");
  const left = new Map<string, number>();
  for (let i = 0; i < WORD_LENGTH; i += 1) {
    if (guess[i] === answer[i]) marks[i] = "correct";
    else left.set(answer[i], (left.get(answer[i]) ?? 0) + 1);
  }
  for (let i = 0; i < WORD_LENGTH; i += 1) {
    if (marks[i] === "correct") continue;
    const count = left.get(guess[i]) ?? 0;
    if (count > 0) {
      marks[i] = "present";
      left.set(guess[i], count - 1);
    }
  }
  return marks;
}

// Resposta sorteada que ainda não saiu na partida.
export function randomAnswer(used: ReadonlySet<string>): string {
  const list = loadAnswers().answers;
  for (let i = 0; i < 50; i += 1) {
    const word = list[Math.floor(Math.random() * list.length)];
    if (!used.has(word)) return word;
  }
  return list[Math.floor(Math.random() * list.length)];
}

// Sorteio fixo de um dia: o mesmo dia e modo dão sempre as mesmas palavras,
// sem repetir entre elas. A chave secreta impede de prever os próximos dias.
export function generateDailyWords(date: string, boards: number): string[] {
  const list = loadAnswers().answers;
  const secret = process.env.CIFRA_SECRET || process.env.JWT_SECRET || "typebattle";
  const words: string[] = [];
  for (let attempt = 0; words.length < boards; attempt += 1) {
    const digest = createHmac("sha256", secret).update(`${date}:${boards}:${attempt}`).digest();
    const word = list[digest.readUInt32BE(0) % list.length];
    if (!words.includes(word)) words.push(word);
  }
  return words;
}

// O dia de hoje no horário de Brasília (a Cifra diária vira à meia-noite).
export function todayKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function isDateKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

// Dia seguinte/anterior de uma chave "aaaa-mm-dd".
export function addDays(date: string, days: number): string {
  const time = Date.parse(`${date}T12:00:00Z`) + days * 86_400_000;
  return new Date(time).toISOString().slice(0, 10);
}
