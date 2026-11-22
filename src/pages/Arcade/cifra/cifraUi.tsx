import { Box, ButtonBase } from "@mui/material";
import { keyframes } from "@mui/material/styles";
import BackspaceOutlinedIcon from "@mui/icons-material/BackspaceOutlined";
import KeyboardReturnRoundedIcon from "@mui/icons-material/KeyboardReturnRounded";

import type { CifraMark, CifraRow } from "../../../services/api";
import { MARK_COLORS, MONO_FONT, WORD_LENGTH } from "./cifraLogic";

// Peças da Cifra: casas, tabuleiro e teclado.

const KEY_IDLE = "#353a46";

const flip = keyframes`
  0% { transform: rotateX(0deg); }
  50% { transform: rotateX(90deg); }
  100% { transform: rotateX(0deg); }
`;
const pop = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.08); }
  100% { transform: scale(1); }
`;
const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-6px); }
  40%, 80% { transform: translateX(6px); }
`;
const NO_MOTION = { "@media (prefers-reduced-motion: reduce)": { animation: "none" } };

// ---------------------------------------------------------------- casas

interface TileProps {
  letter: string;
  mark?: CifraMark;
  size: number;
  // Ordem na fileira (a cor vira uma casa de cada vez).
  index: number;
  active?: boolean;
  onClick?: () => void;
}

function Tile({ letter, mark, size, index, active = false, onClick }: TileProps) {
  const colors = mark ? MARK_COLORS[mark] : null;
  return (
    <Box
      onClick={onClick}
      sx={{
        width: size,
        height: size,
        display: "grid",
        placeItems: "center",
        borderRadius: `${Math.round(size * 0.14)}px`,
        border: "2px solid",
        borderColor: colors?.border ?? (active ? "#a78bfa" : letter ? "#5d6270" : "#2e3240"),
        bgcolor: colors?.bg ?? "transparent",
        color: colors?.color ?? "#fff",
        fontFamily: MONO_FONT,
        fontWeight: 800,
        fontSize: size * 0.5,
        textTransform: "uppercase",
        userSelect: "none",
        cursor: onClick ? "pointer" : "default",
        boxShadow: active ? "0 0 0 2px rgba(167,139,250,.25)" : "none",
        animation: mark
          ? `${flip} 260ms ease ${index * 60}ms both`
          : letter
            ? `${pop} 120ms ease`
            : "none",
        ...NO_MOTION,
      }}
    >
      {letter}
    </Box>
  );
}

// ---------------------------------------------------------------- tabuleiro

interface BoardProps {
  rows: CifraRow[];
  // Qual palavra este tabuleiro mostra (0 nos modos de uma palavra só).
  board: number;
  maxAttempts: number;
  // Palpite em que foi descoberta (null = ainda não).
  solvedAt: number | null;
  // Palavra sendo digitada (só nos tabuleiros ainda abertos).
  current: string[];
  cursor: number;
  onSelect?: (index: number) => void;
  tileSize: number;
  // Muda a cada palpite recusado: a fileira atual treme de novo.
  shakeKey?: number;
  disabled?: boolean;
}

export function Board({
  rows,
  board,
  maxAttempts,
  solvedAt,
  current,
  cursor,
  onSelect,
  tileSize,
  shakeKey = 0,
  disabled = false,
}: BoardProps) {
  const gap = Math.max(4, Math.round(tileSize * 0.1));
  // Descoberta: para de receber palpites (as fileiras seguintes ficam vazias).
  const shown = solvedAt === null ? rows : rows.slice(0, solvedAt + 1);
  const typing = solvedAt === null && !disabled && rows.length < maxAttempts;

  return (
    <Box
      sx={{
        display: "grid",
        gap: `${gap}px`,
        opacity: solvedAt !== null ? 0.92 : 1,
        p: 0.75,
        borderRadius: "10px",
        outline: solvedAt !== null ? "2px solid rgba(124,77,255,.55)" : "none",
      }}
    >
      {Array.from({ length: maxAttempts }, (_, rowIndex) => {
        const row = shown[rowIndex];
        const isCurrent = typing && rowIndex === rows.length;
        return (
          <Box
            key={isCurrent ? `current-${shakeKey}` : rowIndex}
            sx={{
              display: "grid",
              gridTemplateColumns: `repeat(${WORD_LENGTH}, ${tileSize}px)`,
              gap: `${gap}px`,
              animation: isCurrent && shakeKey > 0 ? `${shake} 360ms ease` : "none",
              ...NO_MOTION,
            }}
          >
            {Array.from({ length: WORD_LENGTH }, (_, i) => {
              const marks = row?.marks[board];
              if (row && marks) {
                // A fileira que acertou mostra a palavra com acento.
                const letters = [...(row.written.length === WORD_LENGTH ? row.written : row.word)];
                return <Tile key={`m${rowIndex}-${i}`} letter={letters[i]} mark={marks[i]} size={tileSize} index={i} />;
              }
              if (isCurrent) {
                return (
                  <Tile
                    key={`t${rowIndex}-${i}`}
                    letter={current[i] ?? ""}
                    size={tileSize}
                    index={i}
                    active={i === cursor}
                    onClick={onSelect ? () => onSelect(i) : undefined}
                  />
                );
              }
              return <Tile key={`e${rowIndex}-${i}`} letter="" size={tileSize} index={i} />;
            })}
          </Box>
        );
      })}
    </Box>
  );
}

