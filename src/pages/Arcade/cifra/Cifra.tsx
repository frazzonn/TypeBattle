import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Alert, Avatar, Box, Button, CircularProgress, Container, Stack, Typography } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import TimerOutlinedIcon from "@mui/icons-material/TimerOutlined";

import { useAuth } from "../../../contexts/useAuth";
import {
  ApiError,
  finishCifraRun,
  getCifraDaily,
  getCifraDailyRanking,
  guessCifraDaily,
  guessCifraRun,
  startCifraDaily,
  startCifraRun,
  type CifraDailyRankingEntry,
  type CifraDailyState,
  type CifraRunState,
} from "../../../services/api";
import { formatClock, keyMarks, MARK_COLORS, MONO_FONT, MUTED, useWordInput } from "./cifraLogic";
import { Board, Keyboard } from "./cifraUi";

// Modos (?modo=): sem modo mostra a tela de escolha; "relogio" é o contra o
// relógio; 1, 2 e 4 são o diário com uma, duas ou quatro palavras.
type Mode = "relogio" | "1" | "2" | "4";
const DAILY_MODES: { value: Mode; label: string; hint: string }[] = [
  { value: "1", label: "Diária", hint: "1 palavra · 6 tentativas" },
  { value: "2", label: "Dupla", hint: "2 palavras · 7 tentativas" },
  { value: "4", label: "Quarteto", hint: "4 palavras · 9 tentativas" },
];

function isMode(value: string | null): value is Mode {
  return value === "relogio" || DAILY_MODES.some((mode) => mode.value === value);
}

