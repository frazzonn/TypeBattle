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

let dictionaryPromise: Promise<string[]> | null = null;

// ~265 mil palavras (2,7 MB; o servidor manda compactado). Baixa uma vez só.
export function loadDictionary(): Promise<string[]> {
  dictionaryPromise ??= fetch("/pavio/portuguese.txt")
    .then((response) => {
      if (!response.ok) throw new Error("Dicionário indisponível.");
      return response.text();
    })
    // \r?\n: o Git no Windows pode trocar as quebras de linha por CRLF.
    .then((text) => text.split(/\r?\n/).filter(Boolean))
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

// Algumas palavras que resolviam a sílaba, de começos diferentes.
export function exampleWords(list: readonly string[], syllable: string, amount = 3): string[] {
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
