import type { TypingResult } from "../../services/api";

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}

function best(values: number[]) {
  return values.length > 0 ? Math.max(...values) : 0;
}

export function formatTypingTime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) return `${hours}h ${minutes}min`;
  if (minutes > 0) return `${minutes}min ${remainingSeconds}s`;
  return `${remainingSeconds}s`;
}

// Calcula os números exibidos no perfil a partir do histórico.
export function getProfileStats(results: TypingResult[]) {
  const ppms = results.map((result) => result.ppm);
  const accuracies = results.map((result) => result.accuracy);

  return {
    bestPpm: best(ppms),
    averagePpm: average(ppms),
    averageAccuracy: average(accuracies),
    bestAccuracy: best(accuracies),
    totalTests: results.length,
    totalCharacters: results.reduce(
      (total, result) => total + result.characters,
      0,
    ),
    totalTypingSeconds: results.reduce(
      (total, result) => total + result.duration,
      0,
    ),
  };
}

export function getDurationStats(results: TypingResult[], duration: number) {
  const ppms = results
    .filter((result) => result.duration === duration)
    .map((result) => result.ppm);

  return {
    tests: ppms.length,
    bestPpm: best(ppms),
    averagePpm: average(ppms),
  };
}