// ---------------------------------------------------------------- teclado

const KEY_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
// Fundo da tecla: uma cor por tabuleiro (metades com 2, quadrantes com 4).
function keyBackground(marks: (CifraMark | null)[] | undefined, boards: number): string {
  const color = (mark: CifraMark | null | undefined) => (mark ? MARK_COLORS[mark].bg : KEY_IDLE);
  if (!marks) return KEY_IDLE;
  if (boards === 1) return color(marks[0]);
  if (boards === 2) return `linear-gradient(90deg, ${color(marks[0])} 50%, ${color(marks[1])} 50%)`;
  return `conic-gradient(${color(marks[1])} 0 25%, ${color(marks[3])} 0 50%, ${color(marks[2])} 0 75%, ${color(marks[0])} 0)`;
}

interface KeyboardProps {
  marks: Map<string, (CifraMark | null)[]>;
  boards: number;
  onKey: (key: string) => void;
  disabled?: boolean;
}

export function Keyboard({ marks, boards, onKey, disabled = false }: KeyboardProps) {
  const keySx = {
    height: { xs: 46, sm: 52 },
    borderRadius: "8px",
    fontFamily: MONO_FONT,
    fontWeight: 700,
    fontSize: { xs: 14, sm: 16 },
    textTransform: "uppercase" as const,
    color: "#fff",
    transition: "filter 120ms ease",
    "&:hover": { filter: "brightness(1.15)" },
  };
  return (
    <Box sx={{ width: "100%", maxWidth: 520, display: "grid", gap: 0.75, opacity: disabled ? 0.5 : 1 }}>
      {KEY_ROWS.map((row, rowIndex) => (
        <Box key={row} sx={{ display: "flex", gap: 0.75, justifyContent: "center" }}>
          {rowIndex === 2 && (
            <ButtonBase
              aria-label="Apagar"
              disabled={disabled}
              onClick={() => onKey("Backspace")}
              sx={{ ...keySx, flex: 1.5, bgcolor: KEY_IDLE }}
            >
              <BackspaceOutlinedIcon fontSize="small" />
            </ButtonBase>
          )}
          {[...row].map((letter) => {
            const letterMarks = marks.get(letter);
            const allAbsent = letterMarks?.every((mark) => mark === "absent");
            return (
              <ButtonBase
                key={letter}
                disabled={disabled}
                onClick={() => onKey(letter)}
                sx={{
                  ...keySx,
                  flex: 1,
                  minWidth: 0,
                  background: keyBackground(letterMarks, boards),
                  color: allAbsent ? "#6b6f80" : "#fff",
                  textShadow: boards > 1 ? "0 1px 2px rgba(0,0,0,.6)" : "none",
                }}
              >
                {letter}
              </ButtonBase>
            );
          })}
          {rowIndex === 2 && (
            <ButtonBase
              aria-label="Enviar"
              disabled={disabled}
              onClick={() => onKey("Enter")}
              sx={{ ...keySx, flex: 1.5, bgcolor: "#7c4dff" }}
            >
              <KeyboardReturnRoundedIcon fontSize="small" />
            </ButtonBase>
          )}
        </Box>
      ))}
    </Box>
  );
}

