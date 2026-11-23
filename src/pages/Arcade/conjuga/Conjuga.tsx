import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import { Box, Button, Container, Stack, Typography } from "@mui/material";
import { keyframes } from "@mui/material/styles";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import SkipNextRoundedIcon from "@mui/icons-material/SkipNextRounded";

import { useAuth } from "../../../contexts/useAuth";
import {
  finishConjuga,
  guessConjuga,
  skipConjuga,
  startConjuga,
  type ConjugaState,
} from "../../../services/api";

// Conjuga: aparece um verbo e a pessoa digita as conjugações. A tabela mostra
// uma casinha por letra de cada forma (dá para ver o tamanho de cada uma) e as
// casinhas se preenchem quando a forma é aceita.

const MONO_FONT = "'JetBrains Mono', ui-monospace, monospace";
const MUTED = "#a0a4ad";
const RECORD_KEY = "typebattle_conjuga_record";
const START_MS = 90_000;
// Casinhas da palavra digitada: começam com 8 e crescem até 14 (o maior
// verbo conjugado cabe com folga).
const INPUT_SLOTS = 14;

const TENSES: { key: string; label: string }[] = [
  { key: "presente", label: "Presente" },
  { key: "perfeito", label: "Pretérito perfeito" },
  { key: "imperfeito", label: "Pretérito imperfeito" },
  { key: "futuro", label: "Futuro" },
  { key: "condicional", label: "Futuro do pretérito" },
  { key: "subjuntivo", label: "Presente do subjuntivo" },
];
const PERSONS = ["eu", "tu", "ele", "nós", "eles"];
// No subjuntivo a pessoa vem com "que".
const SUBJUNCTIVE_PERSONS = ["que eu", "que tu", "que ele", "que nós", "que eles"];

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

function readRecord(): number {
  try {
    return Number(localStorage.getItem(RECORD_KEY)) || 0;
  } catch {
    return 0;
  }
}

function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

// Largura de um elemento, acompanhando mudanças de tamanho.
function useWidth<T extends HTMLElement>(): [(node: T | null) => void, number] {
  const [width, setWidth] = useState(0);
  const observer = useRef<ResizeObserver | null>(null);
  const ref = useCallback((node: T | null) => {
    observer.current?.disconnect();
    if (!node) return;
    setWidth(node.getBoundingClientRect().width);
    observer.current = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.current.observe(node);
  }, []);
  return [ref, width];
}

// Quantos cartões de tempo por linha e o tamanho das casinhas para caber.
// Nome da pessoa (62) + espaço (8) + uma casinha por letra (tamanho + 3).
function tableLayout(width: number, longest: number) {
  const gap = 12;
  const padding = 26;
  const fits = (columns: number, size: number) =>
    (width - gap * (columns - 1)) / columns - padding >= 70 + longest * (size + 3);
  for (const columns of [3, 2]) {
    if (fits(columns, 18)) {
      let size = 22;
      while (size > 18 && !fits(columns, size)) size -= 1;
      return { columns, size };
    }
  }
  const size = Math.floor((width - padding - 70) / longest) - 3;
  return { columns: 1, size: Math.max(12, Math.min(22, size)) };
}

