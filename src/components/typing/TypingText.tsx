import { useEffect, useRef } from "react";
import { Box } from "@mui/material";

interface TypingTextProps {
  text: string;
  input: string;
}

export function TypingText({ text, input }: TypingTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentCharacterRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const cursor = currentCharacterRef.current;

    if (!container || !cursor) return;

    const containerRect = container.getBoundingClientRect();
    const cursorRect = cursor.getBoundingClientRect();
    const lineHeight = Number.parseFloat(
      getComputedStyle(container).lineHeight,
    );

    if (!Number.isFinite(lineHeight) || lineHeight <= 0) return;

    // Quando o cursor entra na terceira linha, move o texto uma linha.
    const cursorPosition = cursorRect.top - containerRect.top;

    if (cursorPosition >= lineHeight * 2) {
      container.scrollTop += lineHeight;
    }
  }, [input, text]);

  // Cada caractere mantém sua cor e sua posição no texto.
  return (
    <Box
      ref={containerRef}
      sx={{
        fontSize: { xs: "1.2rem", md: "1.5rem" },
        lineHeight: 1.8,
        height: { xs: "6.48rem", md: "8.1rem" },
        overflow: "hidden",
        overflowWrap: "anywhere",
        wordBreak: "normal",
      }}
    >
      {text.split("").map((character, index) => {
        let color = "text.secondary";

        if (index < input.length) {
          color = input[index] === character ? "success.main" : "error.main";
        }

        const isCurrentCharacter = index === input.length;

        return (
          <Box
            component="span"
            key={`${index}-${character}`}
            ref={isCurrentCharacter ? currentCharacterRef : null}
            sx={{
              color,
              backgroundColor: isCurrentCharacter
                ? "action.hover"
                : "transparent",
              borderRadius: 0.5,
            }}
          >
            {character}
          </Box>
        );
      })}
    </Box>
  );
}
