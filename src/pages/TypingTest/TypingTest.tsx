import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  FormControl,
  GlobalStyles,
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
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import FormatQuoteRoundedIcon from "@mui/icons-material/FormatQuoteRounded";

import {
  TIME_OPTIONS,
  WORD_OPTIONS,
  useTypingTest,
  type QuoteLengthFilter,
  type TestMode,
} from "../../hooks/useTypingTest";
import {
  LANGUAGE_OPTIONS,
  languageHasDifficulty,
  type TextDifficulty,
} from "../../utils/textGenerator";
import { mergeServerRecords } from "../../utils/typingRecords";
import { LanguageAutocomplete } from "../../components/LanguageAutocomplete";
import { TypingText } from "../../components/typing/TypingText";
import { TypingStats } from "../../components/typing/TypingStats";
import { ResultChart } from "../../components/typing/ResultChart";
import { MissedKeys } from "../../components/typing/MissedKeys";
import { getTypingResults, saveTypingResult } from "../../services/api";
import { useAuth } from "../../contexts/useAuth";

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

const selectSx = {
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
};

const toggleGroupSx = {
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
};

const captionSx = {
  color: "#a0a4ad",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 1,
};

const MODE_OPTIONS: { value: TestMode; label: string }[] = [
  { value: "time", label: "Tempo" },
  { value: "words", label: "Palavras" },
  { value: "quote", label: "Frases" },
];

const QUOTE_LENGTH_OPTIONS: { value: QuoteLengthFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "short", label: "Curtas" },
  { value: "medium", label: "Médias" },
  { value: "long", label: "Longas" },
];

const LIVE_STATS_KEY = "typebattle_show_live_stats";

function getLanguageLabel(code: string) {
  return LANGUAGE_OPTIONS.find((option) => option.code === code)?.label ?? code;
}

