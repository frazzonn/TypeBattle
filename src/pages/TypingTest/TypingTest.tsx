import { useEffect, useRef, useState } from "react";
import type { MouseEvent, KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  FormControl,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";

import ReplayIcon from "@mui/icons-material/Replay";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import TextFieldsRoundedIcon from "@mui/icons-material/TextFieldsRounded";
import FormatSizeRoundedIcon from "@mui/icons-material/FormatSizeRounded";
import ShortTextRoundedIcon from "@mui/icons-material/ShortTextRounded";
import QueryStatsRoundedIcon from "@mui/icons-material/QueryStatsRounded";

import { TIME_OPTIONS, useTypingTest } from "../../hooks/useTypingTest";
import type { TextDifficulty } from "../../utils/textGenerator";
import { TypingText } from "../../components/typing/TypingText";
import { TypingStats } from "../../components/typing/TypingStats";
import { saveTypingResult } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";

const panelSx = {
  backgroundColor: "#181b21",
  border: "1px solid #292d36",
  borderRadius: 3,
};

const switchSx = {
  "& .MuiSwitch-switchBase.Mui-checked": {
    color: "#a78bfa",
  },
  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
    backgroundColor: "#7c4dff",
  },
};

const LIVE_STATS_KEY = "typebattle_show_live_stats";