// Tamanho das casas conforme quantos tabuleiros aparecem e a largura da tela.
function useTileSize(boards: number): number {
  const [width, setWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const perRow = boards === 4 ? (width >= 900 ? 4 : 2) : boards;
  const available = Math.min(width - 48, 1000) / perRow - 24;
  const max = boards === 1 ? 62 : boards === 2 ? 52 : 40;
  return Math.max(26, Math.min(max, Math.floor(available / 5.6)));
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

const panelSx = {
  position: "relative" as const,
  bgcolor: "#181b21",
  border: "1px solid #23262e",
  borderRadius: "14px",
  px: { xs: 1.5, sm: 4 },
  py: { xs: 2.5, sm: 4 },
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  gap: 2.5,
};

function Stat({ value, label, color = "#fff" }: { value: string | number; label: string; color?: string }) {
  return (
    <Stack sx={{ alignItems: "center" }}>
      <Typography sx={{ fontFamily: MONO_FONT, fontWeight: 800, fontSize: 30, color, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </Typography>
      <Typography sx={{ fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: MUTED }}>
        {label}
      </Typography>
    </Stack>
  );
}

function Message({ text, tone = "info" }: { text: string; tone?: "info" | "error" | "ok" }) {
  const color = tone === "error" ? "#ff8aa0" : tone === "ok" ? "#c9b6ff" : MUTED;
  return (
    <Typography sx={{ minHeight: 22, fontSize: 14, fontWeight: 600, color, textAlign: "center" }}>{text}</Typography>
  );
}

// ---------------------------------------------------------------- página

export function Cifra() {
  const [searchParams, setSearchParams] = useSearchParams();
  const modo = searchParams.get("modo");
  const mode: Mode | null = isMode(modo) ? modo : null;
  const choose = (next: Mode | null) => setSearchParams(next ? { modo: next } : {});

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
      <Stack spacing={3} sx={{ maxWidth: 1100, mx: "auto" }}>
        <Stack spacing={0.5}>
          {mode ? (
            <Button
              onClick={() => choose(null)}
              startIcon={<ArrowBackRoundedIcon />}
              size="small"
              sx={{ alignSelf: "flex-start", color: MUTED, px: 0.5, minWidth: 0 }}
            >
              Modos da Cifra
            </Button>
          ) : (
            <Button
              component={Link}
              to="/arcade"
              startIcon={<ArrowBackRoundedIcon />}
              size="small"
              sx={{ alignSelf: "flex-start", color: MUTED, px: 0.5, minWidth: 0 }}
            >
              Arcade
            </Button>
          )}
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
            {mode === "relogio" ? "Cifra · contra o relógio" : mode ? "Cifra · diário" : "Cifra"}
          </Typography>
          <Typography variant="body2" sx={{ color: MUTED, maxWidth: "62ch" }}>
            Descubra a palavra de 5 letras. A cada palpite, as casas mostram:{" "}
            <Box component="span" sx={{ color: "#b9a3ff", fontWeight: 700 }}>roxo</Box> é a letra no lugar certo,{" "}
            <Box component="span" sx={{ color: MARK_COLORS.present.bg, fontWeight: 700 }}>âmbar</Box> existe em outro
            lugar e cinza não tem na palavra. Acento é opcional.
          </Typography>
        </Stack>

        {!mode && <ModePicker onChoose={choose} />}

        {/* Diário: uma, duas ou quatro palavras */}
        {mode && mode !== "relogio" && (
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {DAILY_MODES.map((item) => {
              const selected = item.value === mode;
              return (
                <Button
                  key={item.value}
                  onClick={() => setSearchParams({ modo: item.value }, { replace: true })}
                  title={item.hint}
                  sx={{
                    px: 2,
                    py: 0.9,
                    borderRadius: "10px",
                    textTransform: "none",
                    fontWeight: 700,
                    color: selected ? "#eee7ff" : "#b7bac8",
                    bgcolor: selected ? "rgba(124,77,255,0.22)" : "transparent",
                    border: "1px solid",
                    borderColor: selected ? "rgba(167,139,250,0.55)" : "rgba(255,255,255,0.1)",
                    "&:hover": { bgcolor: "rgba(124,77,255,0.14)" },
                  }}
                >
                  {item.label}
                </Button>
              );
            })}
          </Box>
        )}

        {mode === "relogio" && <RunGame />}
        {mode && mode !== "relogio" && <DailyGame key={mode} boards={Number(mode)} />}
      </Stack>
    </Container>
  );
}

// ---------------------------------------------------------------- escolha do modo

interface ModeCardProps {
  title: string;
  description: string;
  details: string[];
  icon: ReactNode;
  onClick?: () => void;
  children?: ReactNode;
}

function ModeCard({ title, description, details, icon, onClick, children }: ModeCardProps) {
  return (
    <Box
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(event) => {
        if (onClick && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onClick();
        }
      }}
      sx={{
        bgcolor: "#181b21",
        border: "1px solid #23262e",
        borderRadius: "14px",
        p: 3,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        cursor: onClick ? "pointer" : "default",
        transition: "border-color 180ms ease, transform 180ms ease",
        "&:hover": onClick ? { borderColor: "rgba(167,139,250,0.4)", transform: "translateY(-2px)" } : {},
        "&:focus-visible": { outline: "2px solid #a78bfa", outlineOffset: 3 },
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: "12px",
          display: "grid",
          placeItems: "center",
          bgcolor: "rgba(124,77,255,0.18)",
          color: "#c9b6ff",
        }}
      >
        {icon}
      </Box>
      <Typography variant="h5" sx={{ fontWeight: 800 }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: MUTED }}>
        {description}
      </Typography>
      <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2.25, color: MUTED, fontSize: 14 }}>
        {details.map((detail) => (
          <li key={detail}>{detail}</li>
        ))}
      </Stack>
      {children}
    </Box>
  );
}

function ModePicker({ onChoose }: { onChoose: (mode: Mode) => void }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: 3 }}>
      <ModeCard
        title="Contra o relógio"
        description="Uma palavra atrás da outra. Quantas você descobre antes do tempo acabar?"
        details={[
          "Começa com 2 minutos",
          "Cada acerto soma 20 s, mais 5 s por tentativa que sobrou",
          "Errou as 6 tentativas, acabou",
        ]}
        icon={<TimerOutlinedIcon />}
        onClick={() => onChoose("relogio")}
      >
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" startIcon={<PlayArrowRoundedIcon />} sx={{ alignSelf: "flex-start", mt: 1 }}>
          Jogar
        </Button>
      </ModeCard>
      <ModeCard
        title="Diário"
        description="Um desafio novo por dia, igual para todo mundo, com o tempo contando."
        details={[
          "Muda à meia-noite (horário de Brasília)",
          "Ranking do dia: menos tentativas, depois menos tempo",
        ]}
        icon={<CalendarMonthRoundedIcon />}
      >
        <Box sx={{ flex: 1 }} />
        <Box sx={{ mt: 1, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 1 }}>
          {DAILY_MODES.map((item) => (
            <Button
              key={item.value}
              variant="outlined"
              onClick={() => onChoose(item.value)}
              sx={{
                flexDirection: "column",
                alignItems: "flex-start",
                textTransform: "none",
                borderColor: "rgba(167,139,250,0.35)",
                color: "#eee7ff",
                px: 1.5,
                py: 1,
                minWidth: 0,
                "&:hover": { borderColor: "#a78bfa", bgcolor: "rgba(124,77,255,0.12)" },
              }}
            >
              <Box component="span" sx={{ fontWeight: 800 }}>
                {item.label}
              </Box>
              <Box component="span" sx={{ fontSize: 12, color: MUTED }}>
                {item.hint}
              </Box>
            </Button>
          ))}
        </Box>
      </ModeCard>
    </Box>
  );
}

