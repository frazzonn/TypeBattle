import { randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import type { Server, Socket } from "socket.io";

import { db } from "../prisma/db.js";

import {
  DEFAULT_LANGUAGE,
  isLanguageCode,
  makeText,
} from "../battle/textGenerator.js";
import type {
  MatchFormat,
  RoomSettings,
  RoomStatus,
  WordCount,
} from "../battle/types.js";

// Aceita clientes antigos sem playerLimit, language ou modo e usa os padrões.
type RoomSettingsInput = Omit<
  RoomSettings,
  "playerLimit" | "language" | "mode" | "wordCount"
> & {
  playerLimit?: unknown;
  language?: string;
  mode?: unknown;
  wordCount?: unknown;
};
interface PlayerScore {
  ppm: number;
  accuracy: number;
  errors: number;
  progress: number;
  // Modo palavras: ms desde o início até terminar o texto (null = não terminou).
  finishMs: number | null;
}
const WORD_COUNTS: WordCount[] = [10, 25, 50, 100];
interface RoomPlayer extends PlayerScore {
  socketId: string;
  nickname: string;
  isGuest: boolean;
  avatarUrl: string | null;
  // false enquanto a conexão caiu e o jogador ainda pode voltar.
  connected: boolean;
}
interface PlayerAccount {
  isGuest: boolean;
  avatarUrl: string | null;
  userId: number | null;
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
  // Conta de cada jogador logado (por socket id). Não vai para os clientes.
  userIds: Record<string, number>;
}
const rooms = new Map<string, BattleRoom>();
const countdownTimers = new Map<string, ReturnType<typeof setTimeout>>();
const finishTimers = new Map<string, ReturnType<typeof setTimeout>>();
const nextRoundTimers = new Map<string, ReturnType<typeof setTimeout>>();
// Jogadores que perderam a conexão e ainda podem voltar (por socket id).
const reconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
// Mesmo valor de connectionStateRecovery.maxDisconnectionDuration (server.ts).
const RECONNECT_GRACE_MS = 20_000;
const lobbyTimers = new Map<string, ReturnType<typeof setTimeout>>();
// Instância do Socket.IO, definida em registerBattleSocket.
let io: Server;
function generateRoomCode(): string {
  let code: string;
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
    (settings.language === undefined || isLanguageCode(settings.language)) &&
    typeof settings.accents === "boolean" &&
    typeof settings.uppercase === "boolean" &&
    typeof settings.punctuation === "boolean" &&
    [15, 30, 60].includes(Number(settings.duration)) &&
    (settings.mode === undefined ||
      ["time", "words"].includes(String(settings.mode))) &&
    (settings.wordCount === undefined ||
      WORD_COUNTS.includes(Number(settings.wordCount) as WordCount)) &&
    ["single", "best-of-3", "best-of-5"].includes(String(settings.format)) &&
    (settings.playerLimit === undefined ||
      [2, 3, 4].includes(Number(settings.playerLimit)))
  );
}
function normalizeRoomSettings(settings: RoomSettingsInput): RoomSettings {
  const limit = Number(settings.playerLimit);
  const wordCount = Number(settings.wordCount) as WordCount;
  return {
    difficulty: settings.difficulty,
    language: settings.language ?? DEFAULT_LANGUAGE,
    accents: settings.accents,
    uppercase: settings.uppercase,
    punctuation: settings.punctuation,
    mode: settings.mode === "words" ? "words" : "time",
    duration: settings.duration,
    wordCount: WORD_COUNTS.includes(wordCount) ? wordCount : 25,
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
    finishMs: null,
  };
}
// Tempo máximo da rodada. No modo palavras é um limite de segurança para
// quando ninguém termina: 3 s por palavra, no mínimo 1 minuto.
function getRoundLimitMs(settings: RoomSettings): number {
  if (settings.mode === "words") {
    return Math.max(60, settings.wordCount * 3) * 1000;
  }
  return settings.duration * 1000;
}
function makePlayer(
  socketId: string,
  nickname: string,
  account: PlayerAccount,
): RoomPlayer {
  return {
    socketId,
    nickname,
    isGuest: account.isGuest,
    avatarUrl: account.avatarUrl,
    connected: true,
    ...initialScore(),
  };
}
const GUEST: PlayerAccount = { isGuest: true, avatarUrl: null, userId: null };
// Quem está logado manda o token; a foto vem do banco, nunca do cliente.
// Token ausente, inválido ou expirado entra como convidado.
async function getPlayerAccount(token: unknown): Promise<PlayerAccount> {
  const jwtSecret = process.env["JWT_SECRET"];
  if (typeof token !== "string" || !token || !jwtSecret) return GUEST;
  try {
    const { userId } = jwt.verify(token, jwtSecret) as { userId: number };
    const user = await db.orm.public.User.select("avatarUrl").first({
      id: userId,
    });
    if (!user) return GUEST;
    return { isGuest: false, avatarUrl: user.avatarUrl ?? null, userId };
  } catch {
    return GUEST;
  }
}
// Não envia os textos digitados nem as contas dos jogadores para os clientes.
function publicRoom(room: BattleRoom) {
  const { typedTexts: _typedTexts, userIds: _userIds, ...safeRoom } = room;
  return safeRoom;
}
// Ordem da rodada: no modo palavras, quem terminou primeiro na frente; depois
// mais PPM e, empatando, maior precisão.
function rankByScore(players: RoomPlayer[]): RoomPlayer[] {
  return [...players].sort((first, second) => {
    if (first.finishMs !== second.finishMs) {
      if (first.finishMs === null) return 1;
      if (second.finishMs === null) return -1;
      return first.finishMs - second.finishMs;
    }
    if (first.ppm !== second.ppm) return second.ppm - first.ppm;
    return second.accuracy - first.accuracy;
  });
}
// Guarda no histórico de quem está logado o resultado oficial da rodada.
// Roda em segundo plano: uma falha no banco não atrapalha a partida.
function saveRoundResults(
  room: BattleRoom,
  roundWinner: string | null,
  elapsedMs: number,
) {
  const ranked = rankByScore(room.players);
  const rows = ranked.flatMap((player, index) => {
    const userId = room.userIds[player.socketId];
    if (userId === undefined) return [];
    return [
      {
        userId,
        won: player.socketId === roundWinner,
        placement: index + 1,
        players: ranked.length,
        ppm: player.ppm,
        accuracy: Math.round(player.accuracy),
        errors: player.errors,
        // No modo palavras, quanto tempo o jogador levou.
        duration:
          room.settings.mode === "words"
            ? Math.max(1, Math.round((player.finishMs ?? elapsedMs) / 1000))
            : room.settings.duration,
        language: room.settings.language,
      },
    ];
  });
  if (rows.length === 0) return;
  void Promise.all(
    rows.map((row) => db.orm.public.BattleResult.create(row)),
  ).catch((error: unknown) => {
    console.error("ERRO AO SALVAR RESULTADO DA BATTLE:", error);
  });
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
// No modo palavras o progresso vai só até a primeira letra errada.
function calculateScore(
  typedText: string,
  target: string,
  elapsedMs: number,
  progressUntilFirstError = false,
): Omit<PlayerScore, "finishMs"> {
  let correct = 0;
  let errors = 0;
  let correctPrefix = 0;
  for (let index = 0; index < typedText.length; index += 1) {
    if (index < target.length && typedText[index] === target[index]) {
      correct += 1;
      if (errors === 0) correctPrefix += 1;
    } else {
      errors += 1;
    }
  }
  const accuracy =
    typedText.length > 0 ? (correct / typedText.length) * 100 : 0;
  const minutes = Math.max(elapsedMs, 1000) / 60000;
  const ppm = Math.round(correct / 5 / minutes);
  const advanced = progressUntilFirstError ? correctPrefix : typedText.length;
  const progress =
    target.length > 0
      ? Math.min(100, Math.round((advanced / target.length) * 100))
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
  const rankedPlayers = rankByScore(room.players);
  const first = rankedPlayers[0];
  const second = rankedPlayers[1];
  if (!first) return null;
  if (!second) return first.socketId;
  // Modo palavras: quem terminou o texto primeiro vence.
  if (first.finishMs !== null) return first.socketId;
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
  const elapsed = Math.min(
    Date.now() - startedAt,
    getRoundLimitMs(room.settings),
  );
  // Recalcula os resultados no servidor, evitando confiar só no navegador.
  // Quem terminou o texto tem o PPM medido até a hora em que terminou.
  for (const player of room.players) {
    Object.assign(
      player,
      calculateScore(
        room.typedTexts[player.socketId] ?? "",
        battle.text,
        player.finishMs ?? elapsed,
        room.settings.mode === "words",
      ),
    );
  }
  const roundWinner = getRoundWinner(room);
  battle.winnerSocketId = roundWinner;
  saveRoundResults(room, roundWinner, elapsed);
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
    const limit = getRoundLimitMs(currentRoom.settings);
    currentRoom.battle.endsAt = now + limit;
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
    }, limit);
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
// Eventos multiplayer.
export function registerBattleSocket(server: Server) {
  io = server;
  io.on("connection", (socket) => {
    console.log(`Socket conectado: ${socket.id}`);
    // Voltou dentro do prazo: mesmo id, mesma sala; só marca como conectado.
    if (socket.recovered) restoreReconnectedPlayer(socket);
    socket.on(
      "room:create",
      async (payload: {
        nickname: string;
        settings: RoomSettings;
        token?: string;
      }) => {
        const nickname = sanitizeNickname(payload?.nickname);
        if (!nickname) {
          socket.emit("room:error", "Informe um nick válido.");
          return;
        }
        if (!isValidSettings(payload?.settings)) {
          socket.emit("room:error", "As configurações da sala são inválidas.");
          return;
        }
        const account = await getPlayerAccount(payload?.token);
        // A conexão pode ter caído enquanto buscava a conta.
        if (!socket.connected) return;
        removePlayerFromRoom(socket);
        const code = generateRoomCode();
        const room: BattleRoom = {
          code,
          hostSocketId: socket.id,
          players: [makePlayer(socket.id, nickname, account)],
          settings: normalizeRoomSettings(payload.settings),
          status: "waiting",
          battle: null,
          typedTexts: {},
          seriesWins: { [socket.id]: 0 },
          userIds: account.userId === null ? {} : { [socket.id]: account.userId },
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
    socket.on(
      "room:join",
      async (payload: { code: string; nickname: string; token?: string }) => {
        const code = String(payload?.code ?? "")
          .trim()
          .toUpperCase();
        const nickname = sanitizeNickname(payload?.nickname);
        if (!nickname) {
          socket.emit("room:error", "Informe um nick válido.");
          return;
        }
        const account = await getPlayerAccount(payload?.token);
        if (!socket.connected) return;
        // Busca a sala depois da conta: ela pode ter mudado durante a espera.
        const room = rooms.get(code);
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
        room.players.push(makePlayer(socket.id, nickname, account));
        room.seriesWins[socket.id] = 0;
        if (account.userId !== null) room.userIds[socket.id] = account.userId;
        socket.join(code);
        socket.data.roomCode = code;
        socket.emit("room:joined", publicRoom(room));
        sendRoomUpdate(room);
      },
    );
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
      if (room.players.some((player) => !player.connected)) {
        socket.emit("room:error", "Aguarde todos os jogadores reconectarem.");
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
      const isWordsMode = room.settings.mode === "words";
      // No modo palavras não há o que digitar depois do fim do texto.
      const typedText =
        typeof payload?.typedText === "string"
          ? payload.typedText.slice(0, target.length + (isWordsMode ? 0 : 100))
          : "";
      room.typedTexts[socket.id] = typedText;
      const elapsed = Math.min(
        Date.now() - room.battle.startedAt,
        getRoundLimitMs(room.settings),
      );
      const player = room.players.find((item) => item.socketId === socket.id);
      if (player) {
        Object.assign(
          player,
          calculateScore(typedText, target, elapsed, isWordsMode),
        );
        // Terminou o texto sem nenhum erro restante: vence e a rodada acaba.
        if (isWordsMode && typedText === target) {
          player.finishMs = elapsed;
          finishBattle(room);
          return;
        }
      }
      sendRoomUpdate(room);
    });
    socket.on("room:leave", () => {
      removePlayerFromRoom(socket);
    });
    socket.on("disconnect", (reason) => {
      console.log(`Socket desconectado: ${socket.id} (${reason})`);
      // Fechou a aba ou saiu de propósito: remove na hora.
      if (
        reason === "client namespace disconnect" ||
        reason === "server namespace disconnect"
      ) {
        removePlayerFromRoom(socket);
        return;
      }
      holdPlayerForReconnect(socket);
    });
  });
}
// Conexão caiu (rede, celular trocou de app): mantém o jogador na sala por
// alguns segundos para ele poder voltar sem perder o lugar nem o placar.
function holdPlayerForReconnect(socket: Socket) {
  const code = socket.data.roomCode as string | undefined;
  const room = code ? rooms.get(code) : undefined;
  const player = room?.players.find((item) => item.socketId === socket.id);
  if (!code || !room || !player) return;
  player.connected = false;
  sendRoomUpdate(room);
  const socketId = socket.id;
  clearTimer(reconnectTimers, socketId);
  reconnectTimers.set(
    socketId,
    setTimeout(() => {
      reconnectTimers.delete(socketId);
      removePlayer(code, socketId);
    }, RECONNECT_GRACE_MS),
  );
}
function restoreReconnectedPlayer(socket: Socket) {
  clearTimer(reconnectTimers, socket.id);
  const code = socket.data.roomCode as string | undefined;
  const room = code ? rooms.get(code) : undefined;
  const player = room?.players.find((item) => item.socketId === socket.id);
  if (!room || !player) return;
  player.connected = true;
  sendRoomUpdate(room);
}
function removePlayerFromRoom(socket: Socket) {
  const code = socket.data.roomCode as string | undefined;
  if (!code) return;
  clearTimer(reconnectTimers, socket.id);
  socket.leave(code);
  socket.data.roomCode = undefined;
  removePlayer(code, socket.id);
}
function removePlayer(code: string, socketId: string) {
  const room = rooms.get(code);
  if (!room) return;
  if (!room.players.some((player) => player.socketId === socketId)) return;
  room.players = room.players.filter((player) => player.socketId !== socketId);
  delete room.typedTexts[socketId];
  delete room.seriesWins[socketId];
  delete room.userIds[socketId];
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
  if (room.hostSocketId === socketId) {
    room.hostSocketId = room.players[0].socketId;
  }
  sendRoomUpdate(room);
}
