import { useEffect, useEffectEvent, useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Box, Button, ButtonBase, CircularProgress, Container, Stack, Typography } from "@mui/material";
import { keyframes } from "@mui/material/styles";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import BackspaceOutlinedIcon from "@mui/icons-material/BackspaceOutlined";
import ShuffleRoundedIcon from "@mui/icons-material/ShuffleRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";

import {
  ApiError,
  getEmbaralha,
  guessEmbaralha,
  revealEmbaralha,
  type EmbaralhaDaily,
} from "../../../services/api";

// Embaralha: as 7 letras do dia ficam embaixo; clicando nelas (ou digitando)
// a palavra se forma nas casas de cima e vai para a grade quando é aceita.
// O botão de embaralhar só muda a ordem em que as letras aparecem.

const MONO_FONT = "'JetBrains Mono', ui-monospace, monospace";
const MUTED = "#a0a4ad";

interface FoundWord {
  word: string;
  written: string;
  // Posição na grade (por tamanho, depois alfabética).
  index: number;
}

// Progresso do dia, guardado no aparelho (o Embaralha não tem ranking).
interface Progress {
  found: FoundWord[];
  extras: string[];
  // Respostas reveladas quando a pessoa desiste.
  revealed: { word: string; written: string }[] | null;
  startedAt: number | null;
  finishedAt: number | null;
}

const EMPTY: Progress = { found: [], extras: [], revealed: null, startedAt: null, finishedAt: null };
const storageKey = (date: string) => `typebattle_embaralha_${date}`;

function readProgress(date: string): Progress {
  try {
    const value = localStorage.getItem(storageKey(date));
    if (!value) return EMPTY;
    const saved = { ...EMPTY, ...(JSON.parse(value) as Progress) };
    // Versões antigas não guardavam a posição na grade.
    return { ...saved, found: saved.found.filter((item) => typeof item.index === "number") };
  } catch {
    return EMPTY;
  }
}

function saveProgress(date: string, progress: Progress) {
  try {
    localStorage.setItem(storageKey(date), JSON.stringify(progress));
  } catch {
    // Sem armazenamento: o progresso só não fica salvo.
  }
}

// Pontos: um por letra; a palavra com todas as letras vale o dobro.
function pointsFor(word: string, total: number): number {
  return word.length === total ? word.length * 2 : word.length;
}

