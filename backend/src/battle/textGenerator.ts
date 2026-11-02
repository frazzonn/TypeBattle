import { DEFAULT_LANGUAGE, LANGUAGE_WORDS } from "./languageWords.js";
import type { RoomSettings } from "./types.js";

export { DEFAULT_LANGUAGE };

// Fácil = ~200 palavras mais comuns, normal = 5k, difícil = 10k (ver scripts/build-languages.mjs).
export function isLanguageCode(value: unknown): value is string {
  return LANGUAGE_WORDS.some((language) => language.code === value);
}
function removeAccents(word: string): string {
  return word.normalize("NFD").replace(/\p{M}/gu, "");
}
function getRandomWord(words: readonly string[]): string {
  return words[Math.floor(Math.random() * words.length)] ?? "palavra";
}
function getSentenceEnding(): string {
  const endings = [".", ".", ".", "!", "?"];
  return endings[Math.floor(Math.random() * endings.length)] ?? ".";
}
function getClausePunctuation(): string {
  const punctuation = [",", ",", ",", ";", ":"];
  return punctuation[Math.floor(Math.random() * punctuation.length)] ?? ",";
}
function capitalize(word: string, locale: string): string {
  return word.charAt(0).toLocaleUpperCase(locale) + word.slice(1);
}
export function makeText(settings: RoomSettings): string {
  const language =
    LANGUAGE_WORDS.find((item) => item.code === settings.language) ??
    LANGUAGE_WORDS.find((item) => item.code === DEFAULT_LANGUAGE)!;
  // Idiomas sem dificuldade só têm a lista "easy".
  const words = language[settings.difficulty] ?? language.easy;
  // Sem acentos, eles são removidos; alfabetos não latinos ficam como estão.
  const stripAccents = !settings.accents && language.latin;
  const generatedWords: string[] = [];
  // No modo palavras o texto tem exatamente as palavras da rodada.
  const wordCount = settings.mode === "words" ? settings.wordCount : 80;
  const getSentenceLength = () => Math.floor(Math.random() * 5) + 6;
  let wordsInSentence = 0;
  let sentenceLength = getSentenceLength();
  // Gera um único texto compartilhado por todos os jogadores da rodada.
  for (let i = 0; i < wordCount; i += 1) {
    let word = getRandomWord(words);
    if (stripAccents) word = removeAccents(word);
    if (settings.punctuation) {
      if (wordsInSentence === 0) {
        word = capitalize(word, language.locale);
      }
      wordsInSentence += 1;
      const isLastWord = i === wordCount - 1;
      const endsSentence = wordsInSentence >= sentenceLength;
      if (isLastWord || endsSentence) {
        word += getSentenceEnding();
        wordsInSentence = 0;
        sentenceLength = getSentenceLength();
      } else if (wordsInSentence >= 2 && Math.random() < 0.18) {
        word += getClausePunctuation();
      }
    }
    if (settings.uppercase && i % 10 === 0) {
      word = capitalize(word, language.locale);
    }
    generatedWords.push(word);
  }
  return generatedWords.join(" ");
}
