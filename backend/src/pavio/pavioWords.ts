import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Dicionário, palavras conhecidas e sílabas do Pavio, gerados por
// scripts/build-pavio.mjs em backend/data/pavio. As palavras estão sem acento
// e em minúsculas.

export type SyllableLevel = "easy" | "medium" | "hard";
type Syllables = Record<SyllableLevel, string[]>;

export type WordRejection = "short" | "letters" | "missing" | "used" | "unknown";

// Funciona rodando de src/ (tsx) ou de dist/src/ (build), e a partir da pasta backend.
function findDataFile(name: string): string {
  const here = fileURLToPath(new URL(".", import.meta.url));
  const candidates = [
    resolve(process.cwd(), "data/pavio", name),
    resolve(here, "../../data/pavio", name),
    resolve(here, "../../../data/pavio", name),
  ];
  const found = candidates.find((file) => existsSync(file));
  if (!found) throw new Error(`Arquivo do Pavio não encontrado: ${name}`);
  return found;
}

// \r?\n: o Git no Windows pode trocar as quebras de linha por CRLF.
function readLines(name: string): string[] {
  return readFileSync(findDataFile(name), "utf8").split(/\r?\n/).filter(Boolean);
}

let words: Set<string> | null = null;
let commonWords: string[] | null = null;
let syllables: Syllables | null = null;

// Carrega na primeira partida (são ~570 mil palavras) e mantém em memória.
function getWords(): Set<string> {
  words ??= new Set(readLines("portuguese.txt"));
  return words;
}

// Palavras conhecidas, da mais usada para a menos.
function getCommonWords(): string[] {
  commonWords ??= readLines("common.txt");
  return commonWords;
}

function getSyllables(): Syllables {
  syllables ??= JSON.parse(readFileSync(findDataFile("syllables.json"), "utf8")) as Syllables;
  return syllables;
}

// A palavra (já normalizada) existe no dicionário?
export function isDictionaryWord(word: string): boolean {
  return getWords().has(word);
}

// "Cabeça" -> "cabeca": o jogador pode digitar com ou sem acento.
export function normalizeWord(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

// Sílabas ficam mais difíceis conforme a partida avança.
export function pickSyllable(wordsPlayed: number, avoid?: string): string {
  const pool = getSyllables();
  const roll = Math.random();
  let level: SyllableLevel = "easy";
  if (wordsPlayed >= 25) level = roll < 0.35 ? "medium" : roll < 0.8 ? "hard" : "easy";
  else if (wordsPlayed >= 12) level = roll < 0.5 ? "medium" : roll < 0.75 ? "hard" : "easy";
  else if (wordsPlayed >= 5) level = roll < 0.4 ? "medium" : "easy";

  const list = pool[level];
  for (let i = 0; i < 10; i += 1) {
    const syllable = list[Math.floor(Math.random() * list.length)];
    if (syllable !== avoid) return syllable;
  }
  return list[0];
}

// A palavra precisa ter a sílaba em sequência ("cabo" vale para "ab"; "carbo" não).
export function checkWord(
  raw: string,
  syllable: string,
  used: Set<string>,
): { word: string } | { reason: WordRejection } {
  const word = normalizeWord(raw);
  if (word.length < 3 || word === syllable) return { reason: "short" };
  if (!/^[a-z]+$/.test(word)) return { reason: "letters" };
  if (!word.includes(syllable)) return { reason: "missing" };
  if (used.has(word)) return { reason: "used" };
  if (!getWords().has(word)) return { reason: "unknown" };
  return { word };
}

// Palavras que resolviam a sílaba (mostradas quando a bomba explode).
// Mesma regra de src/pages/Arcade/pavio/pavioRules.ts.
const EXAMPLE_POOL = 25;

export function exampleWords(syllable: string, amount = 3): string[] {
  return pickExamples(getCommonWords(), syllable, amount);
}

// Sorteia entre as palavras mais usadas que têm a sílaba, de começos diferentes.
function pickExamples(common: readonly string[], syllable: string, amount: number): string[] {
  const pool: string[] = [];
  const short: string[] = [];
  for (const word of common) {
    if (word === syllable || !word.includes(syllable)) continue;
    if (word.length >= 4 && word.length <= 10) pool.push(word);
    else short.push(word);
    if (pool.length >= EXAMPLE_POOL) break;
  }

  const shuffled = shuffle(pool);
  // Primeiro, começos diferentes; se não der, completa com o que tiver.
  const found: string[] = [];
  for (const word of shuffled) {
    if (found.length < amount && !found.some((other) => other[0] === word[0])) found.push(word);
  }
  for (const word of [...shuffled, ...short]) {
    if (found.length < amount && !found.includes(word)) found.push(word);
  }
  return found;
}

function shuffle<T>(list: readonly T[]): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
