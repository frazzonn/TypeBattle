export type TextDifficulty = "easy" | "normal" | "hard";

interface TextGeneratorOptions {
  difficulty: TextDifficulty;
  wordCount?: number;
  useAccents: boolean;
  useUppercase: boolean;
  usePunctuation: boolean;
}

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

function getRandomWord(words: string[]) {
  return words[Math.floor(Math.random() * words.length)] ?? "palavra";
}

function addPunctuation(word: string) {
  const punctuation = [".", ",", "!", "?", ";"];
  return (
    word + (punctuation[Math.floor(Math.random() * punctuation.length)] ?? ".")
  );
}

export function generateBattleText({
  difficulty,
  wordCount = 80,
  useAccents,
  useUppercase,
  usePunctuation,
}: TextGeneratorOptions): string {
  const words =
    difficulty === "easy"
      ? EASY_WORDS
      : difficulty === "hard"
        ? HARD_WORDS
        : NORMAL_WORDS;

  const generatedWords: string[] = [];

  for (let i = 0; i < wordCount; i += 1) {
    let word = getRandomWord(words);

    if (useAccents) {
      word = ACCENTED_WORDS[word] ?? word;
    }

    if (useUppercase && i % 10 === 0) {
      word = word.charAt(0).toUpperCase() + word.slice(1);
    }

    if (usePunctuation && i % 7 === 6) {
      word = addPunctuation(word);
    }

    generatedWords.push(word);
  }

  return generatedWords.join(" ");
}
