import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Box,
  Button,
  ButtonBase,
  Container,
  GlobalStyles,
  IconButton,
  MenuItem,
  Select,
  Tooltip,
  Typography,
} from "@mui/material";

import ReplayIcon from "@mui/icons-material/Replay";
import QueryStatsRoundedIcon from "@mui/icons-material/QueryStatsRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
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
import { ResultChart } from "../../components/typing/ResultChart";
import { MissedKeys } from "../../components/typing/MissedKeys";
import { getTypingResults, saveTypingResult } from "../../services/api";
import { useAuth } from "../../contexts/useAuth";

const MONO_FONT =
  '"JetBrains Mono", ui-monospace, "Cascadia Code", Consolas, monospace';

const ACCENT = "#a78bfa";
const MUTED = "#7d8496";

const labelSx = {
  color: MUTED,
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: "0.02em",
};

const kbdSx = {
  fontFamily: MONO_FONT,
  fontSize: 12,
  color: "#d5d7de",
  backgroundColor: "#20232b",
  border: "1px solid #343844",
  borderBottomWidth: 2,
  borderRadius: "6px",
  px: 0.85,
  py: 0.25,
};

const MODE_OPTIONS: { value: TestMode; label: string }[] = [
  { value: "time", label: "tempo" },
  { value: "words", label: "palavras" },
  { value: "quote", label: "frases" },
  { value: "chase", label: "perseguição" },
];

const QUOTE_LENGTH_OPTIONS: { value: QuoteLengthFilter; label: string }[] = [
  { value: "all", label: "todas" },
  { value: "short", label: "curtas" },
  { value: "medium", label: "médias" },
  { value: "long", label: "longas" },
];

const DIFFICULTY_OPTIONS: { value: TextDifficulty; label: string }[] = [
  { value: "easy", label: "fácil" },
  { value: "normal", label: "normal" },
  { value: "hard", label: "difícil" },
];

const LIVE_STATS_KEY = "typebattle_show_live_stats";

// Modo foco: uma classe no body esconde o menu e o rodapé. O estilo é fixo
// para não ser reinserido na página a cada renderização.
const FOCUS_MODE_STYLES = {
  "header.MuiAppBar-root, footer": { transition: "opacity 300ms ease" },
  "body.typing-focus header.MuiAppBar-root, body.typing-focus footer": {
    opacity: 0,
    pointerEvents: "none",
  },
} as const;

// Cor da vantagem sobre o perseguidor: verde, amarelo e vermelho.
function getLeadColor(lead: number) {
  if (lead <= 10) return "#ff5c75";
  if (lead <= 25) return "#fbbf24";
  return "#4ade80";
}

// Recorde em PPM ou, na perseguição, em segundos aguentados.
function formatRecord(value: number, isChase: boolean) {
  return isChase ? `${value.toLocaleString("pt-BR")} s` : `${value} PPM`;
}

function getLanguageLabel(code: string) {
  return LANGUAGE_OPTIONS.find((option) => option.code === code)?.label ?? code;
}

interface ToolbarOptionProps {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
  label?: string;
}

// Opção da barra de configurações: texto cinza, roxo quando ativa.
function ToolbarOption({
  active = false,
  disabled = false,
  onClick,
  children,
  label,
}: ToolbarOptionProps) {
  return (
    <ButtonBase
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={label}
      sx={{
        minHeight: 36,
        px: 1,
        gap: 0.75,
        borderRadius: "8px",
        fontFamily: "inherit",
        fontSize: 14,
        fontWeight: 600,
        color: active ? ACCENT : MUTED,
        transition: "color 120ms ease",
        "&:hover": { color: active ? ACCENT : "#d5d7de" },
        "&.Mui-focusVisible": { outline: `2px solid ${ACCENT}` },
        "&.Mui-disabled": { opacity: 0.5 },
      }}
    >
      {children}
    </ButtonBase>
  );
}

function ToolbarDivider() {
  return (
    <Box
      aria-hidden="true"
      sx={{
        // No celular as opções quebram em linhas e o separador sobraria.
        display: { xs: "none", sm: "block" },
        width: "1px",
        height: 20,
        bgcolor: "#2a2e38",
        flexShrink: 0,
      }}
    />
  );
}

// Símbolo curto antes do nome da opção (@ acentos, Aa maiúsculas...).
function OptionGlyph({ children }: { children: ReactNode }) {
  return (
    <Box component="span" sx={{ fontFamily: MONO_FONT }}>
      {children}
    </Box>
  );
}

