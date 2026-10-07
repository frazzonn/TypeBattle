import { useEffect, useRef } from "react";
import type { ChangeEvent } from "react";

import {
  Box,
  Container,
  IconButton,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";

import ReplayIcon from "@mui/icons-material/Replay";

import { TIME_OPTIONS, useTypingTest } from "../../hooks/useTypingTest";

import { TypingText } from "../../components/typing/TypingText";
import { TypingStats } from "../../components/typing/TypingStats";

import { saveTypingResult } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";

export function TypingTest() {
  const { token } = useAuth();

  // Evita salvar o mesmo resultado mais de uma vez.
  const resultSavedRef = useRef(false);

  const {
    selectedTime,
    timeLeft,
    input,
    targetText,
    isStarted,
    isFinished,
    totalCharacters,
    totalErrors,
    ppm,
    accuracy,
    inputRef,
    changeTime,
    resetTest,
    handleInputChange,
  } = useTypingTest();

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    handleInputChange(event.target.value);
  }

  // Salva o resultado quando o teste termina.
  useEffect(() => {
    if (!isFinished || !token || resultSavedRef.current) {
      return;
    }

    resultSavedRef.current = true;

    // Neste ponto o token já foi validado.
    const authToken = token;

    async function saveResult() {
      try {
        await saveTypingResult(
          {
            ppm,
            accuracy,
            errors: totalErrors,
            characters: totalCharacters,
            duration: selectedTime,
          },
          authToken,
        );

        console.log("Resultado salvo com sucesso!");
      } catch (error) {
        console.error("Erro ao salvar resultado:", error);

        // Permite tentar novamente caso a requisição falhe.
        resultSavedRef.current = false;
      }
    }

    saveResult();
  }, [
    isFinished,
    token,
    ppm,
    accuracy,
    totalErrors,
    totalCharacters,
    selectedTime,
  ]);

  // Reinicia o teste e permite salvar o próximo resultado.
  function handleReset() {
    resultSavedRef.current = false;
    resetTest();
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
            Escolha o tempo e veja sua velocidade de digitação.
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
            onChange={(_, newTime: number | null) => changeTime(newTime)}
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

        {/* Área de digitação */}
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
          <TypingText text={targetText} input={input} />

          {/* Campo de digitação */}
          <Box sx={{ mt: 4 }}>
            <input
              ref={inputRef}
              value={input}
              onChange={handleInput}
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
          </Box>
        </Paper>

        {/* Estatísticas */}
        <TypingStats
          ppm={ppm}
          accuracy={accuracy}
          errors={totalErrors}
          characters={totalCharacters}
        />

        {/* Resultado */}
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

        {/* Botão para repetir o teste */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Tooltip title="Repetir teste">
            <IconButton
              onClick={handleReset}
              size="large"
              aria-label="Repetir teste"
              sx={{
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <ReplayIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Stack>
    </Container>
  );
}
