import { Box } from "@mui/material";

interface TypingTextProps {
  text: string;
  input: string;
}

export function TypingText({ text, input }: TypingTextProps) {
  return (
    <Box
      sx={{
        fontSize: {
          xs: "1.2rem",
          md: "1.5rem",
        },
        lineHeight: 1.8,
        wordBreak: "break-word",
      }}
    >
      {text.split("").map((character, index) => {
        let color = "text.secondary";

        // Define a cor para cada caractere digitado.
        if (index < input.length) {
          color = input[index] === character ? "success.main" : "error.main";
        }

        const isCurrentCharacter = index === input.length;

        return (
          <Box
            component="span"
            key={`${character}-${index}`}
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
