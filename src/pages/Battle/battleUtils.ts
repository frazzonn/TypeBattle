import {
  DEFAULT_SETTINGS,
  type BattleRoom,
  type MatchFormat,
  type RoomPlayer,
} from "./types";

// Uma cor fixa por posição na sala, usada no lobby, nas pistas e no resultado.
export const PLAYER_COLORS = ["#a78bfa", "#67e8f9", "#fdba74", "#86efac"];

export function getPlayerColor(room: BattleRoom, socketId: string): string {
  const index = room.players.findIndex((player) => player.socketId === socketId);
  return PLAYER_COLORS[Math.max(0, index) % PLAYER_COLORS.length];
}

export function getFormatLabel(format: MatchFormat): string {
  if (format === "best-of-3") return "Melhor de 3";
  if (format === "best-of-5") return "Melhor de 5";
  return "Partida única";
}

export function getMaximumRounds(format: MatchFormat): number {
  if (format === "best-of-3") return 3;
  if (format === "best-of-5") return 5;
  return 1;
}

export function getPlayerName(room: BattleRoom, socketId: string | null) {
  return (
    room.players.find((player) => player.socketId === socketId)?.nickname ??
    "Um jogador"
  );
}

// Mesmo critério do servidor: na perseguição, quem aguentou mais; no modo
// palavras, quem terminou primeiro; depois maior PPM e maior precisão.
export function rankPlayers(players: RoomPlayer[]): RoomPlayer[] {
  return [...players].sort((first, second) => {
    const firstCaught = first.caughtMs ?? null;
    const secondCaught = second.caughtMs ?? null;

    if (firstCaught !== secondCaught) {
      if (firstCaught === null) return -1;
      if (secondCaught === null) return 1;
      return secondCaught - firstCaught;
    }

    const firstFinish = first.finishMs ?? null;
    const secondFinish = second.finishMs ?? null;

    if (firstFinish !== secondFinish) {
      if (firstFinish === null) return 1;
      if (secondFinish === null) return -1;
      return firstFinish - secondFinish;
    }

    if (first.ppm !== second.ppm) return second.ppm - first.ppm;
    return second.accuracy - first.accuracy;
  });
}

// Formata milissegundos como m:ss, arredondando para cima.
export function formatClock(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// Segundos com uma casa decimal, no formato brasileiro (ex.: "23,4 s").
export function formatSeconds(milliseconds: number): string {
  return `${(milliseconds / 1000).toFixed(1).replace(".", ",")} s`;
}

export function buildInviteLink(code: string): string {
  return `${window.location.origin}/battle?room=${code}`;
}

export function extractRoomCode(value: string): string {
  const input = value.trim();

  try {
    const url = new URL(input, window.location.origin);
    const code = url.searchParams.get("room");

    if (code) return code.trim().toUpperCase();
  } catch {
    // O valor também pode ser somente o código da sala.
  }

  return input.toUpperCase();
}

export function getRoomFromPayload(payload: unknown): BattleRoom | null {
  if (!payload || typeof payload !== "object") return null;

  const candidate = payload as Record<string, unknown>;

  const possibleRoom =
    "room" in candidate && candidate.room && typeof candidate.room === "object"
      ? (candidate.room as Record<string, unknown>)
      : candidate;

  if (
    typeof possibleRoom.code !== "string" ||
    typeof possibleRoom.hostSocketId !== "string" ||
    !Array.isArray(possibleRoom.players)
  ) {
    return null;
  }

  return normalizeRoom(possibleRoom as unknown as BattleRoom);
}

function normalizeRoom(room: BattleRoom): BattleRoom {
  return {
    ...room,
    settings: {
      ...DEFAULT_SETTINGS,
      ...(room.settings ?? {}),
    },
    players: room.players ?? [],
  };
}

export function getErrorMessage(payload: unknown): string {
  if (typeof payload === "string") return payload;

  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;

    if (typeof message === "string") return message;
  }

  return "Ocorreu um erro. Tente novamente.";
}
