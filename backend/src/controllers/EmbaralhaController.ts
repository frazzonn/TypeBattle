import { createHmac } from "node:crypto";
import type { Request, Response } from "express";

import { addDays, isDateKey, todayKey } from "../cifra/cifraWords.js";
import { normalizeWord, readDataLines } from "../lib/dataFiles.js";
import { isDictionaryWord } from "../pavio/pavioWords.js";

// Embaralha: desafio diário de formar palavras com as 7 letras do dia. Sem
// ranking; o progresso fica no navegador. As palavras que contam vêm de
// backend/data/embaralha (scripts/build-embaralha.mjs); outras palavras que
// existem no dicionário do Pavio valem como "extras", sem contar no total.

const MIN_ANSWERS = 20;
const MAX_ANSWERS = 60;
const MIN_LENGTH = 3;

type LetterCount = Int8Array;

function countLetters(word: string): LetterCount {
  const counts = new Int8Array(26);
  for (const char of word) counts[char.charCodeAt(0) - 97] += 1;
  return counts;
}

// Dá para formar "word" com as letras de "base"?
function fits(word: LetterCount, base: LetterCount): boolean {
  for (let i = 0; i < 26; i += 1) if (word[i] > base[i]) return false;
  return true;
}

interface WordData {
  words: { word: string; written: string; counts: LetterCount }[];
  written: Map<string, string>;
  // Bases com uma quantidade boa de palavras para um dia.
  bases: string[];
}

let data: WordData | null = null;

function getData(): WordData {
  if (data) return data;
  const words = readDataLines("embaralha/words.txt").map((line) => {
    const [word, written] = line.split(" ");
    return { word, written: written ?? word, counts: countLetters(word) };
  });
  const bases = readDataLines("embaralha/bases.txt").filter((base) => {
    const counts = countLetters(base);
    let total = 0;
    for (const entry of words) if (fits(entry.counts, counts)) total += 1;
    return total >= MIN_ANSWERS && total <= MAX_ANSWERS;
  });
  data = { words, written: new Map(words.map((entry) => [entry.word, entry.written])), bases };
  return data;
}

interface Daily {
  date: string;
  base: string;
  letters: string[];
  answers: string[];
}

const dailyCache = new Map<string, Daily>();

function digest(date: string, salt: string): Buffer {
  const secret = process.env.EMBARALHA_SECRET || process.env.JWT_SECRET || "typebattle";
  return createHmac("sha256", secret).update(`embaralha:${date}:${salt}`).digest();
}

// O desafio de um dia: sempre o mesmo para a mesma data, imprevisível sem a chave.
function getDaily(date: string): Daily {
  const cached = dailyCache.get(date);
  if (cached) return cached;

  const { words, bases } = getData();
  const base = bases[digest(date, "base").readUInt32BE(0) % bases.length];
  const baseCounts = countLetters(base);
  const answers = words
    .filter((entry) => fits(entry.counts, baseCounts))
    .map((entry) => entry.word)
    .sort((a, b) => a.length - b.length || a.localeCompare(b));

  // Letras embaralhadas (sem deixar a palavra inteira na ordem certa).
  const bytes = digest(date, "shuffle");
  const letters = [...base];
  for (let round = 0; round < 4 && letters.join("") === base; round += 1) {
    for (let i = letters.length - 1; i > 0; i -= 1) {
      const j = bytes[(i + round * 7) % bytes.length] % (i + 1);
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }
  }

  const daily = { date, base, letters, answers };
  // Guarda só hoje e os próximos.
  for (const key of dailyCache.keys()) if (key < todayKey()) dailyCache.delete(key);
  dailyCache.set(date, daily);
  return daily;
}

function nextDailyAt(date: string): number {
  return Date.parse(`${addDays(date, 1)}T03:00:00Z`);
}

// GET /api/embaralha/daily — as letras do dia e o tamanho de cada palavra, na
// ordem da grade (por tamanho, depois alfabética), sem dizer quais são.
export function getEmbaralha(_request: Request, response: Response) {
  try {
    const daily = getDaily(todayKey());
    const lengths: Record<number, number> = {};
    for (const word of daily.answers) lengths[word.length] = (lengths[word.length] ?? 0) + 1;
    return response.status(200).json({
      date: daily.date,
      letters: daily.letters,
      lengths,
      slots: daily.answers.map((word) => word.length),
      total: daily.answers.length,
      serverNow: Date.now(),
      nextAt: nextDailyAt(daily.date),
    });
  } catch (error) {
    console.error("ERRO AO CARREGAR EMBARALHA:", error);
    return response.status(500).json({ message: "Erro ao carregar o desafio do dia." });
  }
}

// POST /api/embaralha/daily/guess — confere uma palavra.
export function guessEmbaralha(request: Request, response: Response) {
  try {
    const date = todayKey();
    if (request.body?.date !== undefined && request.body.date !== date) {
      return response.status(409).json({ code: "DAY_CHANGED", message: "Já começou o desafio de um novo dia." });
    }
    const daily = getDaily(date);
    const word = normalizeWord(request.body?.word);

    if (word.length < MIN_LENGTH) return response.status(200).json({ result: "short", word });
    if (!/^[a-z]+$/.test(word) || !fits(countLetters(word), countLetters(daily.base))) {
      return response.status(200).json({ result: "letters", word });
    }
    if (daily.answers.includes(word)) {
      return response.status(200).json({
        result: "found",
        word,
        written: getData().written.get(word) ?? word,
        // Posição na grade.
        index: daily.answers.indexOf(word),
        // A palavra que usa todas as letras.
        full: word.length === daily.base.length,
      });
    }
    if (isDictionaryWord(word)) return response.status(200).json({ result: "extra", word, written: word });
    return response.status(200).json({ result: "invalid", word });
  } catch (error) {
    console.error("ERRO NO PALPITE DO EMBARALHA:", error);
    return response.status(500).json({ message: "Erro ao conferir a palavra." });
  }
}

// POST /api/embaralha/daily/reveal — todas as palavras de um dia (hoje ou antes).
export function revealEmbaralha(request: Request, response: Response) {
  try {
    const today = todayKey();
    const date = isDateKey(request.body?.date) && request.body.date <= today ? request.body.date : today;
    const daily = getDaily(date);
    const written = getData().written;
    return response.status(200).json({
      date,
      answers: daily.answers.map((word) => ({ word, written: written.get(word) ?? word })),
    });
  } catch (error) {
    console.error("ERRO AO REVELAR EMBARALHA:", error);
    return response.status(500).json({ message: "Erro ao revelar as palavras." });
  }
}
