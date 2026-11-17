import type { Tag } from "../../services/api";

export type Difficulty = "easy" | "normal" | "hard";

export type MatchFormat = "single" | "best-of-3" | "best-of-5";

export type Duration = 15 | 30 | 60;

// O Pavio aceita até 8; os outros modos, até 4.
export type PlayerLimit = 2 | 3 | 4 | 5 | 6 | 7 | 8;

// Tempo: maior PPM no fim do relógio. Palavras: quem terminar o texto primeiro.
// Perseguição: um cursor alcança um por um; quem sobrar por último vence.
// Pavio: a bomba passa de mão em mão; quem ficar sem vidas sai.
export type BattleMode = "time" | "words" | "chase" | "pavio";

export type PavioRejection = "short" | "letters" | "missing" | "used" | "unknown";

// Estado público do Pavio (o tempo do pavio fica escondido no servidor).
export interface PavioState {
  syllable: string | null;
  turnSocketId: string | null;
  lives: Record<string, number>;
  words: Record<string, number>;
  eliminated: string[];
  bombStartedAt: number | null;
  wordsPlayed: number;
  lastWord: { socketId: string; word: string } | null;
  explosion: { socketId: string; syllable: string; examples: string[]; at: number } | null;
}

export type WordCount = 10 | 25 | 50 | 100;

export type RoomStatus = "waiting" | "countdown" | "playing" | "finished";

export interface RoomSettings {
  difficulty: Difficulty;
  language: string;
  accents: boolean;
  uppercase: boolean;
  punctuation: boolean;
  mode: BattleMode;
  duration: Duration;
  wordCount: WordCount;
  format: MatchFormat;
  playerLimit: PlayerLimit;
}

export interface RoomPlayer {
  socketId: string;
  nickname: string;
  isGuest?: boolean;
  avatarUrl?: string | null;
  // Tags da conta (o servidor busca no banco; convidados não têm).
  tags?: Tag[];
  // false enquanto a conexão do jogador caiu e ele ainda pode voltar.
  connected?: boolean;
  ppm: number;
  accuracy: number;
  errors: number;
  progress: number;
  // Modo palavras: ms até terminar o texto (null = não terminou).
  finishMs?: number | null;
  // Perseguição: ms até ser alcançado (null = ainda na disputa).
  caughtMs?: number | null;
  // Perseguição: letras extras do perseguidor pelas palavras erradas.
  chasePenalty?: number;
}

export interface BattleState {
  round: number;
  text: string;
  countdownEndsAt: number | null;
  startedAt: number | null;
  endsAt: number | null;
  winnerSocketId: string | null;
}

export interface SeriesResult {
  winnerSocketId: string | null;
  wins: Record<string, number>;
  roundsPlayed: number;
  players: Array<{ socketId: string; nickname: string }>;
}

export interface BattleRoom {
  code: string;
  hostSocketId: string;
  players: RoomPlayer[];
  settings: RoomSettings;
  status: RoomStatus;
  battle: BattleState | null;
  seriesWins?: Record<string, number>;
  seriesWinnerSocketId?: string | null;
  seriesFinished?: boolean;
  lastSeriesResult?: SeriesResult | null;
  pavio?: PavioState | null;
}

export const DEFAULT_SETTINGS: RoomSettings = {
  difficulty: "easy",
  language: "portuguese",
  accents: true,
  uppercase: false,
  punctuation: false,
  mode: "time",
  duration: 30,
  wordCount: 25,
  format: "single",
  playerLimit: 2,
};