// ---------------------------------------------------------------- diária

interface GuestSave {
  state: CifraDailyState;
  startedAt: number | null;
  finishedAt: number | null;
}

const guestKey = (date: string, boards: number) => `typebattle_cifra_${date}_${boards}`;

function readGuest(date: string, boards: number): GuestSave | null {
  try {
    const value = localStorage.getItem(guestKey(date, boards));
    return value ? (JSON.parse(value) as GuestSave) : null;
  } catch {
    return null;
  }
}

function writeGuest(save: GuestSave) {
  try {
    localStorage.setItem(guestKey(save.state.date, save.state.boards), JSON.stringify(save));
  } catch {
    // Sem armazenamento: o progresso só não fica salvo.
  }
}

function DailyGame({ boards }: { boards: number }) {
  const { token } = useAuth();
  const [state, setState] = useState<CifraDailyState | null>(null);
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState<{ text: string; tone: "info" | "error" | "ok" }>({ text: "", tone: "info" });
  const [invalid, setInvalid] = useState(0);
  const [sending, setSending] = useState(false);
  // Diferença entre o relógio do servidor e o do aparelho.
  const [offset, setOffset] = useState(0);
  // Convidado: o tempo é medido aqui.
  const [guestTimes, setGuestTimes] = useState<{ startedAt: number | null; finishedAt: number | null }>({
    startedAt: null,
    finishedAt: null,
  });
  const [now, setNow] = useState(() => Date.now());
  const [ranking, setRanking] = useState<CifraDailyRankingEntry[] | null>(null);
  const tileSize = useTileSize(boards);

  const applyState = useCallback((next: CifraDailyState) => {
    setOffset(next.serverNow - Date.now());
    setState(next);
  }, []);

  useEffect(() => {
    let active = true;
    getCifraDaily(boards, token)
      .then((daily) => {
        if (!active) return;
        if (!token) {
          const saved = readGuest(daily.date, boards);
          if (saved) {
            setGuestTimes({ startedAt: saved.startedAt, finishedAt: saved.finishedAt });
            applyState({ ...saved.state, serverNow: daily.serverNow, nextAt: daily.nextAt });
            return;
          }
        }
        applyState(daily);
      })
      .catch((error: unknown) => active && setLoadError(errorMessage(error, "Não foi possível carregar o desafio.")));
    return () => {
      active = false;
    };
  }, [boards, token, applyState]);

  const started = token ? Boolean(state?.started) : guestTimes.startedAt !== null;
  const finished = Boolean(state?.finished);
  const playing = started && !finished;

  // Relógio da tela.
  useEffect(() => {
    if (!playing && !finished) return;
    const timer = window.setInterval(() => setNow(Date.now()), finished ? 1000 : 200);
    return () => window.clearInterval(timer);
  }, [playing, finished]);

  // Ranking do dia, quando a partida acaba.
  useEffect(() => {
    if (!finished) return;
    let active = true;
    getCifraDailyRanking(boards)
      .then((response) => active && setRanking(response.ranking))
      .catch(() => active && setRanking([]));
    return () => {
      active = false;
    };
  }, [finished, boards]);

  const submit = useCallback(
    async (word: string): Promise<boolean> => {
      if (!state || sending) return false;
      setSending(true);
      setMessage({ text: "", tone: "info" });
      try {
        const previous = state.rows.map((row) => row.word);
        const next = await guessCifraDaily(
          boards,
          { guess: word, date: state.date, ...(token ? {} : { previous }) },
          token,
        );
        applyState(next);
        if (!token) {
          const finishedAt = next.finished ? Date.now() : null;
          const times = { startedAt: guestTimes.startedAt, finishedAt };
          setGuestTimes(times);
          writeGuest({ state: next, ...times });
        }
        return true;
      } catch (error) {
        if (error instanceof ApiError && error.code === "INVALID_WORD") {
          setInvalid((count) => count + 1);
          setMessage({ text: "Essa palavra não está no dicionário.", tone: "error" });
        } else if (error instanceof ApiError && error.code === "DAY_CHANGED") {
          setMessage({ text: "Já saiu o desafio de hoje. Recarregue a página.", tone: "error" });
        } else {
          setMessage({ text: errorMessage(error, "Não foi possível enviar o palpite."), tone: "error" });
        }
        return false;
      } finally {
        setSending(false);
      }
    },
    [state, sending, boards, token, guestTimes.startedAt, applyState],
  );

  const input = useWordInput(submit, playing && !sending);

  async function start() {
    if (!state) return;
    if (token) {
      try {
        applyState(await startCifraDaily(boards, token));
      } catch (error) {
        setMessage({ text: errorMessage(error, "Não foi possível começar."), tone: "error" });
      }
      return;
    }
    const times = { startedAt: Date.now(), finishedAt: null };
    setGuestTimes(times);
    writeGuest({ state, ...times });
  }

  if (loadError) return <Alert severity="error">{loadError}</Alert>;
  if (!state) {
    return (
      <Box sx={{ ...panelSx, minHeight: 360, justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  // Tempo: logado vem do servidor; convidado, do aparelho.
  let elapsed = 0;
  if (token) {
    if (state.durationMs !== null) elapsed = state.durationMs;
    else if (state.startedAt !== null) elapsed = now + offset - state.startedAt;
  } else if (guestTimes.startedAt !== null) {
    elapsed = (guestTimes.finishedAt ?? now) - guestTimes.startedAt;
  }
  const marks = keyMarks(state.rows, boards, state.solvedAt);
  const untilNext = state.nextAt - (now + offset);

  return (
    <Box sx={panelSx}>
      <Stack direction="row" spacing={4} sx={{ justifyContent: "center" }}>
        <Stat value={formatClock(elapsed)} label="Tempo" />
        <Stat value={`${state.rows.length}/${state.maxAttempts}`} label="Tentativas" color="#a78bfa" />
        {boards > 1 && (
          <Stat value={`${state.solvedAt.filter((value) => value !== null).length}/${boards}`} label="Palavras" />
        )}
      </Stack>

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: { xs: 1, sm: 2 },
          filter: started ? "none" : "blur(3px)",
          transition: "filter 200ms ease",
        }}
      >
        {Array.from({ length: boards }, (_, board) => (
          <Board
            key={board}
            rows={state.rows}
            board={board}
            maxAttempts={state.maxAttempts}
            solvedAt={state.solvedAt[board]}
            current={input.letters}
            cursor={input.cursor}
            onSelect={input.setCursor}
            tileSize={tileSize}
            shakeKey={invalid}
            disabled={!playing}
          />
        ))}
      </Box>

      {!started && !finished && (
        <Stack spacing={1.5} sx={{ alignItems: "center", textAlign: "center" }}>
          <Typography sx={{ color: MUTED, maxWidth: "46ch" }}>
            {state.maxAttempts} tentativas para descobrir {boards === 1 ? "a palavra" : `as ${boards} palavras`}. O tempo
            começa a contar quando você clicar.
            {!token && " Entre na sua conta para aparecer no ranking do dia."}
          </Typography>
          <Button variant="contained" size="large" startIcon={<PlayArrowRoundedIcon />} onClick={start}>
            Começar
          </Button>
        </Stack>
      )}

      {finished && (
        <Stack spacing={1.5} sx={{ alignItems: "center", textAlign: "center" }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            {state.won ? "Acertou!" : "Não foi dessa vez"}
          </Typography>
          <Typography sx={{ color: MUTED }}>
            {state.won
              ? `${state.rows.length} ${state.rows.length === 1 ? "tentativa" : "tentativas"} em ${formatClock(elapsed)}.`
              : `${boards === 1 ? "A palavra era" : "As palavras eram"}:`}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", justifyContent: "center" }}>
            {(state.answers ?? []).map((answer, board) => (
              <Box
                key={answer}
                sx={{
                  px: 1.5,
                  py: 0.5,
                  borderRadius: "8px",
                  fontFamily: MONO_FONT,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                  bgcolor: state.solvedAt[board] !== null ? "rgba(124,77,255,.22)" : "rgba(255,92,122,.14)",
                  color: state.solvedAt[board] !== null ? "#d6c8ff" : "#ff8aa0",
                }}
              >
                {answer}
              </Box>
            ))}
          </Stack>
          <Typography variant="body2" sx={{ color: MUTED, fontFamily: MONO_FONT }}>
            Próximo desafio em {formatClock(untilNext).padStart(5, "0")}
            {untilNext >= 3_600_000 && ` (${Math.floor(untilNext / 3_600_000)} h)`}
          </Typography>
          <DailyRanking ranking={ranking} />
        </Stack>
      )}

      {playing && (
        <>
          <Message text={message.text} tone={message.tone} />
          <Keyboard marks={marks} boards={boards} onKey={input.press} disabled={sending} />
        </>
      )}
    </Box>
  );
}

function DailyRanking({ ranking }: { ranking: CifraDailyRankingEntry[] | null }) {
  if (!ranking) return <CircularProgress size={22} />;
  if (ranking.length === 0) {
    return <Typography sx={{ color: MUTED, fontSize: 14 }}>Ninguém com conta acertou hoje ainda.</Typography>;
  }
  return (
    <Box sx={{ width: "100%", maxWidth: 420, textAlign: "left" }}>
      <Typography sx={{ fontWeight: 800, mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
        <EmojiEventsRoundedIcon sx={{ color: "#d9a227", fontSize: 20 }} /> Ranking de hoje
      </Typography>
      <Stack spacing={0.75}>
        {ranking.slice(0, 10).map((entry) => (
          <Stack
            key={entry.userId}
            direction="row"
            spacing={1.25}
            sx={{ alignItems: "center", px: 1.25, py: 0.75, borderRadius: "8px", bgcolor: "#12141a" }}
          >
            <Typography sx={{ fontFamily: MONO_FONT, color: MUTED, width: 22 }}>{entry.position}</Typography>
            <Avatar src={entry.avatarUrl ?? undefined} sx={{ width: 26, height: 26, fontSize: 13 }}>
              {entry.name.charAt(0).toUpperCase()}
            </Avatar>
            <Typography
              component={Link}
              to={`/jogador/${entry.userId}`}
              sx={{ flex: 1, color: "#fff", textDecoration: "none", fontWeight: 600, minWidth: 0 }}
              noWrap
            >
              {entry.name}
            </Typography>
            <Typography sx={{ fontFamily: MONO_FONT, fontSize: 13, color: "#c9b6ff" }}>
              {entry.attempts} · {formatClock(entry.durationMs)}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

// ---------------------------------------------------------------- contra o relógio

const RUN_RECORD_KEY = "typebattle_cifra_record";

function readRunRecord(): number {
  try {
    return Number(localStorage.getItem(RUN_RECORD_KEY)) || 0;
  } catch {
    return 0;
  }
}

function RunGame() {
  const { token } = useAuth();
  const [run, setRun] = useState<CifraRunState | null>(null);
  const [starting, setStarting] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "info" | "error" | "ok" }>({ text: "", tone: "info" });
  const [invalid, setInvalid] = useState(0);
  const [record, setRecord] = useState(readRunRecord);
  const [newRecord, setNewRecord] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  // Diferença entre o relógio do servidor e o do aparelho.
  const [offset, setOffset] = useState(0);
  const finishingRef = useRef(false);
  const tileSize = useTileSize(1);

  const playing = Boolean(run && !run.finished);

  const applyRun = useCallback(
    (next: CifraRunState) => {
      setOffset(next.serverNow - Date.now());
      setRun(next);
      if (next.finished && next.score > record) {
        setRecord(next.score);
        setNewRecord(true);
        try {
          localStorage.setItem(RUN_RECORD_KEY, String(next.score));
        } catch {
          // Sem armazenamento, só não lembra o recorde.
        }
      }
    },
    [record],
  );

  const timeLeft = run ? run.endsAt - (now + offset) : 120_000;

  // Relógio; quando zera, pede ao servidor para encerrar.
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, [playing]);

  useEffect(() => {
    if (!run || run.finished || timeLeft > 0 || finishingRef.current) return;
    finishingRef.current = true;
    finishCifraRun(run.id)
      .then(applyRun)
      .catch(() => setMessage({ text: "Não foi possível encerrar a partida.", tone: "error" }))
      .finally(() => {
        finishingRef.current = false;
      });
  }, [run, timeLeft, applyRun]);

  const submit = useCallback(
    async (word: string): Promise<boolean> => {
      if (!run || sending) return false;
      setSending(true);
      setMessage({ text: "", tone: "info" });
      try {
        const next = await guessCifraRun(run.id, word);
        applyRun(next);
        if (next.last?.solved) {
          const bonus = next.endsAt - run.endsAt;
          setMessage({ text: `${next.last.written.toUpperCase()}! +${Math.round(bonus / 1000)} s`, tone: "ok" });
        }
        return true;
      } catch (error) {
        if (error instanceof ApiError && error.code === "INVALID_WORD") {
          setInvalid((count) => count + 1);
          setMessage({ text: "Essa palavra não está no dicionário.", tone: "error" });
        } else {
          setMessage({ text: errorMessage(error, "Não foi possível enviar o palpite."), tone: "error" });
        }
        return false;
      } finally {
        setSending(false);
      }
    },
    [run, sending, applyRun],
  );

  const input = useWordInput(submit, playing && !sending);

  async function start() {
    setStarting(true);
    setNewRecord(false);
    setMessage({ text: "", tone: "info" });
    input.clear();
    try {
      applyRun(await startCifraRun(token));
      setNow(Date.now());
    } catch (error) {
      setMessage({ text: errorMessage(error, "Não foi possível começar."), tone: "error" });
    } finally {
      setStarting(false);
    }
  }

  const rows = run?.rows ?? [];
  const marks = keyMarks(rows, 1, [null]);
  const seconds = Math.ceil(Math.max(0, timeLeft) / 1000);

  return (
    <Box sx={panelSx}>
      <Stack direction="row" spacing={4} sx={{ justifyContent: "center", alignItems: "center" }}>
        <Stat
          value={formatClock(Math.max(0, timeLeft) + 999)}
          label="Tempo"
          color={playing && seconds <= 15 ? "#ff5c7a" : "#fff"}
        />
        <Stat value={run?.score ?? 0} label="Palavras" color="#a78bfa" />
        <Stat value={record} label="Recorde" color={MUTED} />
      </Stack>

      <Board
        rows={rows}
        board={0}
        maxAttempts={run?.maxAttempts ?? 6}
        solvedAt={null}
        current={input.letters}
        cursor={input.cursor}
        onSelect={input.setCursor}
        tileSize={tileSize}
        shakeKey={invalid}
        disabled={!playing}
      />

      {playing && (
        <>
          <Message text={message.text} tone={message.tone} />
          <Keyboard marks={marks} boards={1} onKey={input.press} disabled={sending} />
          {run && run.solved.length > 0 && (
            <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", justifyContent: "center", rowGap: 0.75 }}>
              {run.solved.map((word, index) => (
                <Box
                  key={`${word}-${index}`}
                  sx={{
                    px: 1,
                    py: 0.25,
                    borderRadius: "6px",
                    fontFamily: MONO_FONT,
                    fontSize: 13,
                    bgcolor: "rgba(124,77,255,.16)",
                    color: "#d6c8ff",
                  }}
                >
                  {word}
                </Box>
              ))}
            </Stack>
          )}
        </>
      )}

      {!playing && (
        <Stack spacing={1.5} sx={{ alignItems: "center", textAlign: "center" }}>
          {run?.finished ? (
            <>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                {newRecord ? "Novo recorde!" : "Fim de jogo"}
              </Typography>
              <Typography sx={{ color: MUTED }}>
                {run.score} {run.score === 1 ? "palavra" : "palavras"}
                {run.answer && (
                  <>
                    {" · a palavra era "}
                    <Box component="span" sx={{ color: "#ff8aa0", fontWeight: 800, textTransform: "uppercase" }}>
                      {run.answer}
                    </Box>
                  </>
                )}
              </Typography>
              {!token && run.score > 0 && (
                <Typography variant="body2" sx={{ color: MUTED }}>
                  Entre na sua conta para o resultado ir para o ranking.
                </Typography>
              )}
            </>
          ) : (
            <Typography sx={{ color: MUTED, maxWidth: "50ch" }}>
              Você tem 2 minutos. Cada palavra certa soma 20 s, mais 5 s por tentativa que sobrou. Errou as 6
              tentativas, acabou.
            </Typography>
          )}
          <Message text={message.tone === "error" ? message.text : ""} tone="error" />
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="contained"
              size="large"
              startIcon={run?.finished ? <ReplayRoundedIcon /> : <PlayArrowRoundedIcon />}
              onClick={start}
              disabled={starting}
            >
              {run?.finished ? "Jogar de novo" : "Começar"}
            </Button>
            <Button
              component={Link}
              to="/ranking?tipo=cifra"
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
  );
}
