import { EASY_WORDS, HARD_WORDS, NORMAL_WORDS } from "../data/wordLists";

export type TextDifficulty = "easy" | "normal" | "hard";

export interface TextGeneratorOptions {
  difficulty?: TextDifficulty;
  wordCount?: number;
  useAccents?: boolean;
  useUppercase?: boolean;
  usePunctuation?: boolean;
}

// Escolhe uma palavra aleatória da lista.
function getRandomWord(words: string[]) {
  const index = Math.floor(Math.random() * words.length);

  return words[index];
}

// Coloca uma letra maiúscula no início da palavra.
function capitalize(word: string) {
  if (!word) {
    return word;
  }

  return word.charAt(0).toUpperCase() + word.slice(1);
}

// Adiciona pontuação de forma aleatória.
function addPunctuation(word: string, index: number) {
  // Evita colocar pontuação em todas as palavras.
  if (index % 7 !== 0) {
    return word;
  }

  const punctuation = [".", ",", "!", "?", ";"];

  const randomIndex = Math.floor(Math.random() * punctuation.length);

  return `${word}${punctuation[randomIndex]}`;
}

function getWordList(difficulty: TextDifficulty) {
  switch (difficulty) {
    case "easy":
      return EASY_WORDS;

    case "hard":
      return HARD_WORDS;

    case "normal":
    default:
      return NORMAL_WORDS;
  }
}

export function generateText(options: TextGeneratorOptions = {}) {
  const {
    difficulty = "normal",
    wordCount = 80,
    useAccents = false,
    useUppercase = false,
    usePunctuation = false,
  } = options;

  const words = getWordList(difficulty);

  const generatedWords: string[] = [];

  for (let i = 0; i < wordCount; i += 1) {
    let word = getRandomWord(words);

    // A lista inicial não possui acentos.
    // Os acentos serão tratados posteriormente
    // quando criarmos um dicionário específico para isso.
    if (!useAccents) {
      word = removeAccents(word);
    }

    if (useUppercase && i % 10 === 0) {
      word = capitalize(word);
    }

    if (usePunctuation) {
      word = addPunctuation(word, i);
    }

    generatedWords.push(word);
  }

  return generatedWords.join(" ");
}

// Remove acentos para o modo sem acentuação.
function removeAccents(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
