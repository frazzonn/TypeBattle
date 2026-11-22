import { useCallback, useEffect, useEffectEvent, useState } from "react";

import type { CifraMark, CifraRow } from "../../../services/api";

// Regras e constantes da Cifra usadas pelos componentes (cifraUi.tsx e Cifra.tsx).

export const WORD_LENGTH = 5;
export const MONO_FONT = "'JetBrains Mono', ui-monospace, monospace";
export const MUTED = "#a0a4ad";

// Cores das dicas: roxo = letra no lugar certo, âmbar = existe em outro lugar.
export const MARK_COLORS: Record<CifraMark, { bg: string; border: string; color: string }> = {
  correct: { bg: "#7c4dff", border: "#7c4dff", color: "#fff" },
  present: { bg: "#d9a227", border: "#d9a227", color: "#1a1408" },
  absent: { bg: "#23262e", border: "#23262e", color: "#6b6f80" },
};

const RANK: Record<CifraMark, number> = { absent: 1, present: 2, correct: 3 };

// Melhor dica de cada letra em cada tabuleiro ainda aberto.
export function keyMarks(rows: CifraRow[], boards: number, solvedAt: (number | null)[]) {
  const result = new Map<string, (CifraMark | null)[]>();
  rows.forEach((row) => {
    row.marks.forEach((marks, board) => {
      if (!marks) return;
      [...row.word].forEach((letter, i) => {
        const list = result.get(letter) ?? Array.from({ length: boards }, () => null);
        const previous = list[board];
        if (!previous || RANK[marks[i]] > RANK[previous]) list[board] = marks[i];
        result.set(letter, list);
      });
    });
  });
  // Tabuleiro descoberto não ajuda mais: a tecla mostra só os abertos.
  for (const list of result.values()) {
    solvedAt.forEach((value, board) => {
      if (value !== null) list[board] = null;
    });
  }
  return result;
}


// ---------------------------------------------------------------- digitação

// Letra digitada sem acento ("ç" vira "c", "á" vira "a").
function toLetter(key: string): string | null {
  if (key.length !== 1) return null;
  const letter = key.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  return /^[a-z]$/.test(letter) ? letter : null;
}

// Palavra sendo montada: dá para clicar numa casa e trocar só aquela letra.
// onSubmit devolve true quando o palpite foi aceito (aí a fileira é limpa).
export function useWordInput(onSubmit: (word: string) => Promise<boolean>, enabled: boolean) {
  const [letters, setLetters] = useState<string[]>(() => Array.from({ length: WORD_LENGTH }, () => ""));
  const [cursor, setCursor] = useState(0);

  const clear = useCallback(() => {
    setLetters(Array.from({ length: WORD_LENGTH }, () => ""));
    setCursor(0);
  }, []);

  const press = useCallback(
    (key: string) => {
      if (!enabled) return;
      if (key === "Enter") {
        if (letters.every(Boolean)) {
          void onSubmit(letters.join("")).then((accepted) => {
            if (accepted) clear();
          });
        }
        return;
      }
      if (key === "Backspace") {
        const next = [...letters];
        if (next[cursor]) {
          next[cursor] = "";
          setLetters(next);
        } else if (cursor > 0) {
          next[cursor - 1] = "";
          setLetters(next);
          setCursor(cursor - 1);
        }
        return;
      }
      if (key === "ArrowLeft") return setCursor(Math.max(0, cursor - 1));
      if (key === "ArrowRight") return setCursor(Math.min(WORD_LENGTH - 1, cursor + 1));
      // Espaço pula para a próxima casa; da última, volta para a primeira.
      if (key === " ") return setCursor((cursor + 1) % WORD_LENGTH);
      const letter = toLetter(key);
      if (!letter) return;
      const next = [...letters];
      next[cursor] = letter;
      setLetters(next);
      // Vai para a próxima casa vazia (ou fica na última).
      const empty = next.findIndex((value, i) => i > cursor && !value);
      setCursor(empty >= 0 ? empty : Math.min(WORD_LENGTH - 1, cursor + 1));
    },
    [enabled, letters, cursor, onSubmit, clear],
  );

  // Teclado físico (ignora atalhos e campos de texto da página).
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target as HTMLElement | null;
    if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
    if (
      event.key === "Enter" ||
      event.key === "Backspace" ||
      event.key === " " ||
      event.key.startsWith("Arrow") ||
      toLetter(event.key)
    ) {
      event.preventDefault();
      press(event.key);
    }
  });
  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return { letters, cursor, setCursor, press, clear };
}

// "1:05" a partir de milissegundos.
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
