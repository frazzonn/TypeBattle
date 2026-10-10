import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { Server, type Socket } from "socket.io";
import { authMiddleware } from "./middleware/authMiddleware.js";
import { db } from "./prisma/db.js";
import { authRoutes } from "./routes/authRoutes.js";
import { typingResultRoutes } from "./routes/typingResultRoutes.js";
import { userRoutes } from "./routes/userRoutes.js";
const app = express();
const httpServer = createServer(app);
const allowedOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
});
type Difficulty = "easy" | "normal" | "hard";
type MatchFormat = "single" | "best-of-3" | "best-of-5";
type Duration = 15 | 30 | 60;
type PlayerLimit = 2 | 3 | 4;
type RoomStatus = "waiting" | "countdown" | "playing" | "finished";
interface RoomSettings {
  difficulty: Difficulty;
  accents: boolean;
  uppercase: boolean;
  punctuation: boolean;
  duration: Duration;
  format: MatchFormat;
  playerLimit: PlayerLimit;
}
// Aceita clientes antigos sem playerLimit e usa 2 jogadores como padrão.
type RoomSettingsInput = Omit<RoomSettings, "playerLimit"> & {
  playerLimit?: unknown;
};
interface PlayerScore {
  ppm: number;
  accuracy: number;
  errors: number;
  progress: number;
}
interface RoomPlayer extends PlayerScore {
  socketId: string;
  nickname: string;
  isGuest: boolean;
}
interface BattleState {
  round: number;
  text: string;
  countdownEndsAt: number | null;
  startedAt: number | null;
  endsAt: number | null;
  winnerSocketId: string | null;
}
interface SeriesResult {
  winnerSocketId: string | null;
  wins: Record<string, number>;
  roundsPlayed: number;
  players: Array<{
    socketId: string;
    nickname: string;
  }>;
}
interface BattleRoom {
  code: string;
  hostSocketId: string;
  players: RoomPlayer[];
  settings: RoomSettings;
  status: RoomStatus;
  battle: BattleState | null;
  typedTexts: Record<string, string>;
  seriesWins: Record<string, number>;
  seriesWinnerSocketId: string | null;
  seriesFinished: boolean;
  lastSeriesResult: SeriesResult | null;
}
const rooms = new Map<string, BattleRoom>();
const countdownTimers = new Map<string, ReturnType<typeof setTimeout>>();
const finishTimers = new Map<string, ReturnType<typeof setTimeout>>();
const nextRoundTimers = new Map<string, ReturnType<typeof setTimeout>>();
const lobbyTimers = new Map<string, ReturnType<typeof setTimeout>>();
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
function makeText(settings: RoomSettings): string {
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
function generateRoomCode(): string {
  let code = "";
  do {
    code = randomBytes(4).toString("hex").toUpperCase();
  } while (rooms.has(code));
  return code;
}
function sanitizeNickname(value: unknown): string {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").slice(0, 16)
    : "";
}
function isValidSettings(value: unknown): value is RoomSettingsInput {
  if (!value || typeof value !== "object") {
    return false;
  }
  const settings = value as Record<string, unknown>;
  return (
    ["easy", "normal", "hard"].includes(String(settings.difficulty)) &&
    typeof settings.accents === "boolean" &&
    typeof settings.uppercase === "boolean" &&
    typeof settings.punctuation === "boolean" &&
    [15, 30, 60].includes(Number(settings.duration)) &&
    ["single", "best-of-3", "best-of-5"].includes(String(settings.format)) &&
    (settings.playerLimit === undefined ||
      [2, 3, 4].includes(Number(settings.playerLimit)))
  );
}
function normalizeRoomSettings(settings: RoomSettingsInput): RoomSettings {
  const limit = Number(settings.playerLimit);
  return {
    difficulty: settings.difficulty,
    accents: settings.accents,
    uppercase: settings.uppercase,
    punctuation: settings.punctuation,
    duration: settings.duration,
    format: settings.format,
    playerLimit: limit === 3 ? 3 : limit === 4 ? 4 : 2,
  };
}
function initialScore(): PlayerScore {
  return {
    ppm: 0,
    accuracy: 0,
    errors: 0,
    progress: 0,
  };
}
function makePlayer(socketId: string, nickname: string): RoomPlayer {
  return {
    socketId,
    nickname,
    isGuest: true,
    ...initialScore(),
  };
}
// Não envia os textos digitados individualmente para os outros clientes.
function publicRoom(room: BattleRoom) {
  const { typedTexts: _typedTexts, ...safeRoom } = room;
  return safeRoom;
}
function sendRoomUpdate(room: BattleRoom) {
  io.to(room.code).emit("room:updated", publicRoom(room));
}
function clearTimer(
  timers: Map<string, ReturnType<typeof setTimeout>>,
  code: string,
) {
  const timer = timers.get(code);
  if (timer) {
    clearTimeout(timer);
  }
  timers.delete(code);
}
function clearTimers(code: string) {
  clearTimer(countdownTimers, code);
  clearTimer(finishTimers, code);
  clearTimer(nextRoundTimers, code);
  clearTimer(lobbyTimers, code);
}
// O servidor calcula as estatísticas oficiais da rodada.
function calculateScore(
  typedText: string,
  target: string,
  elapsedMs: number,
): PlayerScore {
  let correct = 0;
  let errors = 0;
  for (let index = 0; index < typedText.length; index += 1) {
    if (index < target.length && typedText[index] === target[index]) {
      correct += 1;
    } else {
      errors += 1;
    }
  }
  const accuracy =
    typedText.length > 0 ? (correct / typedText.length) * 100 : 0;
  const minutes = Math.max(elapsedMs, 1000) / 60000;
  const ppm = Math.round(correct / 5 / minutes);
  const progress =
    target.length > 0
      ? Math.min(100, Math.round((typedText.length / target.length) * 100))
      : 0;
  return {
    ppm,
    accuracy: Math.round(accuracy * 10) / 10,
    errors,
    progress,
  };
}
function getRequiredWins(format: MatchFormat): number {
  if (format === "best-of-3") return 2;
  if (format === "best-of-5") return 3;
  return 1;
}
function getMaximumRounds(format: MatchFormat): number {
  if (format === "best-of-3") return 3;
  if (format === "best-of-5") return 5;
  return 1;
}
function getRoundWinner(room: BattleRoom): string | null {
  if (room.players.length < 2) return null;
  const rankedPlayers = [...room.players].sort((first, second) => {
    if (first.ppm !== second.ppm) return second.ppm - first.ppm;
    if (first.accuracy !== second.accuracy)
      return second.accuracy - first.accuracy;
    return 0;
  });
  const first = rankedPlayers[0];
  const second = rankedPlayers[1];
  if (!first) return null;
  if (!second) return first.socketId;
  // Se os melhores empatarem em PPM e precisão, a rodada termina empatada.
  if (first.ppm === second.ppm && first.accuracy === second.accuracy) {
    return null;
  }
  return first.socketId;
}
function getSeriesLeader(room: BattleRoom): string | null {
  const rankedPlayers = [...room.players].sort((first, second) => {
    const firstWins = room.seriesWins[first.socketId] ?? 0;
    const secondWins = room.seriesWins[second.socketId] ?? 0;
    return secondWins - firstWins;
  });
  const leader = rankedPlayers[0];
  const runnerUp = rankedPlayers[1];
  if (!leader) return null;
  const leaderWins = room.seriesWins[leader.socketId] ?? 0;
  const runnerUpWins = runnerUp
    ? (room.seriesWins[runnerUp.socketId] ?? 0)
    : -1;
  // Não declara campeão se os jogadores terminarem empatados em vitórias.
  if (leaderWins === runnerUpWins) return null;
  return leader.socketId;
}
function finishBattle(room: BattleRoom) {
  if (room.status !== "playing" || room.battle?.startedAt == null) {
    return;
  }
  clearTimer(finishTimers, room.code);
  const battle = room.battle;
  const startedAt = battle.startedAt;
  if (startedAt === null) {
    return;
  }
  const elapsed = Date.now() - startedAt;
  // Recalcula os resultados no servidor, evitando confiar só no navegador.
  for (const player of room.players) {
    Object.assign(
      player,
      calculateScore(
        room.typedTexts[player.socketId] ?? "",
        battle.text,
        elapsed,
      ),
    );
  }
  const roundWinner = getRoundWinner(room);
  battle.winnerSocketId = roundWinner;
  if (roundWinner) {
    room.seriesWins[roundWinner] = (room.seriesWins[roundWinner] ?? 0) + 1;
  }
  const requiredWins = getRequiredWins(room.settings.format);
  const maximumRounds = getMaximumRounds(room.settings.format);
  const winnerBySeries = room.players.find(
    (player) => (room.seriesWins[player.socketId] ?? 0) >= requiredWins,
  );
  const reachedRoundLimit = battle.round >= maximumRounds;
  room.seriesFinished = Boolean(winnerBySeries) || reachedRoundLimit;
  room.seriesWinnerSocketId =
    winnerBySeries?.socketId ??
    (reachedRoundLimit ? getSeriesLeader(room) : null);
  room.status = "finished";
  if (room.seriesFinished) {
    room.lastSeriesResult = {
      winnerSocketId: room.seriesWinnerSocketId,
      wins: { ...room.seriesWins },
      roundsPlayed: battle.round,
      players: room.players.map((player) => ({
        socketId: player.socketId,
        nickname: player.nickname,
      })),
    };
  }
  sendRoomUpdate(room);
  io.to(room.code).emit("battle:finished", publicRoom(room));
  if (!room.seriesFinished) {
    // Dá tempo para todos os participantes verem o resultado da rodada.
    const timer = setTimeout(() => {
      const currentRoom = rooms.get(room.code);
      if (
        currentRoom &&
        currentRoom.status === "finished" &&
        !currentRoom.seriesFinished &&
        currentRoom.players.length === currentRoom.settings.playerLimit
      ) {
        startRound(currentRoom, (currentRoom.battle?.round ?? 0) + 1);
      }
    }, 2500);
    nextRoundTimers.set(room.code, timer);
    return;
  }
  // Mantém o resultado visível por alguns segundos e retorna ao mesmo lobby.
  const lobbyTimer = setTimeout(() => {
    const currentRoom = rooms.get(room.code);
    if (!currentRoom || currentRoom.status !== "finished") return;
    currentRoom.status = "waiting";
    currentRoom.battle = null;
    currentRoom.typedTexts = {};
    currentRoom.seriesWins = Object.fromEntries(
      currentRoom.players.map((player) => [player.socketId, 0]),
    );
    currentRoom.seriesWinnerSocketId = null;
    currentRoom.seriesFinished = false;
    for (const player of currentRoom.players) {
      Object.assign(player, initialScore());
    }
    // lastSeriesResult é preservado para exibir o último resultado no lobby.
    sendRoomUpdate(currentRoom);
    lobbyTimers.delete(room.code);
  }, 6000);
  lobbyTimers.set(room.code, lobbyTimer);
}
function startRound(room: BattleRoom, round: number): boolean {
  if (room.players.length !== room.settings.playerLimit) return false;
  clearTimers(room.code);
  room.status = "countdown";
  room.typedTexts = {};
  for (const player of room.players) {
    Object.assign(player, initialScore());
    room.typedTexts[player.socketId] = "";
  }
  room.battle = {
    round,
    text: makeText(room.settings),
    countdownEndsAt: Date.now() + 3000,
    startedAt: null,
    endsAt: null,
    winnerSocketId: null,
  };
  sendRoomUpdate(room);
  io.to(room.code).emit("battle:countdown", {
    startsAt: room.battle.countdownEndsAt,
  });
  const countdownTimer = setTimeout(() => {
    const currentRoom = rooms.get(room.code);
    if (
      !currentRoom ||
      currentRoom.status !== "countdown" ||
      !currentRoom.battle
    ) {
      return;
    }
    const now = Date.now();
    currentRoom.status = "playing";
    currentRoom.battle.startedAt = now;
    currentRoom.battle.endsAt = now + currentRoom.settings.duration * 1000;
    currentRoom.battle.countdownEndsAt = null;
    sendRoomUpdate(currentRoom);
    io.to(currentRoom.code).emit("battle:started", {
      startedAt: now,
      endsAt: currentRoom.battle.endsAt,
      duration: currentRoom.settings.duration,
      text: currentRoom.battle.text,
    });
    const finishTimer = setTimeout(() => {
      const roomToFinish = rooms.get(currentRoom.code);
      if (roomToFinish) finishBattle(roomToFinish);
    }, currentRoom.settings.duration * 1000);
    finishTimers.set(currentRoom.code, finishTimer);
    countdownTimers.delete(currentRoom.code);
  }, 3000);
  countdownTimers.set(room.code, countdownTimer);
  return true;
}
function startBattle(room: BattleRoom): boolean {
  if (
    room.status !== "waiting" ||
    room.players.length !== room.settings.playerLimit
  ) {
    return false;
  }
  room.seriesWins = Object.fromEntries(
    room.players.map((player) => [player.socketId, 0]),
  );
  room.seriesWinnerSocketId = null;
  room.seriesFinished = false;
  room.lastSeriesResult = null;
  return startRound(room, 1);
}
// Rotas HTTP existentes.
app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    message: "TypeBattle API funcionando!",
  });
});
app.get("/api/db-test", async (_request, response) => {
  try {
    await db.orm.public.User.all();
    response.json({
      status: "ok",
      message: "Conexão com PostgreSQL funcionando!",
    });
  } catch (error) {
    console.error(error);
    response.status(500).json({
      status: "error",
      message: "Erro ao conectar com PostgreSQL.",
    });
  }
});
app.get("/api/auth/me", authMiddleware, (request, response) => {
  response.json({
    message: "Token válido!",
    user: request.user,
  });
});
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/typing-results", typingResultRoutes);
// Eventos multiplayer.
io.on("connection", (socket) => {
  console.log(`Socket conectado: ${socket.id}`);
  socket.on(
    "room:create",
    (payload: { nickname: string; settings: RoomSettings }) => {
      const nickname = sanitizeNickname(payload?.nickname);
      if (!nickname) {
        socket.emit("room:error", "Informe um nick válido.");
        return;
      }
      if (!isValidSettings(payload?.settings)) {
        socket.emit("room:error", "As configurações da sala são inválidas.");
        return;
      }
      removePlayerFromRoom(socket);
      const code = generateRoomCode();
      const room: BattleRoom = {
        code,
        hostSocketId: socket.id,
        players: [makePlayer(socket.id, nickname)],
        settings: normalizeRoomSettings(payload.settings),
        status: "waiting",
        battle: null,
        typedTexts: {},
        seriesWins: { [socket.id]: 0 },
        seriesWinnerSocketId: null,
        seriesFinished: false,
        lastSeriesResult: null,
      };
      rooms.set(code, room);
      socket.join(code);
      socket.data.roomCode = code;
      socket.emit("room:created", publicRoom(room));
      sendRoomUpdate(room);
    },
  );
  socket.on("room:join", (payload: { code: string; nickname: string }) => {
    const code = String(payload?.code ?? "")
      .trim()
      .toUpperCase();
    const nickname = sanitizeNickname(payload?.nickname);
    const room = rooms.get(code);
    if (!nickname) {
      socket.emit("room:error", "Informe um nick válido.");
      return;
    }
    if (!room) {
      socket.emit("room:error", "Sala não encontrada ou encerrada.");
      return;
    }
    if (room.status !== "waiting") {
      socket.emit("room:error", "Esta sala não está aceitando jogadores.");
      return;
    }
    if (room.players.some((player) => player.socketId === socket.id)) {
      socket.emit("room:joined", publicRoom(room));
      return;
    }
    if (room.players.length >= room.settings.playerLimit) {
      socket.emit("room:error", "Esta sala já está cheia.");
      return;
    }
    removePlayerFromRoom(socket);
    room.players.push(makePlayer(socket.id, nickname));
    room.seriesWins[socket.id] = 0;
    socket.join(code);
    socket.data.roomCode = code;
    socket.emit("room:joined", publicRoom(room));
    sendRoomUpdate(room);
  });
  socket.on("room:update-settings", (payload: { settings: RoomSettings }) => {
    const code = socket.data.roomCode as string | undefined;
    const room = code ? rooms.get(code) : undefined;
    if (!room || room.hostSocketId !== socket.id) {
      socket.emit(
        "room:error",
        "Somente quem criou a sala pode alterar as configurações.",
      );
      return;
    }
    if (room.status !== "waiting" || !isValidSettings(payload?.settings)) {
      socket.emit("room:error", "Não foi possível atualizar as configurações.");
      return;
    }
    const nextSettings = normalizeRoomSettings(payload.settings);
    if (nextSettings.playerLimit < room.players.length) {
      socket.emit(
        "room:error",
        "A capacidade não pode ser menor que a quantidade atual de jogadores.",
      );
      return;
    }
    room.settings = nextSettings;
    sendRoomUpdate(room);
  });
  socket.on("battle:start", () => {
    const code = socket.data.roomCode as string | undefined;
    const room = code ? rooms.get(code) : undefined;
    if (!room) {
      socket.emit("room:error", "Você não está em uma sala.");
      return;
    }
    if (room.hostSocketId !== socket.id) {
      socket.emit("room:error", "Somente o anfitrião pode iniciar a partida.");
      return;
    }
    if (room.players.length !== room.settings.playerLimit) {
      socket.emit(
        "room:error",
        `É necessário ter ${room.settings.playerLimit} jogadores para iniciar.`,
      );
      return;
    }
    if (!startBattle(room)) {
      socket.emit("room:error", "A partida não pode ser iniciada agora.");
    }
  });
  socket.on("battle:progress", (payload: { typedText: string }) => {
    const code = socket.data.roomCode as string | undefined;
    const room = code ? rooms.get(code) : undefined;
    if (!room || room.status !== "playing" || room.battle?.startedAt == null) {
      return;
    }
    if (!room.players.some((player) => player.socketId === socket.id)) {
      return;
    }
    const target = room.battle.text;
    const typedText =
      typeof payload?.typedText === "string"
        ? payload.typedText.slice(0, target.length + 100)
        : "";
    room.typedTexts[socket.id] = typedText;
    const elapsed = Math.min(
      Date.now() - room.battle.startedAt,
      room.settings.duration * 1000,
    );
    const player = room.players.find((item) => item.socketId === socket.id);
    if (player) {
      Object.assign(player, calculateScore(typedText, target, elapsed));
    }
    sendRoomUpdate(room);
  });
  socket.on("room:leave", () => {
    removePlayerFromRoom(socket);
  });
  socket.on("disconnect", () => {
    console.log(`Socket desconectado: ${socket.id}`);
    removePlayerFromRoom(socket);
  });
});
function removePlayerFromRoom(socket: Socket) {
  const code = socket.data.roomCode as string | undefined;
  if (!code) return;
  const room = rooms.get(code);
  socket.leave(code);
  socket.data.roomCode = undefined;
  if (!room) return;
  room.players = room.players.filter((player) => player.socketId !== socket.id);
  delete room.typedTexts[socket.id];
  delete room.seriesWins[socket.id];
  if (room.players.length === 0) {
    clearTimers(code);
    rooms.delete(code);
    return;
  }
  // Cancela a série se alguém sair antes ou durante o resultado.
  if (room.status !== "waiting") {
    clearTimers(code);
    room.status = "waiting";
    room.battle = null;
    room.typedTexts = {};
    room.seriesWinnerSocketId = null;
    room.seriesFinished = false;
    room.seriesWins = Object.fromEntries(
      room.players.map((player) => [player.socketId, 0]),
    );
    for (const player of room.players) {
      Object.assign(player, initialScore());
    }
  }
  if (room.hostSocketId === socket.id) {
    room.hostSocketId = room.players[0].socketId;
  }
  sendRoomUpdate(room);
}
const PORT = 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 TypeBattle API rodando em http://localhost:${PORT}`);
});
