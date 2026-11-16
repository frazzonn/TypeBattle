import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { LANGUAGE_WORDS } from "../battle/languageWords.js";

// Dicionário e sílabas do Pavio, gerados por scripts/build-pavio.mjs em
// backend/data/pavio. As palavras estão sem acento e em minúsculas.

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

let wordList: string[] | null = null;
let words: Set<string> | null = null;
let syllables: Syllables | null = null;

// Carrega na primeira partida (são ~265 mil palavras) e mantém em memória.
function getWordList(): string[] {
  // \r?\n: o Git no Windows pode trocar as quebras de linha por CRLF.
  wordList ??= readFileSync(findDataFile("portuguese.txt"), "utf8").split(/\r?\n/).filter(Boolean);
  return wordList;
}

function getWords(): Set<string> {
  words ??= new Set(getWordList());
  return words;
}

function getSyllables(): Syllables {
  syllables ??= JSON.parse(readFileSync(findDataFile("syllables.json"), "utf8")) as Syllables;
  return syllables;
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

// Algumas palavras que resolviam a sílaba (mostradas quando a bomba explode).
let commonWords: string[] | null = null;

// Palavras comuns (as do teste de digitação), para os exemplos serem conhecidos.
function getCommonWords(): string[] {
  if (!commonWords) {
    const portuguese = LANGUAGE_WORDS.find((language) => language.code === "portuguese");
    const all = [...(portuguese?.normal ?? []), ...(portuguese?.hard ?? [])].map(normalizeWord);
    commonWords = [...new Set(all)].filter((word) => /^[a-z]{3,}$/.test(word));
  }
  return commonWords;
}

// Começa num ponto sorteado (as listas são alfabéticas) para variar os exemplos.
export function exampleWords(syllable: string, amount = 3): string[] {
  const common = pickExamples(getCommonWords(), syllable, amount);
  if (common.length >= amount) return common;
  const extra = pickExamples(getWordList(), syllable, amount).filter((word) => !common.includes(word));
  return [...common, ...extra].slice(0, amount);
}

function pickExamples(list: readonly string[], syllable: string, amount: number): string[] {
  if (list.length === 0) return [];
  const start = Math.floor(Math.random() * list.length);
  const found: string[] = [];
  for (let i = 0; i < list.length && found.length < amount; i += 1) {
    const word = list[(start + i) % list.length];
    if (word.length <= 9 && word.includes(syllable) && !found.some((w) => w[0] === word[0])) {
      found.push(word);
    }
  }
  return found;
}
