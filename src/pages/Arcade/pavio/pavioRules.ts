import syllables from "../../../data/pavio/syllables.json";

// Regras do Pavio no navegador (o solo valida aqui; a battle valida no servidor
// com as mesmas regras, em backend/src/pavio/pavioWords.ts).

export type WordRejection = "short" | "letters" | "missing" | "used" | "unknown";

export const REJECTION_MESSAGES: Record<WordRejection, string> = {
  short: "Muito curta: use 3 letras ou mais (e não só a sílaba).",
  letters: "Só letras, sem espaço nem número.",
  missing: "A sílaba precisa aparecer junta, em sequência.",
  used: "Essa palavra já foi usada.",
  unknown: "Não achei essa palavra no dicionário.",
};

// "Cabeça" -> "cabeca": vale digitar com ou sem acento.
export function normalizeWord(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

export interface PavioDictionary {
  // Todas as palavras aceitas.
  words: Set<string>;
  // Palavras conhecidas, da mais usada para a menos (para os exemplos).
  common: string[];
}

let dictionaryPromise: Promise<PavioDictionary> | null = null;

function fetchLines(path: string): Promise<string[]> {
  return fetch(path)
    .then((response) => {
      if (!response.ok) throw new Error("Dicionário indisponível.");
      return response.text();
    })
    // \r?\n: o Git no Windows pode trocar as quebras de linha por CRLF.
    .then((text) => text.split(/\r?\n/).filter(Boolean));
}

// ~570 mil palavras (~6 MB; o servidor manda compactado). Baixa uma vez só.
// Gerados por scripts/build-pavio.mjs.
export function loadDictionary(): Promise<PavioDictionary> {
  dictionaryPromise ??= Promise.all([
    fetchLines("/pavio/portuguese.txt"),
    fetchLines("/pavio/common.txt"),
  ])
    .then(([words, common]) => ({ words: new Set(words), common }))
    .catch((error: unknown) => {
      dictionaryPromise = null;
      throw error;
    });
  return dictionaryPromise;
}

export function pickSyllable(wordsPlayed: number, avoid?: string | null): string {
  const roll = Math.random();
  let level: keyof typeof syllables = "easy";
  if (wordsPlayed >= 25) level = roll < 0.35 ? "medium" : roll < 0.8 ? "hard" : "easy";
  else if (wordsPlayed >= 12) level = roll < 0.5 ? "medium" : roll < 0.75 ? "hard" : "easy";
  else if (wordsPlayed >= 5) level = roll < 0.4 ? "medium" : "easy";

  const list = syllables[level];
  for (let i = 0; i < 10; i += 1) {
    const syllable = list[Math.floor(Math.random() * list.length)];
    if (syllable !== avoid) return syllable;
  }
  return list[0];
}

export function checkWord(
  raw: string,
  syllable: string,
  used: ReadonlySet<string>,
  dictionary: ReadonlySet<string>,
): { word: string } | { reason: WordRejection } {
  const word = normalizeWord(raw);
  if (word.length < 3 || word === syllable) return { reason: "short" };
  if (!/^[a-z]+$/.test(word)) return { reason: "letters" };
  if (!word.includes(syllable)) return { reason: "missing" };
  if (used.has(word)) return { reason: "used" };
  if (!dictionary.has(word)) return { reason: "unknown" };
  return { word };
}

// Palavras que resolviam a sílaba (mostradas quando a bomba explode).
// Mesma regra de backend/src/pavio/pavioWords.ts: sorteia entre as palavras
// mais usadas que têm a sílaba, de começos diferentes.
const EXAMPLE_POOL = 25;

export function exampleWords(common: readonly string[], syllable: string, amount = 3): string[] {
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
