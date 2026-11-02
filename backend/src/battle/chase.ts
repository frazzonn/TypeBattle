// Modo perseguição: mesma conta do teste solo (src/hooks/useTypingTest.ts).
// O perseguidor espera 2 s, sai a 20 PPM e acelera 1,5 PPM por segundo.
export const CHASE_DELAY_MS = 2000;
const CHASE_START_PPM = 20;
const CHASE_ACCELERATION = 1.5;

// Quantas letras o perseguidor já andou (1 palavra = 5 letras).
export function getChaserPosition(milliseconds: number): number {
  const seconds = Math.max(0, milliseconds - CHASE_DELAY_MS) / 1000;
  const words =
    (CHASE_START_PPM * seconds + (CHASE_ACCELERATION * seconds ** 2) / 2) / 60;
  return words * 5;
}

// Posição do jogador: letras certas desde o começo, até o primeiro erro.
export function getCorrectPrefix(typedText: string, target: string): number {
  let prefix = 0;
  while (prefix < typedText.length && typedText[prefix] === target[prefix]) {
    prefix += 1;
  }
  return prefix;
}