function ResultFigure({
  label,
  value,
  color = "#ffffff",
}: {
  label: string;
  value: ReactNode;
  color?: string;
}) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
      <Typography sx={labelSx}>{label}</Typography>
      <Typography
        sx={{
          fontFamily: MONO_FONT,
          fontWeight: 700,
          fontSize: 22,
          color,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

export function TypingTest() {
  const {
    mode,
    selectedTime,
    wordCount,
    quoteLength,
    timeLeft,
    elapsedMs,
    chaserPosition,
    getChaserNow,
    chaserSpeed,
    chasePenalty,
    typedWords,
    totalWords,
    input,
    targetText,
    noQuotes,
    isStarted,
    isFinished,
    isPaused,
    result,
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
  const isChase = mode === "chase";
  // Quantas letras você está à frente do perseguidor.
  const chaserLead =
    chaserPosition === null
      ? null
      : Math.max(0, Math.floor(input.length - chaserPosition));

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
    document.body.classList.toggle("typing-focus", focusMode);
    return () => document.body.classList.remove("typing-focus");
  }, [focusMode]);

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

  // Na tela de resultados o campo de digitação some: sem isto, o espaço
  // cairia na página e o navegador rolaria a tela para baixo.
  useEffect(() => {
    if (!isFinished) return;

    function blockSpaceScroll(event: globalThis.KeyboardEvent) {
      const active = document.activeElement;
      const onPage = !active || active === document.body;
      if (event.key === " " && onPage) event.preventDefault();
    }

    window.addEventListener("keydown", blockSpaceScroll);
    return () => window.removeEventListener("keydown", blockSpaceScroll);
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

  const languageLabel = getLanguageLabel(language);
  const modeSummary =
    mode === "time"
      ? `tempo ${selectedTime} · ${languageLabel}`
      : mode === "words"
        ? `${wordCount} palavras · ${languageLabel}`
        : mode === "chase"
          ? `perseguição · ${languageLabel}`
          : `frase · ${languageLabel}`;

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

  // Número grande acima do texto: tempo restante, palavras ou tempo corrido.
  const counter =
    mode === "time"
      ? String(timeLeft)
      : mode === "words"
        ? `${typedWords}/${totalWords}`
        : `${Math.floor(elapsedMs / 1000)}s`;

  const hideWhileTyping = focusMode
    ? { opacity: 0, pointerEvents: "none" as const }
    : {};

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 5 } }}>
      <GlobalStyles styles={FOCUS_MODE_STYLES} />

      <Box
        sx={{
          maxWidth: 1100,
          mx: "auto",
          display: "flex",
          flexDirection: "column",
          gap: { xs: 4, md: 7 },
        }}
      >
        {/* Barra de configurações */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            transition: "opacity 300ms ease",
            ...hideWhileTyping,
          }}
          aria-hidden={focusMode || undefined}
        >
          <Box
            role="toolbar"
            aria-label="Configurações do teste"
            sx={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px 2px",
              px: 1.5,
              py: 0.75,
              borderRadius: "14px",
              bgcolor: "#181b21",
              border: "1px solid #23262e",
            }}
          >
            {/* Opções do texto (as frases já vêm prontas) */}
            {!isQuoteMode && (
              <>
                <ToolbarOption
                  active={useAccents}
                  disabled={controlsDisabled}
                  onClick={() => changeAccents(!useAccents)}
                >
                  <OptionGlyph>@</OptionGlyph> acentos
                </ToolbarOption>
                <ToolbarOption
                  active={useUppercase}
                  disabled={controlsDisabled}
                  onClick={() => changeUppercase(!useUppercase)}
                >
                  <OptionGlyph>Aa</OptionGlyph> maiúsculas
                </ToolbarOption>
                <ToolbarOption
                  active={usePunctuation}
                  disabled={controlsDisabled}
                  onClick={() => changePunctuation(!usePunctuation)}
                >
                  <OptionGlyph>!?</OptionGlyph> pontuação
                </ToolbarOption>
                <ToolbarDivider />
              </>
            )}

            {MODE_OPTIONS.map((option) => (
              <ToolbarOption
                key={option.value}
                active={mode === option.value}
                disabled={controlsDisabled}
                onClick={() => changeMode(option.value)}
              >
                {option.label}
              </ToolbarOption>
            ))}

            {/* Duração, quantidade de palavras ou tamanho da frase */}
            {mode !== "chase" && <ToolbarDivider />}
            {mode === "time" &&
              TIME_OPTIONS.map((time) => (
                <ToolbarOption
                  key={time}
                  active={selectedTime === time}
                  disabled={controlsDisabled}
                  onClick={() => changeTime(time)}
                  label={`${time} segundos`}
                >
                  {time}
                </ToolbarOption>
              ))}
            {mode === "words" &&
              WORD_OPTIONS.map((count) => (
                <ToolbarOption
                  key={count}
                  active={wordCount === count}
                  disabled={controlsDisabled}
                  onClick={() => changeWordCount(count)}
                  label={`${count} palavras`}
                >
                  {count}
                </ToolbarOption>
              ))}
            {mode === "quote" &&
              QUOTE_LENGTH_OPTIONS.map((option) => (
                <ToolbarOption
                  key={option.value}
                  active={quoteLength === option.value}
                  disabled={controlsDisabled}
                  onClick={() => changeQuoteLength(option.value)}
                >
                  {option.label}
                </ToolbarOption>
              ))}

            <ToolbarDivider />

            {/* Idioma */}
            <Box sx={{ display: "flex", alignItems: "center", color: MUTED }}>
              <LanguageRoundedIcon sx={{ fontSize: 17, ml: 1 }} />
              <LanguageAutocomplete
                value={language}
                onChange={changeLanguage}
                disabled={controlsDisabled}
                ariaLabel="Idioma do texto"
                isOptionDisabled={
                  isQuoteMode ? (option) => !option.hasQuotes : undefined
                }
                inputSx={{
                  width: 128,
                  "& .MuiOutlinedInput-root": {
                    color: MUTED,
                    fontSize: 14,
                    fontWeight: 600,
                    pl: 0.5,
                    "&:hover": { color: "#d5d7de" },
                  },
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "transparent",
                  },
                  "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline":
                    { borderColor: "transparent" },
                  "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                    { borderColor: "#343844" },
                  "& .MuiSvgIcon-root": { color: MUTED },
                }}
              />
            </Box>

            {/* Dificuldade (alguns idiomas têm uma lista só; frases não usam) */}
            {!isQuoteMode && languageHasDifficulty(language) && (
              <Select
                variant="standard"
                disableUnderline
                value={difficulty}
                disabled={controlsDisabled}
                onChange={(event) =>
                  changeDifficulty(event.target.value as TextDifficulty)
                }
                inputProps={{ "aria-label": "Dificuldade" }}
                sx={{
                  px: 1,
                  color: MUTED,
                  fontSize: 14,
                  fontWeight: 600,
                  "&:hover": { color: "#d5d7de" },
                  "& .MuiSvgIcon-root": { color: MUTED },
                }}
              >
                {DIFFICULTY_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            )}

            <ToolbarDivider />

            <Tooltip title="Mostrar PPM e precisão durante o teste">
              <span>
                <ToolbarOption
                  active={showLiveStats}
                  disabled={isFinished}
                  onClick={() => setShowLiveStats((current) => !current)}
                  label="Estatísticas ao vivo"
                >
                  <QueryStatsRoundedIcon sx={{ fontSize: 18 }} />
                  ao vivo
                </ToolbarOption>
              </span>
            </Tooltip>
          </Box>
        </Box>

        {/* Teste ou resultado */}
        <Box ref={testPanelRef} onKeyDown={handleTestKeyDown}>
          {!isFinished || !result ? (
            <Box
              component="section"
              aria-label="Teste de digitação"
              sx={{ display: "flex", flexDirection: "column", gap: 1 }}
            >
              {/* Contador e informações ao vivo */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "baseline",
                  flexWrap: "wrap",
                  gap: { xs: 1.5, sm: 2.5 },
                  minHeight: 44,
                }}
              >
                <Typography
                  role="timer"
                  sx={{
                    fontFamily: MONO_FONT,
                    fontSize: { xs: 28, sm: 34 },
                    fontWeight: 700,
                    lineHeight: 1.2,
                    color:
                      mode === "time" && isStarted && timeLeft <= 5
                        ? "#ff6b81"
                        : ACCENT,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {counter}
                </Typography>

                {showLiveStats && (
                  <Typography
                    sx={{
                      fontFamily: MONO_FONT,
                      fontSize: 18,
                      color: MUTED,
                    }}
                  >
                    {ppm} ppm · {accuracy}%
                  </Typography>
                )}

                {/* Perseguição: sua vantagem e a velocidade do perseguidor */}
                {isChase && (
                  <Box
                    role="status"
                    sx={{
                      display: "flex",
                      alignItems: "baseline",
                      flexWrap: "wrap",
                      gap: { xs: 1, sm: 2 },
                    }}
                  >
                    {chaserLead === null ? (
                      <Typography sx={{ color: MUTED, fontSize: 14 }}>
                        Fuja do cursor vermelho: ele sai 2 s depois da sua
                        primeira tecla e acelera com o tempo. Seguir para a
                        próxima palavra com erro faz ele avançar uma palavra.
                      </Typography>
                    ) : (
                      <>
                        <Typography
                          sx={{
                            color: getLeadColor(chaserLead),
                            fontWeight: 700,
                            fontSize: 16,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {chaserLead} {chaserLead === 1 ? "letra" : "letras"}{" "}
                          de vantagem
                        </Typography>
                        <Typography sx={{ color: MUTED, fontSize: 14 }}>
                          perseguidor a {chaserSpeed} ppm
                        </Typography>
                        {chasePenalty > 0 && (
                          <Typography sx={{ color: "#ff7a8f", fontSize: 14 }}>
                            {chasePenalty / 5}{" "}
                            {chasePenalty === 5
                              ? "palavra errada"
                              : "palavras erradas"}
                            : +{chasePenalty} letras pra ele
                          </Typography>
                        )}
                      </>
                    )}
                  </Box>
                )}
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
                  getChaserPosition={isChase && isStarted ? getChaserNow : null}
                  onInputChange={handleInputChange}
                  inputRef={inputRef}
                />
              </Box>

              {/* Reiniciar e atalho */}
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                  mt: 2,
                }}
              >
                <Tooltip title="Reiniciar teste">
                  <IconButton
                    ref={replayButtonRef}
                    onClick={handleReset}
                    aria-label="Reiniciar teste"
                    sx={{
                      width: 44,
                      height: 44,
                      color: MUTED,
                      borderRadius: "10px",
                      "&:hover": { color: "#ffffff", bgcolor: "#1d2027" },
                      "&:focus-visible": {
                        color: "#ffffff",
                        outline: `2px solid ${ACCENT}`,
                        outlineOffset: 3,
                      },
                    }}
                  >
                    <ReplayIcon />
                  </IconButton>
                </Tooltip>
                <Typography
                  sx={{
                    fontSize: 13,
                    color: MUTED,
                    // Atalho de teclado físico: não aparece no celular.
                    display: { xs: "none", sm: "flex" },
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Box component="kbd" sx={kbdSx}>
                    tab
                  </Box>
                  +
                  <Box component="kbd" sx={kbdSx}>
                    enter
                  </Box>
                  reinicia o teste
                </Typography>
              </Box>
            </Box>
          ) : (
            /* Tela de resultados */
            <Box
              component="section"
              aria-label="Resultado do teste"
              sx={{ display: "flex", flexDirection: "column", gap: 3.5 }}
            >
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 4,
                  alignItems: "stretch",
                }}
              >
                {/* Números principais */}
                <Box
                  sx={{
                    flex: "0 0 210px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 2.5,
                  }}
                >
                  <Box>
                    <Typography sx={labelSx}>
                      {isChase ? "aguentou" : "ppm"}
                    </Typography>
                    <Typography
                      component="p"
                      sx={{
                        fontFamily: MONO_FONT,
                        fontSize: { xs: 60, sm: 72 },
                        fontWeight: 700,
                        lineHeight: 1,
                        color: result.record.isNew ? "#fde047" : ACCENT,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {isChase
                        ? `${result.durationSeconds.toLocaleString("pt-BR")}s`
                        : result.ppm}
                    </Typography>

                    {/* Recorde pessoal neste modo e idioma */}
                    <Typography
                      role={result.record.isNew ? "status" : undefined}
                      sx={{
                        mt: 1,
                        display: "flex",
                        alignItems: "center",
                        gap: 0.75,
                        fontSize: 13,
                        fontWeight: result.record.isNew ? 700 : 500,
                        color: result.record.isNew ? "#fde047" : MUTED,
                      }}
                    >
                      {result.record.isNew && (
                        <EmojiEventsRoundedIcon sx={{ fontSize: 16 }} />
                      )}
                      {result.record.isNew
                        ? result.record.previous === null
                          ? "Primeiro recorde neste modo!"
                          : `Novo recorde! Antes: ${formatRecord(result.record.previous, isChase)}`
                        : result.record.previous !== null
                          ? `Recorde: ${formatRecord(result.record.previous, isChase)}`
                          : ""}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography sx={labelSx}>
                      {isChase ? "ppm" : "precisão"}
                    </Typography>
                    <Typography
                      component="p"
                      sx={{
                        fontFamily: MONO_FONT,
                        fontSize: 48,
                        fontWeight: 700,
                        lineHeight: 1,
                        color: ACCENT,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {isChase ? result.ppm : `${result.accuracy}%`}
                    </Typography>
                  </Box>
                </Box>

                {/* Gráfico de velocidade */}
                <Box sx={{ flex: "999 1 520px", minWidth: 0 }}>
                  <ResultChart history={result.history} bare />
                </Box>
              </Box>

              {/* Detalhes da rodada */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "repeat(2, minmax(0, 1fr))",
                    md: "repeat(4, minmax(0, 1fr))",
                  },
                  gap: 2,
                  py: 2.5,
                  borderTop: "1px solid #22252d",
                  borderBottom: "1px solid #22252d",
                }}
              >
                <Box
                  sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}
                >
                  <Typography sx={labelSx}>teste</Typography>
                  <Typography sx={{ fontSize: 17, fontWeight: 700 }}>
                    {modeSummary}
                  </Typography>
                </Box>
                <ResultFigure label="caracteres" value={result.characters} />
                <ResultFigure
                  label="erros"
                  value={result.errors}
                  color={result.errors > 0 ? "#ff7a8f" : "#ffffff"}
                />
                {isChase ? (
                  <ResultFigure
                    label="precisão"
                    value={`${result.accuracy}%`}
                  />
                ) : (
                  <ResultFigure
                    label="tempo"
                    value={`${result.durationSeconds.toLocaleString("pt-BR")}s`}
                  />
                )}
              </Box>

              {/* Autor da frase */}
              {result.quote && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    mt: -1.5,
                    color: "#a0a4ad",
                  }}
                >
                  <FormatQuoteRoundedIcon
                    sx={{ color: ACCENT, fontSize: 20 }}
                  />
                  <Typography sx={{ fontSize: 14 }}>
                    {result.quote.source || "Autor desconhecido"}
                  </Typography>
                </Box>
              )}

              {/* Teclas mais erradas e jogar de novo */}
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 2.5,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 1.75,
                  }}
                >
                  <Typography sx={labelSx}>teclas que mais errou</Typography>
                  <MissedKeys
                    missedKeys={result.missedKeys}
                    limit={5}
                    compact
                  />
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    flexWrap: "wrap",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 13,
                      color: MUTED,
                      display: { xs: "none", sm: "flex" },
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <Box component="kbd" sx={kbdSx}>
                      tab
                    </Box>
                    +
                    <Box component="kbd" sx={kbdSx}>
                      enter
                    </Box>
                  </Typography>
                  <Button
                    ref={replayButtonRef}
                    variant="contained"
                    startIcon={<ReplayIcon />}
                    onClick={handleReset}
                    sx={{
                      minHeight: 44,
                      px: 3.5,
                      borderRadius: "12px",
                      backgroundColor: "#7c4dff",
                      color: "#ffffff",
                      fontWeight: 800,
                      fontSize: 15,
                      textTransform: "none",
                      boxShadow: "none",
                      "&:hover": {
                        backgroundColor: "#906cff",
                        boxShadow: "none",
                      },
                      "&:focus-visible": {
                        outline: `2px solid ${ACCENT}`,
                        outlineOffset: 3,
                      },
                    }}
                  >
                    Jogar novamente
                  </Button>
                </Box>
              </Box>

              {/* Informações da rodada */}
              <Typography
                sx={{ fontSize: 13, color: MUTED, textAlign: "center" }}
              >
                {!isAuthenticated ? (
                  <>
                    <Link
                      to="/login"
                      style={{
                        color: ACCENT,
                        fontWeight: 600,
                        textDecoration: "none",
                      }}
                    >
                      Entre na sua conta
                    </Link>{" "}
                    para salvar e acompanhar seu histórico.
                  </>
                ) : (
                  mode !== "time" &&
                  "Só o modo tempo entra no ranking e no histórico do perfil."
                )}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Container>
  );
}
