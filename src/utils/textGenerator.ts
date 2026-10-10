import { EASY_WORDS, HARD_WORDS, NORMAL_WORDS } from "../data/wordLists";

export type TextDifficulty = "easy" | "normal" | "hard";

export interface TextGeneratorOptions {
  difficulty?: TextDifficulty;
  wordCount?: number;
  useAccents?: boolean;
  useUppercase?: boolean;
  usePunctuation?: boolean;
}

// Variantes acentuadas de palavras usadas nos textos.
const ACCENTED_WORDS: Record<string, string> = {
  agua: "água",
  musica: "música",
  cafe: "café",
  codigo: "código",
  usuario: "usuário",
  experiencia: "experiência",
  informacao: "informação",
  funcao: "função",
  aplicacao: "aplicação",
  programacao: "programação",
  solucao: "solução",
  precisao: "precisão",
  organizacao: "organização",
  comunicacao: "comunicação",
  seguranca: "segurança",
  inovacao: "inovação",
  implementacao: "implementação",
  configuracao: "configuração",
  autenticacao: "autenticação",
  autorizacao: "autorização",
  complexidade: "complexidade",
  documentacao: "documentação",
  funcionalidade: "funcionalidade",
  sincronizacao: "sincronização",
  concorrencia: "concorrência",
  abstracao: "abstração",
  reutilizacao: "reutilização",
  otimizacao: "otimização",
  extraordinario: "extraordinário",
  estrategicamente: "estrategicamente",
};

// Escolhe uma palavra aleatória.
function getRandomWord(words: string[]) {
  return words[Math.floor(Math.random() * words.length)] ?? "palavra";
}

function capitalize(word: string) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function addPunctuation(word: string) {
  const punctuation = [".", ",", "!", "?", ";"];
  return (
    word + (punctuation[Math.floor(Math.random() * punctuation.length)] ?? ".")
  );
}

function getWordList(difficulty: TextDifficulty) {
  switch (difficulty) {
    case "easy":
      return EASY_WORDS;
    case "hard":
      return HARD_WORDS;
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

    if (useAccents) {
      word = ACCENTED_WORDS[word] ?? word;
    }

    // O modo fácil mantém o texto simples por padrão.
    if (useUppercase && i % 10 === 0) {
      word = capitalize(word);
    }

    if (usePunctuation && i % 7 === 6) {
      word = addPunctuation(word);
    }

    generatedWords.push(word);
  }

  return generatedWords.join(" ");
}
