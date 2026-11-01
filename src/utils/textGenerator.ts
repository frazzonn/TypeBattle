import { DEFAULT_LANGUAGE, LANGUAGES } from "../data/languages";

export { DEFAULT_LANGUAGE };

export type TextDifficulty = "easy" | "normal" | "hard";

// Fácil = ~200 palavras mais comuns, normal = 5k, difícil = 10k (ver scripts/build-languages.mjs).
// Idiomas sem dificuldade só têm "easy", com todas as palavras.
export type WordBank = {
  easy: readonly string[];
  normal?: readonly string[];
  hard?: readonly string[];
};

export const LANGUAGE_OPTIONS = LANGUAGES;

export function languageHasDifficulty(code: string): boolean {
  return LANGUAGES.find((item) => item.code === code)?.hasDifficulty ?? true;
}

export interface TextGeneratorOptions {
  bank: WordBank;
  language?: string;
  difficulty?: TextDifficulty;
  wordCount?: number;
  useAccents?: boolean;
  useUppercase?: boolean;
  usePunctuation?: boolean;
}

// Cada idioma fica num arquivo separado e só é baixado quando escolhido.
const bankLoaders = import.meta.glob<WordBank>("../data/wordBanks/*.json", {
  import: "default",
});
const bankCache = new Map<string, Promise<WordBank>>();

export function loadWordBank(language: string): Promise<WordBank> {
  const cached = bankCache.get(language);
  if (cached) return cached;

  const loader =
    bankLoaders[`../data/wordBanks/${language}.json`] ??
    bankLoaders[`../data/wordBanks/${DEFAULT_LANGUAGE}.json`];
  const promise = loader();

  // Se falhar (rede caiu), permite tentar de novo depois.
  promise.catch(() => bankCache.delete(language));
  bankCache.set(language, promise);
  return promise;
}

function removeAccents(word: string): string {
  return word.normalize("NFD").replace(/\p{M}/gu, "");
}

function getRandomWord(words: readonly string[]): string {
  return words[Math.floor(Math.random() * words.length)] ?? "palavra";
}

function capitalize(word: string, locale: string): string {
  return word.charAt(0).toLocaleUpperCase(locale) + word.slice(1);
}

// O fim de frase usa apenas ponto, exclamação ou interrogação, sem reticências.
function getSentenceEnding(): string {
  const endings = [".", ".", ".", "!", "?"];
  return endings[Math.floor(Math.random() * endings.length)] ?? ".";
}

function getClausePunctuation(): string {
  const punctuation = [",", ",", ",", ";", ":"];
  return punctuation[Math.floor(Math.random() * punctuation.length)] ?? ",";
}

export function generateText(options: TextGeneratorOptions): string {
  const {
    bank,
    language: languageCode = DEFAULT_LANGUAGE,
    difficulty = "easy",
    wordCount = 80,
    useAccents = false,
    useUppercase = false,
    usePunctuation = false,
  } = options;

  const language = LANGUAGES.find((item) => item.code === languageCode);
  const locale = language?.locale ?? "pt-BR";
  // Sem acentos, eles são removidos; alfabetos não latinos ficam como estão.
  const stripAccents = !useAccents && (language?.latin ?? true);
  const words = bank[difficulty] ?? bank.easy;
  const generatedWords: string[] = [];
  const safeWordCount = Math.max(1, Math.floor(wordCount));
  const getSentenceLength = () => Math.floor(Math.random() * 5) + 6;

  let wordsInSentence = 0;
  let sentenceLength = getSentenceLength();

  for (let i = 0; i < safeWordCount; i += 1) {
    let word = getRandomWord(words);
    if (stripAccents) word = removeAccents(word);

    if (usePunctuation) {
      if (wordsInSentence === 0) {
        word = capitalize(word, locale);
      }

      wordsInSentence += 1;
      const isLastWord = i === safeWordCount - 1;
      const endsSentence = wordsInSentence >= sentenceLength;

      if (isLastWord || endsSentence) {
        word += getSentenceEnding();
        wordsInSentence = 0;
        sentenceLength = getSentenceLength();
      } else if (wordsInSentence >= 2 && Math.random() < 0.18) {
        word += getClausePunctuation();
      }
    }

    if (useUppercase && i % 10 === 0) {
      word = capitalize(word, locale);
    }

    generatedWords.push(word);
  }

  return generatedWords.join(" ");
}
