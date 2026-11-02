export type Difficulty = "easy" | "normal" | "hard";

export type MatchFormat = "single" | "best-of-3" | "best-of-5";

export type Duration = 15 | 30 | 60;

export type PlayerLimit = 2 | 3 | 4;

// Tempo: maior PPM no fim do relógio. Palavras: quem terminar o texto primeiro.
export type BattleMode = "time" | "words";

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
  // false enquanto a conexão do jogador caiu e ele ainda pode voltar.
  connected?: boolean;
  ppm: number;
  accuracy: number;
  errors: number;
  progress: number;
  // Modo palavras: ms até terminar o texto (null = não terminou).
  finishMs?: number | null;
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
