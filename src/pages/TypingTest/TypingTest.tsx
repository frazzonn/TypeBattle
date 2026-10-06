import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";

// Textos utilizados durante os testes.
const TEXTS = [
  "O tapete voador da geladeira amarela resolveu costurar o vento de ontem",
  "A tecnologia está presente em diferentes áreas e facilita muitas tarefas do dia a dia.",
  "Aprender programação exige prática, paciência e vontade de resolver problemas.",
  "O desenvolvimento de software envolve planejamento, criatividade, testes e trabalho em equipe.",
  "Quanto mais você pratica, mais natural e rápida fica a sua digitação.",
  "A engenharia de software busca criar soluções eficientes, organizadas e fáceis de manter.",
  "Estudar todos os dias, mesmo por pouco tempo, pode trazer grandes resultados no futuro.",
  "Um bom programador não precisa saber tudo, mas precisa saber pesquisar e aprender.",
  "Resolver problemas é uma das principais habilidades de quem trabalha com tecnologia.",
  "Pequenas melhorias feitas todos os dias podem gerar grandes resultados ao longo do tempo.",
];

// Tempos disponíveis para o teste.
const TIME_OPTIONS = [15, 30, 60];

export function TypingTest() {
  const [selectedTime, setSelectedTime] = useState(30);
  const [timeLeft, setTimeLeft] = useState(30);

  const [input, setInput] = useState("");
  const [textIndex, setTextIndex] = useState(0);

  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  // Acumuladores de todo o teste.
  const [totalCharacters, setTotalCharacters] = useState(0);

  const [totalCorrectCharacters, setTotalCorrectCharacters] = useState(0);

  const [totalErrors, setTotalErrors] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  const targetText = TEXTS[textIndex];

  // Troca para o próximo texto.
  function changeText() {
    setTextIndex((previous) => (previous + 1) % TEXTS.length);
  }

  // Reinicia completamente o teste.
  function resetTest() {
    setInput("");
    setTimeLeft(selectedTime);

    setIsStarted(false);
    setIsFinished(false);

    // Zera os resultados anteriores.
    setTotalCharacters(0);
    setTotalCorrectCharacters(0);
    setTotalErrors(0);

    // Começa com outro texto.
    changeText();

    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }

  // Permite escolher 15, 30 ou 60 segundos.
  function handleTimeChange(_: unknown, newTime: number | null) {
    if (newTime === null || isStarted) {
      return;
    }

    setSelectedTime(newTime);
    setTimeLeft(newTime);

    setInput("");
    setIsFinished(false);

    // Zera os resultados ao trocar o tempo.
    setTotalCharacters(0);
    setTotalCorrectCharacters(0);
    setTotalErrors(0);
  }

  // Controla o cronômetro.
  useEffect(() => {
    if (!isStarted || isFinished) {
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          setIsStarted(false);
          setIsFinished(true);

          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isStarted, isFinished]);

  // Calcula quantos segundos já passaram.
  const elapsedSeconds = selectedTime - timeLeft;

  // PPM baseado em tudo que foi digitado durante o teste.
  const ppm = useMemo(() => {
    if (elapsedSeconds <= 0) {
      return 0;
    }

    const minutes = elapsedSeconds / 60;

    return Math.round(totalCharacters / 5 / minutes);
  }, [totalCharacters, elapsedSeconds]);

  // Precisão considerando o teste inteiro.
  const accuracy = useMemo(() => {
    if (totalCharacters === 0) {
      return 100;
    }

    return Math.round((totalCorrectCharacters / totalCharacters) * 100);
  }, [totalCorrectCharacters, totalCharacters]);

  // Processa cada alteração no campo de digitação.
  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;

    if (isFinished) {
      return;
    }

    // O cronômetro começa na primeira tecla.
    if (!isStarted && value.length > 0) {
      setIsStarted(true);
    }

    setInput(value);

    // Calcula somente os novos caracteres digitados.
    const previousLength = input.length;
    const newCharacters = value.slice(previousLength);

    if (newCharacters.length > 0) {
      let correct = 0;
      let errors = 0;

      for (let i = 0; i < newCharacters.length; i++) {
        const targetIndex = previousLength + i;

        if (newCharacters[i] === targetText[targetIndex]) {
          correct++;
        } else {
          errors++;
        }
      }

      // Acumula os dados durante todo o teste.
      setTotalCharacters((previous) => previous + newCharacters.length);

      setTotalCorrectCharacters((previous) => previous + correct);

      setTotalErrors((previous) => previous + errors);
    }

    // Quando termina um texto, passa para o próximo.
    if (value.length >= targetText.length) {
      setInput("");
      changeText();
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Stack spacing={4}>
        {/* Cabeçalho */}
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 700 }}>
            Teste de Digitação
          </Typography>

          <Typography color="text.secondary">
            Escolha o tempo e veja quantas palavras por minuto você consegue
            digitar.
          </Typography>
        </Box>

        {/* Seleção do tempo */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            backgroundColor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography color="text.secondary" sx={{ mb: 1 }}>
            Tempo do teste
          </Typography>

          <ToggleButtonGroup
            value={selectedTime}
            exclusive
            onChange={handleTimeChange}
          >
            {TIME_OPTIONS.map((time) => (
              <ToggleButton key={time} value={time} disabled={isStarted}>
                {time}s
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Paper>

        {/* Cronômetro */}
        <Box sx={{ textAlign: "center" }}>
          <Typography
            variant="h2"
            sx={{
              fontWeight: 700,
              color: timeLeft <= 5 && isStarted ? "error.main" : "primary.main",
            }}
          >
            {timeLeft}s
          </Typography>

          <Typography color="text.secondary">
            {isFinished
              ? "Tempo encerrado"
              : isStarted
                ? "Digite o mais rápido possível"
                : "Comece a digitar"}
          </Typography>
        </Box>

        {/* Área principal de digitação */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 4 },
            backgroundColor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
          }}
        >
          {/* Texto que deve ser digitado */}
          <Box
            sx={{
              fontSize: {
                xs: "1.2rem",
                md: "1.5rem",
              },
              lineHeight: 1.8,
              mb: 4,
              wordBreak: "break-word",
            }}
          >
            {targetText.split("").map((character, index) => {
              let color = "text.secondary";

              if (index < input.length) {
                color =
                  input[index] === character ? "success.main" : "error.main";
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
                  }}
                >
                  {character}
                </Box>
              );
            })}
          </Box>

          {/* Campo de digitação */}
          <input
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            disabled={isFinished}
            autoFocus
            placeholder="Comece a digitar..."
            style={{
              width: "100%",
              padding: "16px",
              fontSize: "18px",
              background: "transparent",
              color: "inherit",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "8px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </Paper>

        {/* Estatísticas */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(2, 1fr)",
              md: "repeat(4, 1fr)",
            },
            gap: 2,
          }}
        >
          <Paper sx={{ p: 2, textAlign: "center" }}>
            <Typography color="text.secondary">PPM</Typography>

            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {ppm}
            </Typography>
          </Paper>

          <Paper sx={{ p: 2, textAlign: "center" }}>
            <Typography color="text.secondary">Precisão</Typography>

            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {accuracy}%
            </Typography>
          </Paper>

          <Paper sx={{ p: 2, textAlign: "center" }}>
            <Typography color="text.secondary">Erros</Typography>

            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {totalErrors}
            </Typography>
          </Paper>

          <Paper sx={{ p: 2, textAlign: "center" }}>
            <Typography color="text.secondary">Caracteres</Typography>

            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {totalCharacters}
            </Typography>
          </Paper>
        </Box>

        {/* Resultado final */}
        {isFinished && (
          <Paper
            sx={{
              p: 3,
              textAlign: "center",
              border: "1px solid",
              borderColor: "primary.main",
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Resultado
            </Typography>

            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Você fez {ppm} PPM com {accuracy}% de precisão.
            </Typography>

            <Typography color="text.secondary" sx={{ mt: 1 }}>
              {totalCharacters} caracteres digitados e {totalErrors} erros.
            </Typography>
          </Paper>
        )}

        {/* Reinicia o teste */}
        <Button variant="contained" size="large" onClick={resetTest}>
          Reiniciar teste
        </Button>
      </Stack>
    </Container>
  );
}