export function TypingTest() {
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
    difficulty,
    useAccents,
    useUppercase,
    usePunctuation,
    changeDifficulty,
    changeAccents,
    changeUppercase,
    changePunctuation,
  } = useTypingTest();

  const { isAuthenticated, token } = useAuth();

  const resultSavedRef = useRef(false);
  const replayButtonRef = useRef<HTMLButtonElement | null>(null);

  // Recupera a preferência salva no navegador.
  const [showLiveStats, setShowLiveStats] = useState(() => {
    try {
      return localStorage.getItem(LIVE_STATS_KEY) === "true";
    } catch {
      return false;
    }
  });

  // Persiste a escolha do usuário entre visitas.
  useEffect(() => {
    try {
      localStorage.setItem(LIVE_STATS_KEY, String(showLiveStats));
    } catch {
      // O teste continua funcionando mesmo sem acesso ao armazenamento.
    }
  }, [showLiveStats]);

  const controlsDisabled = isStarted;

  // Salva o resultado quando o teste termina.
  useEffect(() => {
    if (!isFinished || !isAuthenticated || !token || resultSavedRef.current) {
      return;
    }

    resultSavedRef.current = true;

    void saveTypingResult(
      {
        ppm,
        accuracy,
        errors: totalErrors,
        characters: totalCharacters,
        duration: selectedTime,
      },
      token,
    ).catch((error: unknown) => {
      resultSavedRef.current = false;
      console.error("Erro ao salvar resultado:", error);
    });
  }, [
    isFinished,
    isAuthenticated,
    token,
    ppm,
    accuracy,
    totalErrors,
    totalCharacters,
    selectedTime,
  ]);

  useEffect(() => {
    if (!isFinished) return;

    function handleResultsTab(event: globalThis.KeyboardEvent) {
      if (event.key !== "Tab" || event.shiftKey) return;

      const replayButton = replayButtonRef.current;
      if (!replayButton) return;

      event.preventDefault();
      replayButton.focus({ preventScroll: true });
    }

    document.addEventListener("keydown", handleResultsTab);

    return () => {
      document.removeEventListener("keydown", handleResultsTab);
    };
  }, [isFinished]);

  function handleReset() {
    resultSavedRef.current = false;
    resetTest();
  }

  // Tab direciona o foco ao Replay dentro da área do teste.
  function handleTestKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    // Aplica esta correção somente na tela de resultados.
    if (!isFinished) return;

    if (event.key === "Tab" && !event.shiftKey) {
      event.preventDefault();
      replayButtonRef.current?.focus();
      return;
    }

    if (event.key === "Enter" && event.target === replayButtonRef.current) {
      event.preventDefault();
      event.stopPropagation();
      handleReset();
    }
  }

  function handleDifficultyChange(value: string) {
    if (value === "easy" || value === "normal" || value === "hard") {
      changeDifficulty(value as TextDifficulty);
    }
  }

  function handleTimeChange(
    _event: MouseEvent<HTMLElement>,
    value: number | null,
  ) {
    if (value !== null) {
      changeTime(value);
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {/* Painel de configurações */}
        <Paper
          elevation={0}
          sx={{
            ...panelSx,
            p: { xs: 2, md: 2.5 },
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 3,
            }}
          >
            {/* Duração */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <AccessTimeRoundedIcon
                  sx={{ color: "#a78bfa", fontSize: 19 }}
                />

                <Typography
                  variant="caption"
                  sx={{
                    color: "#a0a4ad",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  Tempo
                </Typography>
              </Box>

              <ToggleButtonGroup
                exclusive
                value={selectedTime}
                onChange={handleTimeChange}
                disabled={controlsDisabled}
                size="small"
                sx={{
                  "& .MuiToggleButton-root": {
                    color: "#a0a4ad",
                    borderColor: "#343844",
                    px: 2,
                    textTransform: "none",
                    fontWeight: 700,
                  },
                  "& .MuiToggleButton-root.Mui-selected": {
                    color: "#ffffff",
                    backgroundColor: "#6d45d8",
                    borderColor: "#7c4dff",
                  },
                  "& .MuiToggleButton-root.Mui-selected:hover": {
                    backgroundColor: "#7955e8",
                  },
                }}
              >
                {TIME_OPTIONS.map((time) => (
                  <ToggleButton key={time} value={time}>
                    {time}s
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>

            {/* Dificuldade */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1,
                minWidth: 150,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <TuneRoundedIcon sx={{ color: "#a78bfa", fontSize: 19 }} />

                <Typography
                  variant="caption"
                  sx={{
                    color: "#a0a4ad",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  Dificuldade
                </Typography>
              </Box>

              <FormControl size="small" fullWidth>
                <Select
                  value={difficulty}
                  onChange={(event) =>
                    handleDifficultyChange(event.target.value)
                  }
                  disabled={controlsDisabled}
                  sx={{
                    color: "#ffffff",
                    backgroundColor: "#20232b",
                    borderRadius: 2,
                    ".MuiOutlinedInput-notchedOutline": {
                      borderColor: "#343844",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#7c4dff",
                    },
                    ".MuiSvgIcon-root": {
                      color: "#a0a4ad",
                    },
                  }}
                >
                  <MenuItem value="easy">Fácil</MenuItem>
                  <MenuItem value="normal">Normal</MenuItem>
                  <MenuItem value="hard">Difícil</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Opções do texto */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <TextFieldsRoundedIcon
                  sx={{ color: "#a78bfa", fontSize: 19 }}
                />

                <Typography
                  variant="caption"
                  sx={{
                    color: "#a0a4ad",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  Texto
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: { xs: 1, md: 2 },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <FormatSizeRoundedIcon
                    sx={{ color: "#a0a4ad", fontSize: 18 }}
                  />

                  <Typography variant="body2" sx={{ color: "#d5d7de" }}>
                    Acentos
                  </Typography>

                  <Switch
                    size="small"
                    checked={useAccents}
                    onChange={(event) => changeAccents(event.target.checked)}
                    disabled={controlsDisabled}
                    sx={switchSx}
                  />
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Typography
                    variant="body2"
                    sx={{ color: "#d5d7de", fontWeight: 800 }}
                  >
                    ABC
                  </Typography>

                  <Switch
                    size="small"
                    checked={useUppercase}
                    onChange={(event) => changeUppercase(event.target.checked)}
                    disabled={controlsDisabled}
                    sx={switchSx}
                  />
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <ShortTextRoundedIcon
                    sx={{ color: "#a0a4ad", fontSize: 18 }}
                  />

                  <Typography variant="body2" sx={{ color: "#d5d7de" }}>
                    Pontuação
                  </Typography>

                  <Switch
                    size="small"
                    checked={usePunctuation}
                    onChange={(event) =>
                      changePunctuation(event.target.checked)
                    }
                    disabled={controlsDisabled}
                    sx={switchSx}
                  />
                </Box>
              </Box>
            </Box>

            {/* Preferência das estatísticas em tempo real */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <QueryStatsRoundedIcon
                  sx={{ color: "#a78bfa", fontSize: 19 }}
                />

                <Typography
                  variant="caption"
                  sx={{
                    color: "#a0a4ad",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  Estatísticas ao vivo
                </Typography>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body2" sx={{ color: "#d5d7de" }}>
                  {showLiveStats ? "Visíveis" : "Ocultas"}
                </Typography>

                <Switch
                  size="small"
                  checked={showLiveStats}
                  onChange={(event) => setShowLiveStats(event.target.checked)}
                  disabled={isFinished}
                  slotProps={{
                    input: {
                      "aria-label": "Mostrar estatísticas durante o teste",
                    },
                  }}
                  sx={switchSx}
                />
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* Painel principal: teste ou resultado final */}
        <Paper
          elevation={0}
          onKeyDown={handleTestKeyDown}
          sx={{
            ...panelSx,
            p: { xs: 2, md: 3 },
          }}
        >
          {!isFinished ? (
            <>
              {/* Cabeçalho do teste */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 2,
                  mb: 3,
                }}
              >
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "#a0a4ad",
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      fontWeight: 700,
                    }}
                  >
                    Tempo restante
                  </Typography>

                  <Typography
                    variant="h3"
                    sx={{
                      color: timeLeft <= 5 ? "#ff6b81" : "#ffffff",
                      fontWeight: 800,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {timeLeft}s
                  </Typography>
                </Box>

                <Tooltip title="Reiniciar teste">
                  <IconButton
                    ref={replayButtonRef}
                    onClick={handleReset}
                    aria-label="Reiniciar teste"
                    sx={{
                      color: "#a78bfa",
                      border: "1px solid #343844",
                      borderRadius: 2,
                      "&:hover": {
                        backgroundColor: "#29223b",
                      },
                      "&:focus-visible": {
                        outline: "2px solid #a78bfa",
                        outlineOffset: 3,
                      },
                    }}
                  >
                    <ReplayIcon />
                  </IconButton>
                </Tooltip>
              </Box>

              {/* Área de digitação */}
              <Box sx={{ minHeight: 150 }}>
                <TypingText
                  text={targetText}
                  input={input}
                  isStarted={isStarted}
                  onInputChange={handleInputChange}
                  inputRef={inputRef}
                />
              </Box>

              {/* Estatísticas opcionais durante o teste */}
              {showLiveStats && (
                <Box sx={{ mt: 3 }}>
                  <TypingStats
                    ppm={ppm}
                    accuracy={accuracy}
                    errors={totalErrors}
                    characters={totalCharacters}
                  />
                </Box>
              )}
            </>
          ) : (
            /* Tela de resultados: substitui completamente o texto */
            <Box sx={{ py: { xs: 1, md: 2 } }}>
              {/* Cabeçalho */}

              <Box sx={{ textAlign: "center", mb: { xs: 3, md: 3.5 } }}>
                <Typography
                  variant="overline"
                  sx={{
                    display: "inline-block",
                    color: "#b69aff",
                    fontWeight: 800,
                    letterSpacing: 2.5,
                    fontSize: "0.7rem",
                    lineHeight: 1.5,
                  }}
                >
                  TESTE CONCLUÍDO
                </Typography>

                <Typography
                  variant="h4"
                  sx={{
                    color: "#ffffff",
                    fontWeight: 800,
                    letterSpacing: "-0.8px",
                    fontSize: { xs: "1.8rem", sm: "2.125rem" },
                    mt: 0.75,
                  }}
                >
                  Seu resultado
                </Typography>

                <Typography
                  sx={{
                    color: "#969bad",
                    mt: 1,
                    fontSize: { xs: "0.875rem", sm: "0.95rem" },
                  }}
                >
                  Confira seu desempenho nesta rodada.
                </Typography>
              </Box>

              {/* Destaque principal de velocidade */}
              <Box
                sx={{
                  textAlign: "center",
                  py: { xs: 3, md: 4 },
                  px: 2,
                  mb: 2.5,
                  borderRadius: 4,
                  border: "1px solid #493576",
                  background:
                    "radial-gradient(ellipse at top, rgba(124,77,255,0.20), transparent 70%), #15131e",
                }}
              >
                <Typography
                  sx={{
                    color: "#c4b5fd",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 2,
                    fontSize: "0.8rem",
                  }}
                >
                  Sua velocidade
                </Typography>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "center",
                    gap: 1.5,
                    mt: 1,
                  }}
                >
                  <Typography
                    sx={{
                      color: "#a78bfa",
                      fontWeight: 900,
                      fontSize: { xs: "4rem", sm: "5.5rem" },
                      lineHeight: 1.1,
                      letterSpacing: "-3px",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {ppm}
                  </Typography>

                  <Typography
                    sx={{
                      color: "#e0d7ff",
                      fontWeight: 700,
                      fontSize: { xs: "1rem", sm: "1.25rem" },
                    }}
                  >
                    PPM
                  </Typography>
                </Box>

                <Typography
                  sx={{ color: "#969bad", fontSize: "0.9rem", mt: 1 }}
                >
                  Palavras por minuto
                </Typography>
              </Box>

              {/* Cards complementares, sem repetir o PPM */}
              <TypingStats
                ppm={ppm}
                accuracy={accuracy}
                errors={totalErrors}
                characters={totalCharacters}
                showPpm={false}
                duration={selectedTime}
              />

              {/* Informações da rodada */}
              <Typography
                variant="body2"
                sx={{
                  color: "#777d8b",
                  lineHeight: 1.7,
                  mt: 2.5,
                  textAlign: "center",
                }}
              >
                {!isAuthenticated && (
                  <>
                    <Link
                      to="/login"
                      style={{
                        color: "#a78bfa",
                        fontWeight: 600,
                        textDecoration: "none",
                      }}
                    >
                      Entre na sua conta{" "}
                    </Link>
                    para salvar e acompanhar seu histórico.
                  </>
                )}
              </Typography>

              {/* Ação principal */}
              <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
                <Button
                  ref={replayButtonRef}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      event.stopPropagation();
                      handleReset();
                    }
                  }}
                  variant="contained"
                  size="large"
                  startIcon={<ReplayIcon />}
                  onClick={handleReset}
                  sx={{
                    width: { xs: "100%", sm: "auto" },
                    minWidth: { sm: 240 },
                    px: 4,
                    py: 1.5,
                    borderRadius: 2.5,
                    backgroundColor: "#7c4dff",
                    color: "#ffffff",
                    fontWeight: 800,
                    fontSize: "1rem",
                    textTransform: "none",
                    boxShadow: "0 8px 24px rgba(124,77,255,0.22)",
                    "&:hover": {
                      backgroundColor: "#906cff",
                      boxShadow: "0 10px 28px rgba(124,77,255,0.32)",
                    },
                    "&:focus-visible": {
                      outline: "2px solid #a78bfa",
                      outlineOffset: 3,
                    },
                  }}
                >
                  Jogar novamente
                </Button>
              </Box>
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
}
