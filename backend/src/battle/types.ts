// Tipos compartilhados pelas salas de batalha.
export type Difficulty = "easy" | "normal" | "hard";
export type MatchFormat = "single" | "best-of-3" | "best-of-5";
export type Duration = 15 | 30 | 60;
// O Pavio aceita até 8; os outros modos, até 4.
export type PlayerLimit = 2 | 3 | 4 | 5 | 6 | 7 | 8;
// Tempo: maior PPM no fim do relógio. Palavras: quem terminar o texto primeiro.
// Perseguição: um cursor alcança um por um; quem sobrar por último vence.
// Pavio: a bomba passa de mão em mão; cada um digita uma palavra com a sílaba.
export type BattleMode = "time" | "words" | "chase" | "pavio";
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
