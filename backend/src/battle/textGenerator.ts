import type { RoomSettings } from "./types.js";

// Listas de palavras em português, separadas por dificuldade.
const EASY_WORDS = [
  "casa",
  "carro",
  "mesa",
  "livro",
  "escola",
  "amigo",
  "cidade",
  "trabalho",
  "tempo",
  "jogo",
  "dia",
  "noite",
  "agua",
  "comida",
  "rua",
  "praia",
  "sol",
  "lua",
  "vida",
  "mundo",
  "porta",
  "janela",
  "cama",
  "bola",
  "musica",
  "filme",
  "papel",
  "caneta",
  "cafe",
  "leite",
  "roupa",
  "sapato",
  "esporte",
  "viagem",
  "familia",
  "jardim",
  "animal",
  "fruta",
  "arvore",
  "computador",
  "telefone",
  "internet",
  "programa",
  "sistema",
  "codigo",
  "projeto",
  "equipe",
  "jogar",
  "correr",
  "andar",
  "comer",
  "beber",
  "estudar",
  "trabalhar",
  "criar",
  "testar",
  "aprender",
];
const NORMAL_WORDS = [
  "tecnologia",
  "desenvolvimento",
  "programacao",
  "aplicacao",
  "sistema",
  "projeto",
  "empresa",
  "usuario",
  "experiencia",
  "processo",
  "resultado",
  "informacao",
  "conhecimento",
  "internet",
  "computador",
  "servidor",
  "banco",
  "dados",
  "estrutura",
  "funcao",
  "componente",
  "interface",
  "pagina",
  "navegador",
  "qualidade",
  "produto",
  "equipe",
  "trabalho",
  "objetivo",
  "desafio",
  "solucao",
  "problema",
  "melhoria",
  "velocidade",
  "precisao",
  "desempenho",
  "aprendizado",
  "criatividade",
  "planejamento",
  "organizacao",
  "comunicacao",
  "seguranca",
  "conexao",
  "servico",
  "plataforma",
  "inovacao",
  "rapidamente",
  "importante",
  "diferente",
  "melhorar",
  "construir",
  "desenvolver",
  "utilizar",
  "analisar",
  "resolver",
];
const HARD_WORDS = [
  "arquitetura",
  "infraestrutura",
  "implementacao",
  "compatibilidade",
  "responsabilidade",
  "desenvolvimento",
  "gerenciamento",
  "configuracao",
  "autenticacao",
  "autorizacao",
  "complexidade",
  "escalabilidade",
  "disponibilidade",
  "manutenibilidade",
  "internacionalizacao",
  "documentacao",
  "funcionalidade",
  "produtividade",
  "processamento",
  "armazenamento",
  "comunicacao",
  "sincronizacao",
  "concorrencia",
  "persistencia",
  "relacionamento",
  "abstracao",
  "encapsulamento",
  "polimorfismo",
  "interoperabilidade",
  "virtualizacao",
  "monitoramento",
  "observabilidade",
  "especificacao",
  "reutilizacao",
  "automatizacao",
  "transformacao",
  "otimizacao",
  "especificamente",
  "extraordinario",
  "simultaneamente",
  "principalmente",
  "consequentemente",
  "aproximadamente",
  "necessariamente",
  "possivelmente",
  "estrategicamente",
  "tecnicamente",
  "consistentemente",
];
// Mantém o gerador das salas alinhado ao teste padrão.
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
  estrategicamente: "estrategicamente",
};
function removeAccents(word: string): string {
  return word.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function applyAccents(word: string): string {
  const normalizedWord = removeAccents(word).toLowerCase();
  return ACCENTED_WORDS[normalizedWord] ?? word;
}
function getRandomWord(words: string[]): string {
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
function capitalize(word: string): string {
  return word.charAt(0).toLocaleUpperCase("pt-BR") + word.slice(1);
}
export function makeText(settings: RoomSettings): string {
  const words =
    settings.difficulty === "easy"
      ? EASY_WORDS
      : settings.difficulty === "hard"
        ? HARD_WORDS
        : NORMAL_WORDS;
  const generatedWords: string[] = [];
  const wordCount = 80;
  const getSentenceLength = () => Math.floor(Math.random() * 5) + 6;
  let wordsInSentence = 0;
  let sentenceLength = getSentenceLength();
  // Gera um único texto compartilhado por todos os jogadores da rodada.
  for (let i = 0; i < wordCount; i += 1) {
    let word = getRandomWord(words);
    word = settings.accents ? applyAccents(word) : removeAccents(word);
    if (settings.punctuation) {
      if (wordsInSentence === 0) {
        word = capitalize(word);
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
      word = capitalize(word);
    }
    generatedWords.push(word);
  }
  return generatedWords.join(" ");
}
