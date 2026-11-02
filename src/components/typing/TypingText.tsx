import {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { KeyboardEvent } from "react";
import { Box, Typography } from "@mui/material";
import KeyboardCapslockRoundedIcon from "@mui/icons-material/KeyboardCapslockRounded";

interface TypingTextProps {
  text: string;
  input: string;
  isStarted: boolean;
  isPaused?: boolean;
  // Modo perseguição: diz, a qualquer momento, quantas letras o perseguidor
  // já andou (null = sem perseguidor).
  getChaserPosition?: (() => number) | null;
  onInputChange: (value: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

interface WordChunk {
  start: number;
  text: string;
}

interface WordProps {
  start: number;
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
  start,
  text,
  typed,
  caretIndex,
  caretRef,
}: WordProps) {
  return (
    <span data-start={start}>
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
            className={`ch${status}${character === " " ? " sp" : ""}`}
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
  isPaused = false,
  getChaserPosition = null,
  onInputChange,
  inputRef,
}: TypingTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textContentRef = useRef<HTMLDivElement>(null);
  const currentCharacterRef = useRef<HTMLSpanElement>(null);
  const caretRef = useRef<HTMLDivElement>(null);
  const chaserRef = useRef<HTMLDivElement>(null);
  const caretPlacedRef = useRef(false);
  const targetScrollOffsetRef = useRef(0);

  const words = useMemo(() => splitWords(text), [text]);

  // Primeira letra mostrada: as linhas já digitadas que ficaram bem para
  // cima saem da página, senão o texto (que na perseguição não acaba) só
  // cresce e tudo fica mais lento com o tempo.
  const [trimStart, setTrimStart] = useState(0);
  const trimStartRef = useRef(0);
  const [previousText, setPreviousText] = useState(text);

  // Texto novo (outro teste ou outra rodada): mostra desde o começo de novo.
  // Palavras acrescentadas no fim mantêm o corte.
  if (text !== previousText) {
    setPreviousText(text);
    if (!text.startsWith(previousText)) setTrimStart(0);
  }

  const visibleWords = useMemo(
    () => words.filter((word) => word.start >= trimStart),
    [words, trimStart],
  );

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
    trimStartRef.current = trimStart;

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

    // Com 4 linhas ou mais acima, tira as que já não aparecem (mantém duas
    // acima do cursor). A rolagem é compensada na mesma pintura, sem animar,
    // então nada se mexe na tela.
    if (cursorLine >= 4) {
      const cutTop = (cursorLine - 2) * lineHeight - 1;
      const firstKept = Array.from(content.children).find(
        (child): child is HTMLElement =>
          child instanceof HTMLElement &&
          child.dataset.start !== undefined &&
          child.offsetTop >= cutTop,
      );
      const nextStart = Number(firstKept?.dataset.start);

      if (Number.isFinite(nextStart) && nextStart > trimStart) {
        content.style.transition = "none";
        caretPlacedRef.current = false;
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            content.style.transition = "";
          }),
        );
        setTrimStart(nextStart);
        return;
      }
    }

    // Mantém a linha atual próxima da segunda linha visível.
    const nextOffset =
      input.length === 0 ? 0 : Math.max(0, (cursorLine - 1) * lineHeight);

    // Só atualiza o deslocamento quando realmente é necessário.
    if (Math.abs(nextOffset - targetScrollOffsetRef.current) > 1) {
      targetScrollOffsetRef.current = nextOffset;
      setScrollOffset(nextOffset);
    }
  }, [input, text, trimStart]);

  // Desenha o perseguidor a cada quadro da tela, direto no DOM, pela posição
  // fracionária (no meio da letra): ele desliza sem pular de letra em letra
  // e sem precisar que o React renderize a página. Numa linha que já subiu
  // da área visível, ele fica preso na borda de cima, com uma seta.
  useEffect(() => {
    const chaser = chaserRef.current;
    const content = textContentRef.current;
    const container = containerRef.current;
    if (!getChaserPosition || !chaser || !content || !container) return;

    // Coleção "viva": acompanha as letras novas e as que saem.
    const letters = content.getElementsByClassName("ch");
    let frame = 0;
    let letterHeight = 24;

    function draw() {
      if (!chaser || !content || !container) return;

      const position = getChaserPosition!();
      const index = Math.floor(position) - trimStartRef.current;
      const letter = index >= 0 ? (letters[index] as HTMLElement) : undefined;
      const contentRect = content.getBoundingClientRect();
      const visibleTop =
        container.getBoundingClientRect().top - contentRect.top;

      let left = 0;
      let top = visibleTop;
      let height = 0;

      if (letter) {
        const letterRect = letter.getBoundingClientRect();
        left =
          letterRect.left -
          contentRect.left +
          (position - Math.floor(position)) * letterRect.width;
        top = letterRect.top - contentRect.top;
        height = letterRect.height;
      } else if (index >= 0) {
        // Ainda sem letras na página (texto carregando).
        chaser.style.opacity = "0";
        frame = requestAnimationFrame(draw);
        return;
      }

      const offscreen = top < visibleTop - 1;
      if (offscreen) top = visibleTop;

      if (height > 0) letterHeight = height;

      // Fora da tela: metade da altura, colado na borda de cima, para não
      // parecer que está na primeira linha visível.
      chaser.dataset.offscreen = String(offscreen);
      chaser.style.transform = `translate(${left}px, ${top}px)`;
      chaser.style.height = `${offscreen ? letterHeight / 2 : letterHeight}px`;
      chaser.style.opacity = offscreen ? "0.75" : "1";

      frame = requestAnimationFrame(draw);
    }

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [getChaserPosition]);

  const showOverlay = !hasFocused && !isStarted && input.length === 0;
  const overlayMessage = isPaused
    ? "Pausado · digite para continuar"
    : "Clique aqui para começar a digitar";

  function activateTyping() {
    setHasFocused(true);
    inputRef.current?.focus();
  }

  function handleKeyEvent(event: KeyboardEvent<HTMLInputElement>) {
    setCapsLockOn(event.getModifierState("CapsLock"));
  }

  // O espaço só vale no fim da palavra: apertar espaço sem parar não avança
  // o texto nem soma pontos. Barrar já na tecla evita que o navegador role a
  // página ao devolver o valor antigo do campo.
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    handleKeyEvent(event);

    if (event.key === " " && text[input.length] !== " ") {
      event.preventDefault();
    }
  }

  // Sem o foco no texto, digitar leva o foco para ele (o espaço não rola a
  // página). Botões e campos continuam funcionando normalmente.
  useEffect(() => {
    function focusOnType(event: globalThis.KeyboardEvent) {
      const active = document.activeElement;
      const onPage = !active || active === document.body;
      const isCharacter = event.key.length === 1;

      if (
        !onPage ||
        !isCharacter ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      ) {
        return;
      }

      if (event.key === " ") event.preventDefault();
      setHasFocused(true);
      inputRef.current?.focus({ preventScroll: true });
    }

    window.addEventListener("keydown", focusOnType);
    return () => window.removeEventListener("keydown", focusOnType);
  }, [inputRef]);

  // Segurança para teclados que não informam a tecla (alguns celulares).
  function handleChange(value: string) {
    const typedSpace =
      value.length === input.length + 1 &&
      value.startsWith(input) &&
      value.endsWith(" ");

    if (typedSpace && text[input.length] !== " ") return;

    onInputChange(value);
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
          fontFamily:
            '"JetBrains Mono", ui-monospace, "Cascadia Code", Consolas, monospace',
          fontSize: { xs: "1.2rem", md: "1.6rem" },
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
            opacity: showOverlay ? 0.25 : isPaused ? 0.4 : 1,
            // Pausado, o texto fica borrado para não dar para ler adiante.
            filter: isPaused ? "blur(6px)" : "none",
            transition:
              "opacity 250ms ease, filter 250ms ease, transform 260ms cubic-bezier(0.22, 1, 0.36, 1)",
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
            // Espaço errado: sem marca, um espaço vermelho seria invisível.
            "& .ch.err.sp": {
              backgroundColor: "rgba(255, 92, 117, 0.25)",
              boxShadow: "inset 0 -2px 0 #ff5c75",
            },
          }}
        >
          {visibleWords.map((word) => {
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
                start={word.start}
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

          {/* Perseguidor (modo perseguição): se chegar no seu cursor, acabou. */}
          {getChaserPosition && (
            <Box
              ref={chaserRef}
              aria-hidden="true"
              sx={{
                position: "absolute",
                left: 0,
                top: 0,
                width: "3px",
                height: "24px",
                opacity: 0,
                backgroundColor: "#ff5c75",
                borderRadius: "2px",
                boxShadow: "0 0 12px rgba(255, 92, 117, 0.85)",
                pointerEvents: "none",
                zIndex: 1,
                willChange: "transform",
                // Rastro atrás do perseguidor: dá a sensação de velocidade.
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: "15%",
                  bottom: "15%",
                  right: "3px",
                  width: "48px",
                  borderRadius: "999px 0 0 999px",
                  background:
                    "linear-gradient(to right, rgba(255, 92, 117, 0), rgba(255, 92, 117, 0.45))",
                },
                // Fora da área visível (linha acima): seta indicando que ele
                // vem atrás.
                '&[data-offscreen="true"]::after': {
                  content: '"↑"',
                  position: "absolute",
                  left: "7px",
                  top: "-1px",
                  color: "#ff5c75",
                  fontSize: "18px",
                  fontWeight: 800,
                  lineHeight: 1,
                },
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

        {/* Mensagem inicial ou de pausa. */}
        {(showOverlay || isPaused) && (
          <Box
            role={isPaused ? "status" : undefined}
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
                {overlayMessage}
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
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyEvent}
          onChange={(event) => handleChange(event.target.value)}
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