function Stat({ label, value, color = "#fff" }: { label: string; value: string | number; color?: string }) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
      <Typography sx={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: MUTED, fontWeight: 700 }}>
        {label}
      </Typography>
      <Box
        sx={{
          minWidth: 64,
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

type SlotTone = "empty" | "found" | "missed";
const SLOT_COLORS: Record<SlotTone, { bg: string; border: string; color: string }> = {
  empty: { bg: "#23262e", border: "#2e3240", color: "transparent" },
  found: { bg: "rgba(124,77,255,.22)", border: "rgba(124,77,255,.6)", color: "#f1ecff" },
  missed: { bg: "rgba(255,92,122,.1)", border: "rgba(255,92,122,.45)", color: "#ff8aa0" },
};

// Uma forma: uma casinha por letra.
function Slot({ length, text, tone, size, animate }: { length: number; text?: string; tone: SlotTone; size: number; animate: boolean }) {
  const letters = text ? [...text] : [];
  const colors = SLOT_COLORS[tone];
  return (
    <Box sx={{ display: "flex", gap: "3px", flexWrap: "nowrap" }}>
      {Array.from({ length }, (_, i) => (
        <Box
          key={i}
          sx={{
            width: size,
            height: size,
            flexShrink: 0,
            display: "grid",
            placeItems: "center",
            borderRadius: "4px",
            bgcolor: colors.bg,
            border: "1px solid",
            borderColor: colors.border,
            color: colors.color,
            fontFamily: MONO_FONT,
            fontWeight: 800,
            fontSize: size * 0.6,
            textTransform: "uppercase",
            lineHeight: 1,
            animation: animate ? `${pop} 200ms ease ${i * 30}ms both` : "none",
            ...NO_MOTION,
          }}
        >
          {letters[i] ?? ""}
        </Box>
      ))}
    </Box>
  );
}

interface TableProps {
  lengths: Record<string, number>;
  filled: Record<string, string>;
  // No fim: todas as formas (as que faltaram aparecem em vermelho).
  solution?: Record<string, string> | null;
  fresh: string[];
}

function VerbTable({ lengths, filled, solution, fresh }: TableProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const longest = Math.max(...Object.values(lengths), 6);
  const { columns, size } = tableLayout(width, longest);

  function row(cell: string, person: string) {
    const found = filled[cell];
    const missed = !found ? solution?.[cell] : undefined;
    return (
      <Stack key={cell} direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Typography sx={{ width: 62, flexShrink: 0, fontSize: 12, color: MUTED, textAlign: "right" }}>{person}</Typography>
        <Slot
          length={lengths[cell] ?? 0}
          text={found ?? missed}
          tone={found ? "found" : missed ? "missed" : "empty"}
          size={size}
          animate={fresh.includes(cell)}
        />
      </Stack>
    );
  }

  return (
    <Box ref={ref} sx={{ width: "100%", display: "grid", gap: 1.5, gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {TENSES.map((tense) => {
        const cells = PERSONS.map((_, person) => `${tense.key}:${person}`);
        const complete = cells.every((cell) => filled[cell]);
        const persons = tense.key === "subjuntivo" ? SUBJUNCTIVE_PERSONS : PERSONS;
        return (
          <Box
            key={tense.key}
            sx={{
              bgcolor: "#12141a",
              borderRadius: "10px",
              p: 1.5,
              border: "1px solid",
              borderColor: complete ? "rgba(124,77,255,.6)" : "#23262e",
              overflow: "hidden",
            }}
          >
            <Typography sx={{ fontWeight: 800, fontSize: 13, mb: 1, color: complete ? "#c9b6ff" : "#d5d7de" }}>
              {tense.label}
            </Typography>
            <Stack spacing={0.6}>{cells.map((cell, person) => row(cell, persons[person]))}</Stack>
          </Box>
        );
      })}
      <Box
        sx={{
          bgcolor: "#12141a",
          borderRadius: "10px",
          p: 1.5,
          border: "1px solid #23262e",
          gridColumn: `span ${columns}`,
          display: "flex",
          flexWrap: "wrap",
          gap: 3,
          rowGap: 1,
        }}
      >
        {row("gerundio", "gerúndio")}
        {row("participio", "particípio")}
      </Box>
    </Box>
  );
}

export function Conjuga() {
  const { token } = useAuth();
  const [run, setRun] = useState<ConjugaState | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "ok" | "error" | "info" }>({ text: "", tone: "info" });
  const [fresh, setFresh] = useState<string[]>([]);
  const [shakeKey, setShakeKey] = useState(0);
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [record, setRecord] = useState(readRecord);
  const [newRecord, setNewRecord] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const finishingRef = useRef(false);

  const playing = Boolean(run && !run.finished);
  const timeLeft = run ? run.endsAt - (now + offset) : START_MS;

  const apply = useCallback(
    (next: ConjugaState) => {
      setOffset(next.serverNow - Date.now());
      setRun(next);
      if (next.finished && next.score > record) {
        setRecord(next.score);
        setNewRecord(true);
        try {
          localStorage.setItem(RECORD_KEY, String(next.score));
        } catch {
          // Sem armazenamento, só não lembra o recorde.
        }
      }
    },
    [record],
  );

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, [playing]);

  // Tempo acabou: o servidor encerra e grava.
  useEffect(() => {
    if (!run || run.finished || timeLeft > 0 || finishingRef.current) return;
    finishingRef.current = true;
    finishConjuga(run.id)
      .then(apply)
      .catch(() => setMessage({ text: "Não foi possível encerrar a partida.", tone: "error" }))
      .finally(() => {
        finishingRef.current = false;
      });
  }, [run, timeLeft, apply]);

  async function start() {
    setBusy(true);
    setNewRecord(false);
    setMessage({ text: "", tone: "info" });
    setFresh([]);
    setInput("");
    try {
      apply(await startConjuga(token));
      setNow(Date.now());
      window.setTimeout(() => inputRef.current?.focus(), 0);
    } catch (error) {
      setMessage({ text: errorMessage(error, "Não foi possível começar."), tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    const word = input.trim();
    if (!run || !playing || !word) return;
    setInput("");
    try {
      const result = await guessConjuga(run.id, word);
      apply(result);
      if (result.result === "ok") {
        setFresh(result.cells ?? []);
        const parts = [`${(result.written ?? word).toUpperCase()} +${result.cells?.length ?? 1}`];
        if (result.completedVerb) parts.push(`${result.completedVerb.toUpperCase()} completo! +15 s`);
        else if (result.completedTenses?.length) parts.push(`tempo completo! +${(result.bonusMs ?? 0) / 1000} s`);
        setMessage({ text: parts.join(" · "), tone: "ok" });
      } else if (result.result === "repeated") {
        setMessage({ text: `"${word}" já foi.`, tone: "info" });
      } else if (result.result === "wrong") {
        setMessage({ text: `"${word}" não é forma de ${run.verb.toUpperCase()}.`, tone: "error" });
        setShakeKey((key) => key + 1);
      }
    } catch (error) {
      setMessage({ text: errorMessage(error, "Não foi possível conferir."), tone: "error" });
    }
  }

  async function skip() {
    if (!run || !playing) return;
    try {
      apply(await skipConjuga(run.id));
      setFresh([]);
      setMessage({ text: "Verbo pulado (−5 s).", tone: "info" });
      inputRef.current?.focus();
    } catch (error) {
      setMessage({ text: errorMessage(error, "Não foi possível pular."), tone: "error" });
    }
  }

  const filledCount = run ? Object.keys(run.filled).length : 0;
  const messageColor = message.tone === "error" ? "#ff8aa0" : message.tone === "ok" ? "#c9b6ff" : MUTED;
  const typed = [...input];
  const inputTile = { xs: 21, sm: 34 };

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
            Conjuga
          </Typography>
          <Typography variant="body2" sx={{ color: MUTED, maxWidth: "64ch" }}>
            Aparece um verbo: digite as conjugações dele e aperte Enter ou espaço. Cada casinha é uma letra, então dá
            para ver o tamanho de cada forma. Completar um tempo soma 3 s e o verbo inteiro soma 15 s. Acento é opcional.
          </Typography>
        </Stack>

        <Box sx={{ bgcolor: "#181b21", border: "1px solid #23262e", borderRadius: "14px", overflow: "hidden" }}>
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
            <Stat label="Formas" value={run?.score ?? 0} color="#c9b6ff" />
            <Stat label="Tempo" value={formatClock(Math.max(0, timeLeft))} color={playing && timeLeft <= 15_000 ? "#ff5c7a" : "#fff"} />
            <Stat label="Verbos" value={run?.verbsDone ?? 0} />
            <Stat label="Recorde" value={record} color={MUTED} />
          </Box>

          {playing && run && (
            <>
              {/* Verbo */}
              <Stack spacing={1.5} sx={{ px: { xs: 1.5, sm: 3 }, pt: 2.5, pb: 1.5 }}>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "baseline", justifyContent: "center", flexWrap: "wrap" }}>
                  <Typography sx={{ fontFamily: MONO_FONT, fontWeight: 800, fontSize: { xs: 30, sm: 40 }, letterSpacing: ".06em", textTransform: "uppercase" }}>
                    {run.verb}
                  </Typography>
                  <Typography variant="body2" sx={{ color: MUTED }}>
                    {filledCount}/{run.totalCells}
                    {run.irregular ? " · irregular" : ""}
                  </Typography>
                </Stack>
              </Stack>

              {/* Palavra digitada (logo abaixo do verbo, para o tempo e o verbo ficarem à vista) */}
              <Stack spacing={1.5} sx={{ alignItems: "center", px: { xs: 1, sm: 3 }, pb: 2.5 }}>
                <Stack direction="row" spacing={{ xs: 1, sm: 2 }} sx={{ alignItems: "center", width: "100%", justifyContent: "center" }}>
                  <Box
                    component="form"
                    onSubmit={submit}
                    onClick={() => inputRef.current?.focus()}
                    sx={{ position: "relative", cursor: "text" }}
                  >
                    {/* Casinhas com o que foi digitado; o campo de verdade fica por cima, invisível
                        (assim o teclado do celular também abre). */}
                    <Stack
                      key={shakeKey}
                      direction="row"
                      spacing={{ xs: 0.4, sm: 0.6 }}
                      sx={{ animation: shakeKey > 0 ? `${shake} 300ms ease` : "none", ...NO_MOTION }}
                    >
                      {Array.from({ length: Math.min(INPUT_SLOTS, Math.max(8, typed.length + 1)) }, (_, i) => (
                        <Box
                          key={i}
                          sx={{
                            width: inputTile,
                            height: { xs: 34, sm: 46 },
                            display: "grid",
                            placeItems: "center",
                            borderRadius: "8px",
                            border: "2px dashed",
                            borderColor: typed[i] ? "transparent" : i === typed.length ? "#a78bfa" : "#343844",
                            bgcolor: typed[i] ? "#f1ecff" : "#12141a",
                            color: "#1a1030",
                            fontFamily: MONO_FONT,
                            fontWeight: 800,
                            fontSize: { xs: 15, sm: 22 },
                            textTransform: "uppercase",
                          }}
                        >
                          {typed[i] ?? ""}
                        </Box>
                      ))}
                    </Stack>
                    <Box
                      component="input"
                      ref={inputRef}
                      value={input}
                      autoFocus
                      autoComplete="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      aria-label="Conjugação"
                      maxLength={INPUT_SLOTS}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setInput(event.target.value.replace(/\s/g, ""))}
                      onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                        // Espaço também envia: dá para digitar uma forma atrás da outra.
                        if (event.key === " ") {
                          event.preventDefault();
                          void submit();
                        }
                      }}
                      sx={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        opacity: 0,
                        border: 0,
                        p: 0,
                        fontSize: 16,
                        caretColor: "transparent",
                        cursor: "text",
                      }}
                    />
                  </Box>
                </Stack>
                <Stack direction="row" spacing={1} sx={{ width: "100%", maxWidth: 360 }}>
                  <Button
                    variant="outlined"
                    onClick={skip}
                    startIcon={<SkipNextRoundedIcon />}
                    sx={{ borderColor: "#343844", color: "#d5d7de", borderRadius: "10px" }}
                  >
                    Pular
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => void submit()}
                    disabled={!input.trim()}
                    sx={{ flex: 1, borderRadius: "10px", fontWeight: 800 }}
                  >
                    Enviar
                  </Button>
                </Stack>
                <Typography sx={{ minHeight: 22, fontSize: 14, fontWeight: 600, color: messageColor, textAlign: "center" }}>
                  {message.text}
                </Typography>

                {run.previous && run.previous.filled.length < Object.keys(run.previous.cells).length && (
                  <Box sx={{ width: "100%", color: MUTED, fontSize: 13, textAlign: "center" }}>
                    Faltou em{" "}
                    <Box component="span" sx={{ color: "#fff", fontWeight: 700, textTransform: "uppercase" }}>
                      {run.previous.verb}
                    </Box>
                    :{" "}
                    {Object.entries(run.previous.cells)
                      .filter(([cell]) => !run.previous?.filled.includes(cell))
                      .map(([, form]) => form)
                      .filter((form, index, list) => list.indexOf(form) === index)
                      .join(", ")}
                  </Box>
                )}
              </Stack>

              {/* Tabela do verbo */}
              <Box sx={{ px: { xs: 1.5, sm: 3 }, py: 2.5, borderTop: "1px solid #23262e" }}>
                <VerbTable lengths={run.lengths} filled={run.filled} fresh={fresh} />
              </Box>
            </>
          )}

          {!playing && (
            <Stack spacing={2} sx={{ alignItems: "center", textAlign: "center", px: { xs: 1.5, sm: 3 }, py: 3 }}>
              {run?.finished ? (
                <>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>
                    {newRecord ? "Novo recorde!" : "Fim de jogo"}
                  </Typography>
                  <Typography sx={{ color: MUTED }}>
                    {run.score} {run.score === 1 ? "forma" : "formas"} · {run.verbsDone}{" "}
                    {run.verbsDone === 1 ? "verbo completo" : "verbos completos"}.
                    {!token && run.score > 0 && " Entre na sua conta para ir para o ranking."}
                  </Typography>
                  <Typography sx={{ fontWeight: 700 }}>
                    Último verbo:{" "}
                    <Box component="span" sx={{ textTransform: "uppercase", color: "#c9b6ff" }}>
                      {run.verb}
                    </Box>{" "}
                    <Box component="span" sx={{ color: "#ff8aa0", fontWeight: 500, fontSize: 13 }}>
                      (em vermelho, o que faltou)
                    </Box>
                  </Typography>
                  <VerbTable lengths={run.lengths} filled={run.filled} solution={run.solution} fresh={[]} />
                </>
              ) : (
                <Typography sx={{ color: MUTED, maxWidth: "56ch" }}>
                  Você tem 90 segundos. Vale presente, pretérito perfeito e imperfeito, futuro, futuro do pretérito,
                  presente do subjuntivo, gerúndio e particípio. Travou num verbo? Pule (custa 5 s).
                </Typography>
              )}
              {message.tone === "error" && (
                <Typography sx={{ color: "#ff8aa0", fontSize: 14 }}>{message.text}</Typography>
              )}
              <Stack direction="row" spacing={1.5}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={run?.finished ? <ReplayRoundedIcon /> : <PlayArrowRoundedIcon />}
                  onClick={start}
                  disabled={busy}
                >
                  {run?.finished ? "Jogar de novo" : "Começar"}
                </Button>
                <Button
                  component={Link}
                  to="/ranking?tipo=conjuga"
                  size="large"
                  variant="outlined"
                  startIcon={<EmojiEventsRoundedIcon />}
                  sx={{ borderColor: "#343844", color: "#d5d7de" }}
                >
                  Ranking
                </Button>
              </Stack>
            </Stack>
          )}
        </Box>
      </Stack>
    </Container>
  );
}