function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 3600)} h ${String(Math.floor((total % 3600) / 60)).padStart(2, "0")} min`;
}

const pop = keyframes`
  0% { transform: scale(.6); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
`;
const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  25%, 75% { transform: translateX(-5px); }
  50% { transform: translateX(5px); }
`;
const NO_MOTION = { "@media (prefers-reduced-motion: reduce)": { animation: "none" } };

function useViewportWidth(): number {
  const [width, setWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return width;
}

// Tamanho das casinhas e quantas colunas cabem sem precisar rolar.
function gridLayout(viewport: number, longest: number) {
  const size = viewport >= 900 ? 24 : viewport >= 600 ? 20 : viewport >= 420 ? 17 : 14;
  const gap = 16;
  const column = longest * (size + 3) + gap;
  // Margens da página e do cartão.
  const available = Math.min(viewport, 1100) - (viewport >= 600 ? 112 : 64);
  const columns = Math.max(2, Math.min(6, Math.floor((available + gap) / column)));
  return { size, columns, columnWidth: longest * (size + 3) };
}

function Stat({ label, value, color = "#fff" }: { label: string; value: string | number; color?: string }) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
      <Typography sx={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: MUTED, fontWeight: 700 }}>
        {label}
      </Typography>
      <Box
        sx={{
          minWidth: 70,
          px: 1.5,
          py: 0.5,
          borderRadius: "8px",
          bgcolor: "#12141a",
          border: "1px solid #2e3240",
          fontFamily: MONO_FONT,
          fontWeight: 800,
          fontSize: 20,
          textAlign: "center",
          color,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </Box>
    </Stack>
  );
}

type SlotTone = "empty" | "found" | "full" | "missed";
const SLOT_COLORS: Record<SlotTone, { bg: string; border: string; color: string }> = {
  empty: { bg: "#23262e", border: "#2e3240", color: "transparent" },
  found: { bg: "rgba(124,77,255,.22)", border: "rgba(124,77,255,.6)", color: "#f1ecff" },
  full: { bg: "#7c4dff", border: "#7c4dff", color: "#fff" },
  missed: { bg: "rgba(255,92,122,.1)", border: "rgba(255,92,122,.45)", color: "#ff8aa0" },
};

// Uma palavra da grade: uma casinha por letra.
function Slot({ length, text, tone, size }: { length: number; text?: string; tone: SlotTone; size: number }) {
  const letters = text ? [...text] : [];
  const colors = SLOT_COLORS[tone];
  return (
    <Box sx={{ display: "flex", gap: "3px" }}>
      {Array.from({ length }, (_, i) => (
        <Box
          key={i}
          sx={{
            width: size,
            height: size,
            display: "grid",
            placeItems: "center",
            borderRadius: "4px",
            bgcolor: colors.bg,
            border: "1px solid",
            borderColor: colors.border,
            color: colors.color,
            fontFamily: MONO_FONT,
            fontWeight: 800,
            fontSize: size * 0.58,
            textTransform: "uppercase",
            lineHeight: 1,
            animation: tone === "found" || tone === "full" ? `${pop} 200ms ease ${i * 35}ms both` : "none",
            ...NO_MOTION,
          }}
        >
          {letters[i] ?? ""}
        </Box>
      ))}
    </Box>
  );
}

const sideButtonSx = {
  width: 48,
  height: 44,
  borderRadius: "10px",
  bgcolor: "#23262e",
  color: "#d5d7de",
  "&:hover": { bgcolor: "#2c3039" },
};

export function Embaralha() {
  const [daily, setDaily] = useState<EmbaralhaDaily | null>(null);
  const [loadError, setLoadError] = useState("");
  const [progress, setProgress] = useState<Progress>(EMPTY);
  // Ordem em que as letras aparecem (o embaralhar só mexe nisto).
  const [order, setOrder] = useState<number[]>([]);
  // Letras escolhidas, pela posição em daily.letters.
  const [picked, setPicked] = useState<number[]>([]);
  const [message, setMessage] = useState<{ text: string; tone: "ok" | "error" | "info" }>({ text: "", tone: "info" });
  const [shakeKey, setShakeKey] = useState(0);
  const [sending, setSending] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [offset, setOffset] = useState(0);
  const viewport = useViewportWidth();

  useEffect(() => {
    let active = true;
    getEmbaralha()
      .then((response) => {
        if (!active) return;
        setDaily(response);
        setOffset(response.serverNow - Date.now());
        setOrder(response.letters.map((_, i) => i));
        setProgress(readProgress(response.date));
      })
      .catch((error: unknown) => active && setLoadError(error instanceof Error ? error.message : "Erro ao carregar."));
    return () => {
      active = false;
    };
  }, []);

  const done = Boolean(daily && (progress.revealed || progress.found.length >= daily.total));
  const playing = Boolean(daily) && !done;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), playing && progress.startedAt ? 1000 : 30_000);
    return () => window.clearInterval(timer);
  }, [playing, progress.startedAt]);

  function update(next: Progress) {
    if (!daily) return;
    setProgress(next);
    saveProgress(daily.date, next);
  }

  function pick(index: number) {
    if (!playing || picked.includes(index)) return;
    setPicked([...picked, index]);
  }

  function erase() {
    setPicked(picked.slice(0, -1));
  }

  function shuffle() {
    setOrder((current) => {
      const next = [...current];
      for (let i = next.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
      }
      return next;
    });
  }

  async function send() {
    if (!daily || !playing || sending || picked.length === 0) return;
    const word = picked.map((index) => daily.letters[index]).join("");
    const startedAt = progress.startedAt ?? Date.now();

    if (word.length < 3) {
      setMessage({ text: "Use pelo menos 3 letras.", tone: "error" });
      setShakeKey((key) => key + 1);
      return;
    }
    if (progress.found.some((item) => item.word === word) || progress.extras.includes(word)) {
      setMessage({ text: "Essa você já achou.", tone: "info" });
      setPicked([]);
      return;
    }

    setSending(true);
    try {
      const result = await guessEmbaralha(word, daily.date);
      if (result.result === "found" && typeof result.index === "number") {
        const found = [...progress.found, { word, written: result.written ?? word, index: result.index }];
        const finishedAt = found.length >= daily.total ? Date.now() : null;
        update({ ...progress, found, startedAt, finishedAt });
        const label = (result.written ?? word).toUpperCase();
        const gained = pointsFor(word, daily.letters.length);
        setMessage({
          text: result.full ? `${label}! Todas as letras: +${gained}` : `${label} +${gained}`,
          tone: "ok",
        });
        setPicked([]);
      } else if (result.result === "extra") {
        update({ ...progress, extras: [...progress.extras, word], startedAt });
        setMessage({ text: `"${word}" existe, mas não está na lista de hoje.`, tone: "info" });
        setPicked([]);
      } else {
        update({ ...progress, startedAt });
        setMessage({ text: `"${word}" não está no dicionário.`, tone: "error" });
        setShakeKey((key) => key + 1);
      }
    } catch (error) {
      if (error instanceof ApiError && error.code === "DAY_CHANGED") {
        setMessage({ text: "Já saiu o desafio de hoje. Recarregue a página.", tone: "error" });
      } else {
        setMessage({ text: error instanceof Error ? error.message : "Erro ao conferir.", tone: "error" });
      }
    } finally {
      setSending(false);
    }
  }

  async function reveal() {
    if (!daily || progress.revealed) return;
    if (!window.confirm("Mostrar todas as palavras de hoje? O desafio acaba.")) return;
    try {
      const response = await revealEmbaralha(daily.date);
      update({ ...progress, revealed: response.answers, finishedAt: Date.now() });
      setPicked([]);
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Erro ao revelar.", tone: "error" });
    }
  }

  // Teclado físico: letras do dia, Backspace e Enter.
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (!daily || !playing || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === "Enter") {
      event.preventDefault();
      void send();
      return;
    }
    if (event.key === "Backspace") {
      event.preventDefault();
      erase();
      return;
    }
    const char = event.key.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
    if (char.length !== 1 || !/[a-z]/.test(char)) return;
    // A próxima letra igual ainda não usada, na ordem em que aparece na tela.
    const index = order.find((i) => daily.letters[i] === char && !picked.includes(i));
    if (index !== undefined) {
      event.preventDefault();
      pick(index);
    }
  });
  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (loadError) {
    return (
      <Container maxWidth="md" sx={{ py: 5 }}>
        <Alert severity="error">{loadError}</Alert>
      </Container>
    );
  }

  const total = daily?.letters.length ?? 7;
  const points = progress.found.reduce((sum, item) => sum + pointsFor(item.word, total), 0);
  const elapsed = progress.startedAt ? (progress.finishedAt ?? now) - progress.startedAt : 0;
  const foundByIndex = new Map(progress.found.map((item) => [item.index, item]));
  const revealedWords = progress.revealed ?? [];
  const longest = daily ? Math.max(...daily.slots) : 7;
  const { size: slotSize, columns, columnWidth } = gridLayout(viewport, longest);
  const rows = daily ? Math.ceil(daily.slots.length / columns) : 0;
  const tileSize = { xs: 36, sm: 56 };
  const messageColor = message.tone === "error" ? "#ff8aa0" : message.tone === "ok" ? "#c9b6ff" : MUTED;

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
      <Stack spacing={2.5} sx={{ maxWidth: 1100, mx: "auto" }}>
        <Stack spacing={0.5}>
          <Button
            component={Link}
            to="/arcade"
            startIcon={<ArrowBackRoundedIcon />}
            size="small"
            sx={{ alignSelf: "flex-start", color: MUTED, px: 0.5, minWidth: 0 }}
          >
            Arcade
          </Button>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
            Embaralha
          </Typography>
          <Typography variant="body2" sx={{ color: MUTED, maxWidth: "64ch" }}>
            Forme palavras de 3 letras ou mais com as letras do dia (cada uma uma vez): clique nas letras ou digite, e
            aperte Enviar ou Enter. Uma das palavras usa todas as letras. Desafio novo todo dia.
          </Typography>
        </Stack>

        <Box sx={{ bgcolor: "#181b21", border: "1px solid #23262e", borderRadius: "14px", overflow: "hidden" }}>
          {!daily ? (
            <Box sx={{ py: 8, display: "grid", placeItems: "center" }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* Placar */}
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: { xs: 1.25, sm: 3 },
                  px: { xs: 1.5, sm: 3 },
                  py: 1.5,
                  borderBottom: "1px solid #23262e",
                }}
              >
                <Stat label="Pontos" value={points} color="#c9b6ff" />
                <Stat label="Palavras" value={`${progress.found.length}/${daily.total}`} />
                <Stat label="Tempo" value={formatClock(elapsed)} />
              </Box>

              {/* Grade das palavras: colunas, por tamanho e depois em ordem alfabética */}
              <Box sx={{ px: { xs: 1.5, sm: 3 }, py: 2.5, overflowX: "auto", borderBottom: "1px solid #23262e" }}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateRows: `repeat(${rows}, auto)`,
                    gridAutoFlow: "column",
                    gridAutoColumns: `${columnWidth}px`,
                    columnGap: 2,
                    rowGap: "6px",
                    // Centraliza quando cabe; quando não cabe, rola sem cortar o começo.
                    width: "max-content",
                    mx: "auto",
                  }}
                >
                  {daily.slots.map((length, index) => {
                    const found = foundByIndex.get(index);
                    const missed = found ? undefined : revealedWords[index];
                    const tone: SlotTone = found ? (length === total ? "full" : "found") : missed ? "missed" : "empty";
                    return (
                      <Slot key={index} length={length} text={found?.written ?? missed?.written} tone={tone} size={slotSize} />
                    );
                  })}
                </Box>
              </Box>

              {/* Montagem da palavra */}
              <Stack spacing={2} sx={{ alignItems: "center", px: { xs: 1, sm: 3 }, py: 3 }}>
                {done ? (
                  <Stack spacing={1} sx={{ alignItems: "center", textAlign: "center" }}>
                    <Typography variant="h5" sx={{ fontWeight: 800 }}>
                      {progress.revealed ? "Fim do desafio" : "Achou todas!"}
                    </Typography>
                    <Typography sx={{ color: MUTED }}>
                      {progress.found.length} de {daily.total} palavras · {points} pontos · {formatClock(elapsed)}
                      {progress.revealed && ". Em vermelho, as que faltaram."}
                    </Typography>
                  </Stack>
                ) : (
                  <>
                    <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                      <Stack spacing={1} sx={{ display: { xs: "none", sm: "flex" } }}>
                        <ButtonBase aria-label="Apagar" onClick={erase} sx={sideButtonSx}>
                          <BackspaceOutlinedIcon fontSize="small" />
                        </ButtonBase>
                        <ButtonBase aria-label="Embaralhar a ordem das letras" onClick={shuffle} sx={sideButtonSx}>
                          <ShuffleRoundedIcon fontSize="small" />
                        </ButtonBase>
                      </Stack>

                      <Stack spacing={1.25}>
                        {/* Casas da palavra que está sendo montada (clicar numa volta até ela) */}
                        <Stack
                          key={shakeKey}
                          direction="row"
                          spacing={{ xs: 0.5, sm: 1 }}
                          sx={{ animation: shakeKey > 0 ? `${shake} 300ms ease` : "none", ...NO_MOTION }}
                        >
                          {Array.from({ length: total }, (_, i) => {
                            const index = picked[i];
                            const filled = index !== undefined;
                            return (
                              <Box
                                key={i}
                                onClick={() => filled && setPicked(picked.slice(0, i))}
                                sx={{
                                  width: tileSize,
                                  height: tileSize,
                                  display: "grid",
                                  placeItems: "center",
                                  borderRadius: "10px",
                                  border: "2px dashed",
                                  borderColor: filled ? "transparent" : "#343844",
                                  bgcolor: filled ? "#f1ecff" : "#12141a",
                                  color: "#1a1030",
                                  fontFamily: MONO_FONT,
                                  fontWeight: 800,
                                  fontSize: { xs: 20, sm: 28 },
                                  textTransform: "uppercase",
                                  cursor: filled ? "pointer" : "default",
                                }}
                              >
                                {filled ? daily.letters[index] : ""}
                              </Box>
                            );
                          })}
                        </Stack>

                        {/* Letras do dia */}
                        <Stack direction="row" spacing={{ xs: 0.5, sm: 1 }}>
                          {order.map((index) => {
                            const used = picked.includes(index);
                            return (
                              <ButtonBase
                                key={index}
                                onClick={() => pick(index)}
                                disabled={used}
                                sx={{
                                  width: tileSize,
                                  height: tileSize,
                                  borderRadius: "10px",
                                  fontFamily: MONO_FONT,
                                  fontWeight: 800,
                                  fontSize: { xs: 20, sm: 28 },
                                  textTransform: "uppercase",
                                  color: used ? "transparent" : "#fff",
                                  bgcolor: used ? "#1d2027" : "#7c4dff",
                                  boxShadow: used ? "none" : "0 5px 0 #4b27b8",
                                  transition: "background-color 120ms ease, transform 80ms ease",
                                  "&:active": { transform: "translateY(2px)" },
                                }}
                              >
                                {daily.letters[index]}
                              </ButtonBase>
                            );
                          })}
                        </Stack>
                      </Stack>

                      <Button
                        variant="contained"
                        onClick={() => void send()}
                        disabled={sending || picked.length === 0}
                        sx={{ display: { xs: "none", sm: "inline-flex" }, alignSelf: "stretch", minWidth: 96, borderRadius: "10px", fontWeight: 800 }}
                      >
                        Enviar
                      </Button>
                    </Stack>
                    {/* Celular: os botões ficam numa linha embaixo das letras */}
                    <Stack direction="row" spacing={1} sx={{ display: { xs: "flex", sm: "none" }, width: "100%", maxWidth: 320 }}>
                      <ButtonBase aria-label="Apagar" onClick={erase} sx={sideButtonSx}>
                        <BackspaceOutlinedIcon fontSize="small" />
                      </ButtonBase>
                      <ButtonBase aria-label="Embaralhar a ordem das letras" onClick={shuffle} sx={sideButtonSx}>
                        <ShuffleRoundedIcon fontSize="small" />
                      </ButtonBase>
                      <Button
                        variant="contained"
                        onClick={() => void send()}
                        disabled={sending || picked.length === 0}
                        sx={{ flex: 1, borderRadius: "10px", fontWeight: 800 }}
                      >
                        Enviar
                      </Button>
                    </Stack>
                    <Typography sx={{ minHeight: 22, fontSize: 14, fontWeight: 600, color: messageColor, textAlign: "center" }}>
                      {message.text}
                    </Typography>
                  </>
                )}

                {progress.extras.length > 0 && (
                  <Typography sx={{ fontSize: 13, color: MUTED, textAlign: "center" }}>
                    Extras (não contam): {progress.extras.join(", ")}
                  </Typography>
                )}

                <Stack direction="row" spacing={2} sx={{ alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
                  {!done && (
                    <Button onClick={reveal} startIcon={<VisibilityRoundedIcon />} sx={{ color: MUTED }}>
                      Desistir e ver as palavras
                    </Button>
                  )}
                  <Typography variant="body2" sx={{ color: MUTED, fontFamily: MONO_FONT }}>
                    Próximo desafio em {formatCountdown(daily.nextAt - (now + offset))}
                  </Typography>
                </Stack>
              </Stack>
            </>
          )}
        </Box>
      </Stack>
    </Container>
  );
}
