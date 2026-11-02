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

// Palavra terminada com erro (seguiu com espaço): o perseguidor avança uma
// palavra (5 letras, a mesma medida do PPM).
export const CHASE_PENALTY_LETTERS = 5;

// Início de cada palavra que o jogador encerrou com espaço e tinha erro.
export function getWrongWordStarts(
  typedText: string,
  target: string,
): number[] {
  const starts: number[] = [];
  let wordStart = 0;

  for (let index = 0; index < typedText.length; index += 1) {
    if (target[index] !== " ") continue;

    const wrong =
      typedText[index] === " " &&
      typedText.slice(wordStart, index) !== target.slice(wordStart, index);
    if (wrong) starts.push(wordStart);
    wordStart = index + 1;
  }

  return starts;
}
