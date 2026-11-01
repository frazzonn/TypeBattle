import { memo, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Box, Typography } from "@mui/material";
import KeyboardCapslockRoundedIcon from "@mui/icons-material/KeyboardCapslockRounded";

interface TypingTextProps {
  text: string;
  input: string;
  isStarted: boolean;
  onInputChange: (value: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

interface WordChunk {
  start: number;
  text: string;
}

interface WordProps {
  text: string;
  typed: string;
  caretIndex: number;
  caretRef: React.RefObject<HTMLSpanElement | null>;
}

// Quebra o texto em palavras, cada uma com os espaços que vêm depois.
function splitWords(text: string): WordChunk[] {
  const chunks: WordChunk[] = [];
  let start = 0;

  for (let index = 1; index <= text.length; index += 1) {
    const endsWord =
      index === text.length || (text[index] !== " " && text[index - 1] === " ");

    if (endsWord) {
      chunks.push({ start, text: text.slice(start, index) });
      start = index;
    }
  }

  return chunks;
}

// Só a palavra que está sendo digitada muda a cada tecla; as outras
// recebem as mesmas props e não renderizam de novo.
const Word = memo(function Word({
  text,
  typed,
  caretIndex,
  caretRef,
}: WordProps) {
  return (
    <span>
      {text.split("").map((character, index) => {
        const status =
          index >= typed.length
            ? ""
            : typed[index] === character
              ? " ok"
              : " err";

        return (
          <span
            key={index}
            ref={index === caretIndex ? caretRef : null}
            className={`ch${status}`}
          >
            {character}
          </span>
        );
      })}
    </span>
  );
});

function TypingTextComponent({
  text,
  input,
  isStarted,
  onInputChange,
  inputRef,
}: TypingTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textContentRef = useRef<HTMLDivElement>(null);
  const currentCharacterRef = useRef<HTMLSpanElement>(null);
  const caretRef = useRef<HTMLDivElement>(null);
  const caretPlacedRef = useRef(false);
  const targetScrollOffsetRef = useRef(0);

  const words = useMemo(() => splitWords(text), [text]);

  const [scrollOffset, setScrollOffset] = useState(0);
  const [hasFocused, setHasFocused] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);

  // Restaura a posição inicial quando o teste é reiniciado
  // (ajuste de estado durante a renderização, sem efeito extra).
  const isReset = input.length === 0 && !isStarted;
  const [wasReset, setWasReset] = useState(isReset);

  if (isReset !== wasReset) {
    setWasReset(isReset);
    if (isReset) setHasFocused(false);
  }

  // Mede a posição da próxima letra e move o cursor direto no DOM
  // (sem estado, para não renderizar o texto de novo a cada tecla).
  useLayoutEffect(() => {
    const container = containerRef.current;
    const content = textContentRef.current;
    const target = currentCharacterRef.current;
    const caret = caretRef.current;

    if (!caret) return;

    if (!container || !content || !target) {
      caret.style.opacity = "0";
      caretPlacedRef.current = false;
      return;
    }

    const contentRect = content.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    // As coordenadas são relativas ao texto, não à tela.
    const left = targetRect.left - contentRect.left;
    const top = targetRect.top - contentRect.top;

    // Na primeira vez o cursor aparece no lugar, sem deslizar do canto.
    caret.style.transition = caretPlacedRef.current ? "" : "none";
    caretPlacedRef.current = true;
    caret.style.left = `${left}px`;
    caret.style.top = `${top}px`;
    caret.style.height = `${targetRect.height}px`;
    caret.style.opacity = "1";

    const lineHeight = Number.parseFloat(
      getComputedStyle(container).lineHeight,
    );

    if (!Number.isFinite(lineHeight) || lineHeight <= 0) return;

    // Descobre em qual linha está o cursor.
    const cursorLine = Math.max(0, Math.round(top / lineHeight));

    // Mantém a linha atual próxima da segunda linha visível.
    const nextOffset =
      input.length === 0 ? 0 : Math.max(0, (cursorLine - 1) * lineHeight);

    // Só atualiza o deslocamento quando realmente é necessário.
    if (Math.abs(nextOffset - targetScrollOffsetRef.current) > 1) {
      targetScrollOffsetRef.current = nextOffset;
      setScrollOffset(nextOffset);
    }
  }, [input, text]);

  const showOverlay = !hasFocused && !isStarted && input.length === 0;

  function activateTyping() {
    setHasFocused(true);
    inputRef.current?.focus();
  }

  function handleKeyEvent(event: KeyboardEvent<HTMLInputElement>) {
    setCapsLockOn(event.getModifierState("CapsLock"));
  }

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        pt: 4,
      }}
    >
      <style>
        {`
          @keyframes typingCaretBlink {
            0%, 48% { opacity: 1; }
            49%, 100% { opacity: 0.2; }
          }
        `}
      </style>

      {/* Indicador Caps Lock original. */}
      {capsLockOn && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 5,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 0.6,
            px: 1.5,
            py: 0.6,
            borderRadius: 2,
            backgroundColor: "rgba(24, 27, 33, 0.94)",
            border: "1px solid rgba(250, 204, 21, 0.35)",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.25)",
            color: "#facc15",
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          <KeyboardCapslockRoundedIcon sx={{ fontSize: "1rem" }} />

          <Typography
            component="span"
            sx={{
              color: "inherit",
              fontSize: "0.75rem",
              fontWeight: 700,
              letterSpacing: "0.06em",
            }}
          >
            CAPS LOCK ATIVADO
          </Typography>
        </Box>
      )}

      {/* Área visível com o mesmo tamanho e estilo de antes. */}
      <Box
        ref={containerRef}
        onClick={activateTyping}
        sx={{
          position: "relative",
          width: "100%",
          fontSize: { xs: "1.2rem", md: "1.5rem" },
          lineHeight: 1.8,
          height: { xs: "6.48rem", md: "8.1rem" },
          overflow: "hidden",
          overflowWrap: "anywhere",
          wordBreak: "normal",
          cursor: "text",
        }}
      >
        <Box
          ref={textContentRef}
          sx={{
            position: "relative",
            opacity: showOverlay ? 0.25 : 1,
            transition:
              "opacity 250ms ease, transform 260ms cubic-bezier(0.22, 1, 0.36, 1)",
            transform: `translate3d(0, -${scrollOffset}px, 0)`,
            willChange: scrollOffset > 0 ? "transform" : "auto",
            "@media (prefers-reduced-motion: reduce)": {
              transition: "none",
            },
            // Cores das letras por classe, sem um objeto de estilo por letra.
            "& .ch": {
              color: "#a0a4ad",
              borderRadius: "2px",
              // Mantém o espaço, mas o cursor é independente.
              borderLeft: "2px solid transparent",
              boxSizing: "border-box",
              // Sem transição de cor: a letra muda na hora em que é digitada.
            },
            "& .ch.ok": { color: "#4ade80" },
            "& .ch.err": { color: "#ff5c75" },
          }}
        >
          {words.map((word) => {
            const end = word.start + word.text.length;
            const caretIndex =
              input.length >= word.start && input.length < end
                ? input.length - word.start
                : -1;
            // Palavras já digitadas ou ainda não alcançadas recebem a mesma
            // string a cada tecla, então o memo evita renderizar de novo.
            const typed =
              input.length <= word.start
                ? ""
                : input.slice(word.start, Math.min(end, input.length));

            return (
              <Word
                key={word.start}
                text={word.text}
                typed={typed}
                caretIndex={caretIndex}
                caretRef={currentCharacterRef}
              />
            );
          })}

          {/* Ponto de referência quando todas as letras foram digitadas. */}
          {input.length >= text.length && text.length > 0 && (
            <span
              ref={currentCharacterRef}
              aria-hidden="true"
              style={{
                display: "inline-block",
                width: 0,
                height: "1.2em",
                verticalAlign: "middle",
              }}
            />
          )}

          {/* Cursor independente: sua posição pode animar entre caracteres. */}
          <Box
            ref={caretRef}
            aria-hidden="true"
            sx={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "2px",
              height: "24px",
              opacity: 0,
              backgroundColor: "#a78bfa",
              borderRadius: "2px",
              boxShadow: "0 0 5px rgba(167, 139, 250, 0.35)",
              pointerEvents: "none",
              zIndex: 1,
              animation: "typingCaretBlink 1s step-end infinite",
              transition: "left 85ms linear, top 85ms ease-out",
              "@media (prefers-reduced-motion: reduce)": {
                transition: "none",
                animation: "none",
              },
            }}
          />
        </Box>

        {/* Mensagem inicial original. */}
        {showOverlay && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 2.5,
                py: 1.5,
                borderRadius: 2,
                backgroundColor: "rgba(24, 27, 33, 0.94)",
                border: "1px solid #493576",
                boxShadow: "0 4px 24px rgba(0, 0, 0, 0.25)",
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: "#a78bfa",
                  boxShadow: "0 0 10px #7c4dff",
                  flexShrink: 0,
                }}
              />

              <Typography
                sx={{
                  color: "#c4b5fd",
                  fontWeight: 700,
                  fontSize: { xs: "0.75rem", md: "0.9rem" },
                  textAlign: "center",
                }}
              >
                Clique aqui para começar a digitar
              </Typography>
            </Box>
          </Box>
        )}

        {/* Campo invisível que continua recebendo a digitação. */}
        <input
          ref={inputRef}
          value={input}
          onFocus={() => setHasFocused(true)}
          onBlur={() => {
            if (!isStarted && input.length === 0) {
              setHasFocused(false);
            }
          }}
          onKeyDown={handleKeyEvent}
          onKeyUp={handleKeyEvent}
          onChange={(event) => onInputChange(event.target.value)}
          aria-label="Digite o texto do teste"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 3,
            width: "100%",
            height: "100%",
            opacity: 0,
            cursor: "text",
            border: 0,
            outline: 0,
            padding: 0,
            margin: 0,
          }}
        />
      </Box>
    </Box>
  );
}

export const TypingText = memo(TypingTextComponent);
