// Tipos compartilhados pelas salas de batalha.
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
