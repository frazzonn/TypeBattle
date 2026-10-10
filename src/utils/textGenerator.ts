import { EASY_WORDS, HARD_WORDS, NORMAL_WORDS } from "../data/wordLists";

export type TextDifficulty = "easy" | "normal" | "hard";

export interface TextGeneratorOptions {
  difficulty?: TextDifficulty;
  wordCount?: number;
  useAccents?: boolean;
  useUppercase?: boolean;
  usePunctuation?: boolean;
}

// Mapeia formas sem acento para formas corretas em português.
const ACCENTED_WORDS: Record<string, string> = {
  agua: "água",
  musica: "música",
  cafe: "café",
  familia: "família",
  arvore: "árvore",
  codigo: "código",
  programacao: "programação",
  aplicacao: "aplicação",
  usuario: "usuário",
  experiencia: "experiência",
  informacao: "informação",
  funcao: "função",
  pagina: "página",
  solucao: "solução",
  precisao: "precisão",
  organizacao: "organização",
  comunicacao: "comunicação",
  seguranca: "segurança",
  conexao: "conexão",
  servico: "serviço",
  inovacao: "inovação",
  implementacao: "implementação",
  configuracao: "configuração",
  autenticacao: "autenticação",
  autorizacao: "autorização",
  internacionalizacao: "internacionalização",
  documentacao: "documentação",
  sincronizacao: "sincronização",
  concorrencia: "concorrência",
  persistencia: "persistência",
  abstracao: "abstração",
  virtualizacao: "virtualização",
  especificacao: "especificação",
  reutilizacao: "reutilização",
  automatizacao: "automatização",
  transformacao: "transformação",
  otimizacao: "otimização",
  extraordinario: "extraordinário",
};

function removeAccents(word: string): string {
  return word.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function applyAccents(word: string): string {
  const normalizedWord = removeAccents(word).toLowerCase();
  return ACCENTED_WORDS[normalizedWord] ?? word;
}

function getRandomWord(words: readonly string[]): string {
  return words[Math.floor(Math.random() * words.length)] ?? "palavra";
}

function capitalize(word: string): string {
  return word.charAt(0).toLocaleUpperCase("pt-BR") + word.slice(1);
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

function getWordList(difficulty: TextDifficulty): readonly string[] {
  switch (difficulty) {
    case "easy":
      return EASY_WORDS;
    case "hard":
      return HARD_WORDS;
    default:
      return NORMAL_WORDS;
  }
}

export function generateText(options: TextGeneratorOptions = {}): string {
  const {
    difficulty = "normal",
    wordCount = 80,
    useAccents = false,
    useUppercase = false,
    usePunctuation = false,
  } = options;

  const words = getWordList(difficulty);
  const generatedWords: string[] = [];
  const safeWordCount = Math.max(1, Math.floor(wordCount));
  const getSentenceLength = () => Math.floor(Math.random() * 5) + 6;

  let wordsInSentence = 0;
  let sentenceLength = getSentenceLength();

  for (let i = 0; i < safeWordCount; i += 1) {
    let word = getRandomWord(words);
    word = useAccents ? applyAccents(word) : removeAccents(word);

    if (usePunctuation) {
      if (wordsInSentence === 0) {
        word = capitalize(word);
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
      word = capitalize(word);
    }

    generatedWords.push(word);
  }

  return generatedWords.join(" ");
}