export function TypingTest() {
  const {
    mode,
    selectedTime,
    wordCount,
    quoteLength,
    timeLeft,
    elapsedMs,
    typedWords,
    totalWords,
    input,
    targetText,
    noQuotes,
    isStarted,
    isFinished,
    isPaused,
    result,
    totalCharacters,
    totalErrors,
    ppm,
    accuracy,
    inputRef,
    resetTest,
    handleInputChange,
    difficulty,
    language,
    isLoadingWords,
    loadError,
    useAccents,
    useUppercase,
    usePunctuation,
    changeMode,
    changeTime,
    changeWordCount,
    changeQuoteLength,
    changeDifficulty,
    changeLanguage,
    changeAccents,
    changeUppercase,
    changePunctuation,
  } = useTypingTest();

  const { isAuthenticated, token } = useAuth();

  const resultSavedRef = useRef(false);
  const replayButtonRef = useRef<HTMLButtonElement | null>(null);
  const testPanelRef = useRef<HTMLDivElement | null>(null);

  const [showLiveStats, setShowLiveStats] = useState(() => {
    try {
      return localStorage.getItem(LIVE_STATS_KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(LIVE_STATS_KEY, String(showLiveStats));
    } catch {
      // O teste continua funcionando sem acesso ao armazenamento.
    }
  }, [showLiveStats]);

  const controlsDisabled = isStarted;
  const isQuoteMode = mode === "quote";

  // Recordes de quem está logado valem em qualquer navegador.
  useEffect(() => {
    if (!token) return;

    getTypingResults(token)
      .then((response) => mergeServerRecords(response.results))
      .catch((error: unknown) => {
        console.error("Erro ao carregar recordes:", error);
      });
  }, [token]);

  // Salva o resultado quando o teste termina. Só o modo tempo entra no
  // ranking e no histórico (os outros têm duração variável).
  useEffect(() => {
    if (
      !result ||
      mode !== "time" ||
      !isAuthenticated ||
      !token ||
      resultSavedRef.current
    ) {
      return;
    }

    resultSavedRef.current = true;

    void saveTypingResult(
      {
        ppm: result.ppm,
        accuracy: result.accuracy,
        errors: result.errors,
        characters: result.characters,
        duration: selectedTime,
        language,
        missedKeys: result.missedKeys,
      },
      token,
    ).catch((error: unknown) => {
      resultSavedRef.current = false;
      console.error("Erro ao salvar resultado:", error);
    });
  }, [result, mode, isAuthenticated, token, selectedTime, language]);

  // Modo foco: durante o teste, menu, rodapé e configurações somem.
  // Mexer o mouse mostra de novo; voltar a digitar esconde.
  const [mouseRevealed, setMouseRevealed] = useState(false);
  const isTyping = isStarted && !isPaused;
  const focusMode = isTyping && !mouseRevealed;

  useEffect(() => {
    if (!isTyping) return;

    const reveal = () => setMouseRevealed(true);
    const hide = () => setMouseRevealed(false);

    window.addEventListener("mousemove", reveal);
    window.addEventListener("keydown", hide);

    return () => {
      window.removeEventListener("mousemove", reveal);
      window.removeEventListener("keydown", hide);
    };
  }, [isTyping]);

  // Durante o teste, Tab leva ao botão Reiniciar teste.
  useEffect(() => {
    if (isFinished) return;

    function handleTypingTab(event: globalThis.KeyboardEvent) {
      if (event.key !== "Tab" || event.shiftKey) return;

      const panel = testPanelRef.current;
      const activeElement = document.activeElement;

      // Só interfere quando o foco está dentro do painel do teste.
      if (!panel || !activeElement || !panel.contains(activeElement)) {
        return;
      }

      const replayButton = replayButtonRef.current;
      if (!replayButton) return;

      event.preventDefault();
      event.stopPropagation();
      replayButton.focus({ preventScroll: true });
    }

    // A captura ocorre antes dos handlers dos componentes filhos.
    document.addEventListener("keydown", handleTypingTab, true);

    return () => {
      document.removeEventListener("keydown", handleTypingTab, true);
    };
  }, [isFinished]);

  // Na tela de resultados, Tab seleciona Jogar novamente.
  useEffect(() => {
    if (!isFinished) return;

    function handleResultsTab(event: globalThis.KeyboardEvent) {
      if (event.key !== "Tab" || event.shiftKey) return;

      const replayButton = replayButtonRef.current;
      if (!replayButton) return;

      event.preventDefault();
      event.stopPropagation();
      replayButton.focus({ preventScroll: true });
    }

    document.addEventListener("keydown", handleResultsTab, true);

    return () => {
      document.removeEventListener("keydown", handleResultsTab, true);
    };
  }, [isFinished]);

  function handleReset() {
    resultSavedRef.current = false;
    resetTest();
  }

  function handleTestKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (
      isFinished &&
      event.key === "Enter" &&
      event.target === replayButtonRef.current
    ) {
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

  const languageLabel = getLanguageLabel(language);
  const modeSummary =
    mode === "time"
      ? `Tempo · ${selectedTime}s · ${languageLabel}`
      : mode === "words"
        ? `${wordCount} palavras · ${languageLabel}`
        : `Frase · ${languageLabel}`;

  // Mensagem de carregamento ou de erro acima do texto.
  const statusMessage = loadError
    ? "Não foi possível carregar o texto. Verifique sua conexão e troque o idioma para tentar de novo."
    : noQuotes
      ? `Ainda não há frases em ${languageLabel}. Escolha outro idioma.`
      : isLoadingWords
        ? isQuoteMode
          ? "Carregando frases…"
          : "Carregando palavras…"
        : "";

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <GlobalStyles
        styles={{
          "header.MuiAppBar-root, footer": {
            transition: "opacity 300ms ease",
            ...(focusMode && { opacity: 0, pointerEvents: "none" }),
          },
        }}
      />

      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {/* Painel de configurações */}
        <Paper
          elevation={0}
          aria-hidden={focusMode || undefined}
          sx={{
            ...panelSx,
            p: { xs: 2, md: 2.5 },
            transition: "opacity 300ms ease",
            ...(focusMode && { opacity: 0, pointerEvents: "none" }),
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 3,
            }}
          >
            {/* Modo */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CategoryRoundedIcon sx={{ color: "#a78bfa", fontSize: 19 }} />
                <Typography id="typing-mode" variant="caption" sx={captionSx}>
                  Modo
                </Typography>
              </Box>

              <ToggleButtonGroup
                exclusive
                value={mode}
                onChange={(_event, value: TestMode | null) => {
                  if (value !== null) changeMode(value);
                }}
                disabled={controlsDisabled}
                size="small"
                aria-labelledby="typing-mode"
                sx={toggleGroupSx}
              >
                {MODE_OPTIONS.map((option) => (
                  <ToggleButton key={option.value} value={option.value}>
                    {option.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>

            {/* Duração, quantidade de palavras ou tamanho da frase */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <AccessTimeRoundedIcon
                  sx={{ color: "#a78bfa", fontSize: 19 }}
                />
                <Typography
                  id="typing-amount"
                  variant="caption"
                  sx={captionSx}
                >
                  {mode === "time"
                    ? "Tempo"
                    : mode === "words"
                      ? "Palavras"
                      : "Tamanho"}
                </Typography>
              </Box>

              {mode === "time" && (
                <ToggleButtonGroup
                  exclusive
                  value={selectedTime}
                  onChange={(_event, value: number | null) => {
                    if (value !== null) changeTime(value);
                  }}
                  disabled={controlsDisabled}
                  size="small"
                  aria-labelledby="typing-amount"
                  sx={toggleGroupSx}
                >
                  {TIME_OPTIONS.map((time) => (
                    <ToggleButton key={time} value={time}>
                      {time}s
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              )}

              {mode === "words" && (
                <ToggleButtonGroup
                  exclusive
                  value={wordCount}
                  onChange={(_event, value: number | null) => {
                    if (value !== null) changeWordCount(value);
                  }}
                  disabled={controlsDisabled}
                  size="small"
                  aria-labelledby="typing-amount"
                  sx={toggleGroupSx}
                >
                  {WORD_OPTIONS.map((count) => (
                    <ToggleButton key={count} value={count}>
                      {count}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              )}

              {mode === "quote" && (
                <ToggleButtonGroup
                  exclusive
                  value={quoteLength}
                  onChange={(_event, value: QuoteLengthFilter | null) => {
                    if (value !== null) changeQuoteLength(value);
                  }}
                  disabled={controlsDisabled}
                  size="small"
                  aria-labelledby="typing-amount"
                  sx={{
                    ...toggleGroupSx,
                    "& .MuiToggleButton-root": {
                      ...toggleGroupSx["& .MuiToggleButton-root"],
                      px: 1.5,
                    },
                  }}
                >
                  {QUOTE_LENGTH_OPTIONS.map((option) => (
                    <ToggleButton key={option.value} value={option.value}>
                      {option.label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              )}
            </Box>

            {/* Idioma */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1,
                minWidth: 170,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <LanguageRoundedIcon sx={{ color: "#a78bfa", fontSize: 19 }} />
                <Typography
                  id="typing-language"
                  variant="caption"
                  sx={captionSx}
                >
                  Idioma
                </Typography>
              </Box>

              <LanguageAutocomplete
                value={language}
                onChange={changeLanguage}
                disabled={controlsDisabled}
                labelId="typing-language"
                isOptionDisabled={
                  isQuoteMode ? (option) => !option.hasQuotes : undefined
                }
                inputSx={{ "& .MuiOutlinedInput-root": selectSx }}
              />
            </Box>

            {/* Dificuldade (alguns idiomas têm uma lista só; frases não usam) */}
            {!isQuoteMode && languageHasDifficulty(language) && (
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
                  <Typography variant="caption" sx={captionSx}>
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
                    sx={selectSx}
                  >
                    <MenuItem value="easy">Fácil</MenuItem>
                    <MenuItem value="normal">Normal</MenuItem>
                    <MenuItem value="hard">Difícil</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            )}

            {/* Opções do texto (as frases já vêm prontas) */}
            {!isQuoteMode && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <TextFieldsRoundedIcon
                    sx={{ color: "#a78bfa", fontSize: 19 }}
                  />
                  <Typography variant="caption" sx={captionSx}>
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
                  <Box
                    sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                  >
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

                  <Box
                    sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ color: "#d5d7de", fontWeight: 800 }}
                    >
                      ABC
                    </Typography>
                    <Switch
                      size="small"
                      checked={useUppercase}
                      onChange={(event) =>
                        changeUppercase(event.target.checked)
                      }
                      disabled={controlsDisabled}
                      sx={switchSx}
                    />
                  </Box>

                  <Box
                    sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                  >
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
            )}

            {/* Preferência das estatísticas em tempo real */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <QueryStatsRoundedIcon
                  sx={{ color: "#a78bfa", fontSize: 19 }}
                />
                <Typography variant="caption" sx={captionSx}>
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
          ref={testPanelRef}
          elevation={0}
          onKeyDown={handleTestKeyDown}
          sx={{
            ...panelSx,
            p: { xs: 2, md: 3 },
          }}
        >
          {!isFinished || !result ? (
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
                  <Typography variant="caption" sx={captionSx}>
                    {mode === "time"
                      ? "Tempo restante"
                      : mode === "words"
                        ? "Palavras"
                        : "Tempo"}
                  </Typography>
                  <Typography
                    variant="h3"
                    sx={{
                      color:
                        mode === "time" && timeLeft <= 5
                          ? "#ff6b81"
                          : "#ffffff",
                      fontWeight: 800,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {mode === "time" ? (
                      `${timeLeft}s`
                    ) : mode === "quote" ? (
                      // Frases: o tempo corre; o PPM aparece ao terminar.
                      `${Math.floor(elapsedMs / 1000)}s`
                    ) : (
                      <>
                        {typedWords}
                        <Box
                          component="span"
                          sx={{ color: "#5d6370", fontSize: "0.6em" }}
                        >
                          /{totalWords}
                        </Box>
                      </>
                    )}
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
                {statusMessage && (
                  <Typography
                    role="status"
                    sx={{
                      color: loadError || noQuotes ? "#f87171" : "#a0a4ad",
                      mb: 1,
                    }}
                  >
                    {statusMessage}
                  </Typography>
                )}
                <TypingText
                  text={targetText}
                  input={input}
                  isStarted={isStarted}
                  isPaused={isPaused}
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
            /* Tela de resultados */
            <Box sx={{ py: { xs: 1, md: 2 } }}>
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
                  {modeSummary}
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
                  border: "1px solid",
                  borderColor: result.record.isNew ? "#a17a1f" : "#493576",
                  background: result.record.isNew
                    ? "radial-gradient(ellipse at top, rgba(250,204,21,0.16), transparent 70%), #17150f"
                    : "radial-gradient(ellipse at top, rgba(124,77,255,0.20), transparent 70%), #15131e",
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
                      color: result.record.isNew ? "#fde047" : "#a78bfa",
                      fontWeight: 900,
                      fontSize: { xs: "4rem", sm: "5.5rem" },
                      lineHeight: 1.1,
                      letterSpacing: "-3px",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {result.ppm}
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

                {/* Recorde pessoal neste modo e idioma */}
                {result.record.isNew ? (
                  <Box
                    role="status"
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.75,
                      mt: 1.5,
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 5,
                      backgroundColor: "rgba(250,204,21,0.12)",
                      border: "1px solid rgba(250,204,21,0.35)",
                      color: "#fde047",
                      fontWeight: 800,
                      fontSize: "0.9rem",
                    }}
                  >
                    <EmojiEventsRoundedIcon sx={{ fontSize: 18 }} />
                    {result.record.previous === null
                      ? "Primeiro recorde neste modo!"
                      : `Novo recorde! Antes: ${result.record.previous} PPM`}
                  </Box>
                ) : (
                  <Typography
                    sx={{ color: "#969bad", fontSize: "0.9rem", mt: 1 }}
                  >
                    {result.record.previous !== null
                      ? `Seu recorde neste modo: ${result.record.previous} PPM`
                      : "Palavras por minuto"}
                  </Typography>
                )}
              </Box>

              {/* Estatísticas complementares */}
              <TypingStats
                ppm={result.ppm}
                accuracy={result.accuracy}
                errors={result.errors}
                characters={result.characters}
                showPpm={false}
                duration={result.durationSeconds}
              />

              {/* Autor da frase */}
              {result.quote && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    mt: 2.5,
                    color: "#a0a4ad",
                  }}
                >
                  <FormatQuoteRoundedIcon
                    sx={{ color: "#a78bfa", fontSize: 20 }}
                  />
                  <Typography sx={{ fontSize: 14 }}>
                    {result.quote.source || "Autor desconhecido"}
                  </Typography>
                </Box>
              )}

              <ResultChart history={result.history} />

              {/* Teclas mais erradas nesta rodada */}
              <Box
                sx={{
                  mt: 2.5,
                  p: { xs: 1.5, sm: 2.5 },
                  borderRadius: 3,
                  border: "1px solid #292d36",
                  backgroundColor: "#15171d",
                }}
              >
                <Typography sx={{ color: "#ffffff", fontWeight: 700, mb: 1.5 }}>
                  Teclas que você mais errou
                </Typography>
                <MissedKeys missedKeys={result.missedKeys} />
              </Box>

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
                {!isAuthenticated ? (
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
                ) : (
                  mode !== "time" &&
                  "Só o modo tempo entra no ranking e no histórico do perfil."
                )}
              </Typography>

              {/* Ação principal */}
              <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
                <Button
                  ref={replayButtonRef}
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
