import { useCallback, useEffect, useEffectEvent, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Alert, Box, Button, Chip, CircularProgress, Container, Stack, Typography } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";

import { useAuth } from "../../../contexts/useAuth";
import { saveArcadeResult } from "../../../services/api";
import { Bomb } from "./Bomb";
import {
  checkWord,
  exampleWords,
  loadDictionary,
  normalizeWord,
  pickSyllable,
  REJECTION_MESSAGES,
} from "./pavioRules";

const MONO_FONT = "'JetBrains Mono', ui-monospace, monospace";
const MUTED = "#a0a4ad";
const RECORD_KEY = "typebattle_pavio_record";

// Solo: a bomba começa com 60 s; cada palavra soma tempo (cada vez menos).
const START_MS = 60_000;
const MAX_MS = 90_000;
const SKIP_COST_MS = 5_000;

function bonusFor(words: number): number {
  if (words < 10) return 3_000;
  if (words < 20) return 2_500;
  if (words < 35) return 2_000;
  return 1_500;
}

type Status = "loading" | "error" | "ready" | "playing" | "over";

interface Feedback {
  kind: "ok" | "error" | "skip";
  text: string;
  key: number;
}

function readRecord(): number {
  try {
    return Number(localStorage.getItem(RECORD_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveRecord(value: number) {
  try {
    localStorage.setItem(RECORD_KEY, String(value));
  } catch {
    // Sem armazenamento, só não lembra o recorde.
  }
}

// Mostra o que foi digitado com a sílaba destacada, se ela aparecer.
function TypedWord({ value, syllable }: { value: string; syllable: string }) {
  const normalized = normalizeWord(value);
  const index = syllable ? normalized.indexOf(syllable) : -1;
  if (!value) {
    return <Box component="span" sx={{ color: "#5d6270" }}>digite uma palavra…</Box>;
  }
  if (index < 0 || normalized.length !== value.trim().length) return <>{value}</>;
  return (
    <>
      {value.slice(0, index)}
      <Box component="span" sx={{ color: "#a78bfa" }}>
        {value.slice(index, index + syllable.length)}
      </Box>
      {value.slice(index + syllable.length)}
    </>
  );
}

export function Pavio() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dictionaryRef = useRef<{ list: string[]; set: Set<string> } | null>(null);
  const usedRef = useRef<Set<string>>(new Set());
  const endsAtRef = useRef(0);
  const startedAtRef = useRef(0);
  const { token } = useAuth();

  const [status, setStatus] = useState<Status>("loading");
  const [syllable, setSyllable] = useState("");
  const [input, setInput] = useState("");
  const [timeLeft, setTimeLeft] = useState(START_MS);
  const [words, setWords] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [record, setRecord] = useState(readRecord);
  const [newRecord, setNewRecord] = useState(false);
  const [examples, setExamples] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    loadDictionary()
      .then((list) => {
        if (cancelled) return;
        dictionaryRef.current = { list, set: new Set(list) };
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const finish = useCallback(
    (finalWords: string[], lastSyllable: string) => {
      setStatus("over");
      setTimeLeft(0);
      setExamples(exampleWords(dictionaryRef.current?.list ?? [], lastSyllable));
      const beat = finalWords.length > record;
      setNewRecord(beat);
      if (beat) {
        setRecord(finalWords.length);
        saveRecord(finalWords.length);
      }
      // Logado: a partida vai para o perfil e o ranking do Pavio. O servidor
      // confere cada palavra no dicionário.
      if (token && finalWords.length > 0) {
        const seconds = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
        void saveArcadeResult({ game: "pavio", words: finalWords, seconds }, token).catch(
          (error: unknown) => console.error("Erro ao salvar o Pavio:", error),
        );
      }
    },
    [record, token],
  );

  // Relógio da bomba.
  const onTimeout = useEffectEvent(() => finish(words, syllable));

  useEffect(() => {
    if (status !== "playing") return;
    const interval = window.setInterval(() => {
      const left = endsAtRef.current - Date.now();
      if (left <= 0) {
        window.clearInterval(interval);
        onTimeout();
        return;
      }
      setTimeLeft(left);
    }, 100);
    return () => window.clearInterval(interval);
  }, [status]);

  function start() {
    usedRef.current = new Set();
    startedAtRef.current = Date.now();
    endsAtRef.current = Date.now() + START_MS;
    setWords([]);
    setInput("");
    setFeedback(null);
    setExamples([]);
    setNewRecord(false);
    setTimeLeft(START_MS);
    setSyllable(pickSyllable(0));
    setStatus("playing");
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  function addTime(ms: number) {
    endsAtRef.current = Math.min(Date.now() + MAX_MS, endsAtRef.current + ms);
    setTimeLeft(endsAtRef.current - Date.now());
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const dictionary = dictionaryRef.current;
    if (status !== "playing" || !dictionary || !input.trim()) return;

    const result = checkWord(input, syllable, usedRef.current, dictionary.set);
    if ("reason" in result) {
      setFeedback({ kind: "error", text: REJECTION_MESSAGES[result.reason], key: Date.now() });
      return;
    }

    const bonus = bonusFor(words.length);
    usedRef.current.add(result.word);
    const nextWords = [result.word, ...words];
    setWords(nextWords);
    addTime(bonus);
    setFeedback({ kind: "ok", text: `+${bonus / 1000} s`.replace(".", ","), key: Date.now() });
    setSyllable(pickSyllable(nextWords.length, syllable));
    setInput("");
  }

  // Tab: troca a sílaba, mas custa tempo.
  function skip() {
    if (status !== "playing") return;
    endsAtRef.current -= SKIP_COST_MS;
    setTimeLeft(endsAtRef.current - Date.now());
    setFeedback({ kind: "skip", text: `Sílaba trocada · −${SKIP_COST_MS / 1000} s`, key: Date.now() });
    setSyllable(pickSyllable(words.length, syllable));
    setInput("");
    inputRef.current?.focus();
  }

  // Enter começa (ou recomeça) a partida.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Enter" && (status === "ready" || status === "over")) {
        event.preventDefault();
        start();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const seconds = Math.max(0, Math.ceil(timeLeft / 1000));
  const tension = status === "playing" ? 1 - Math.min(1, timeLeft / 20_000) : 0;
  const longest = words.reduce((best, word) => (word.length > best.length ? word : best), "");

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
      <Stack spacing={3} sx={{ maxWidth: 900, mx: "auto" }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          sx={{ justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "flex-end" } }}
        >
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
              Pavio
            </Typography>
            <Typography variant="body2" sx={{ color: MUTED, maxWidth: "60ch" }}>
              Escreva uma palavra que tenha as letras da bomba juntas, em sequência. Cada palavra
              certa soma tempo no pavio.
            </Typography>
          </Stack>
          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            <Typography variant="body2" sx={{ color: MUTED, fontFamily: MONO_FONT, fontSize: 13 }}>
              Recorde: {record} {record === 1 ? "palavra" : "palavras"}
            </Typography>
            <Button
              component={Link}
              to="/ranking?tipo=pavio"
              size="small"
              variant="outlined"
              startIcon={<EmojiEventsRoundedIcon />}
              sx={{ borderColor: "#343844", color: "#d5d7de" }}
            >
              Ranking
            </Button>
            <Button
              component={Link}
              to="/battle?mode=pavio"
              size="small"
              variant="outlined"
              startIcon={<GroupsRoundedIcon />}
              sx={{ borderColor: "#343844", color: "#d5d7de" }}
            >
              Com amigos
            </Button>
          </Stack>
        </Stack>

        <Box
          sx={{
            position: "relative", bgcolor: "#181b21", border: "1px solid #23262e", borderRadius: "14px",
            px: { xs: 2, sm: 4 }, py: { xs: 3, sm: 4 }, minHeight: 520,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2.5,
          }}
        >
          {/* Placar */}
          <Stack direction="row" spacing={4} sx={{ fontFamily: MONO_FONT, alignSelf: "stretch", justifyContent: "center" }}>
            <Stack sx={{ alignItems: "center" }}>
              <Typography
                sx={{
                  fontFamily: MONO_FONT, fontWeight: 800, fontSize: 34, fontVariantNumeric: "tabular-nums",
                  color: status === "playing" && seconds <= 10 ? "#ff5c7a" : "#fff",
                }}
              >
                {status === "playing" || status === "over" ? seconds : START_MS / 1000}
              </Typography>
              <Typography sx={{ fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: MUTED }}>
                Segundos
              </Typography>
            </Stack>
            <Stack sx={{ alignItems: "center" }}>
              <Typography sx={{ fontFamily: MONO_FONT, fontWeight: 800, fontSize: 34, color: "#a78bfa", fontVariantNumeric: "tabular-nums" }}>
                {words.length}
              </Typography>
              <Typography sx={{ fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: MUTED }}>
                Palavras
              </Typography>
            </Stack>
          </Stack>

          <Bomb
            syllable={status === "playing" || status === "over" ? syllable : "ab"}
            tension={tension}
            exploded={status === "over"}
            error={feedback?.kind === "error"}
          />

          {status === "playing" && (
            <Box component="form" onSubmit={submit} sx={{ width: "100%", maxWidth: 460, display: "flex", flexDirection: "column", gap: 1.25 }}>
              <Box
                onClick={() => inputRef.current?.focus()}
                sx={{
                  position: "relative", px: 2, py: 1.5, borderRadius: "12px", bgcolor: "#12141a",
                  border: `1px solid ${feedback?.kind === "error" ? "rgba(255,92,122,.6)" : "#343844"}`,
                  fontFamily: MONO_FONT, fontSize: 26, fontWeight: 700, textAlign: "center",
                  minHeight: 62, cursor: "text", overflowWrap: "anywhere",
                  "&:focus-within": { borderColor: "#7c4dff" },
                }}
              >
                <TypedWord value={input} syllable={syllable} />
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(event) => {
                    setInput(event.target.value.slice(0, 30));
                    if (feedback?.kind === "error") setFeedback(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Tab") {
                      event.preventDefault();
                      skip();
                    }
                  }}
                  aria-label={`Palavra com ${syllable}`}
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", cursor: "text" }}
                />
              </Box>
              <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", minHeight: 24 }}>
                <Typography
                  key={feedback?.key}
                  sx={{
                    fontSize: 14, fontWeight: 600,
                    color: feedback?.kind === "ok" ? "#4ade80" : feedback?.kind === "error" ? "#ff5c7a" : MUTED,
                  }}
                >
                  {feedback?.text ?? "Enter manda a palavra"}
                </Typography>
                <Button size="small" onClick={skip} sx={{ color: MUTED, textTransform: "none" }}>
                  Trocar sílaba (Tab, −5 s)
                </Button>
              </Stack>
            </Box>
          )}

          {status === "loading" && (
            <Stack spacing={1.5} sx={{ alignItems: "center" }}>
              <CircularProgress size={28} sx={{ color: "#a78bfa" }} />
              <Typography variant="body2" sx={{ color: MUTED }}>Carregando o dicionário…</Typography>
            </Stack>
          )}

          {status === "error" && (
            <Alert severity="error" action={<Button color="inherit" onClick={() => window.location.reload()}>Tentar de novo</Button>}>
              Não foi possível baixar o dicionário. Confira sua conexão.
            </Alert>
          )}

          {status === "ready" && (
            <Stack spacing={1.5} sx={{ alignItems: "center", textAlign: "center", maxWidth: 440 }}>
              <Typography variant="body2" sx={{ color: MUTED }}>
                Com <b>AB</b>, vale <b>cabo</b> ou <b>sabado</b>, mas não <b>carbo</b>: as letras
                precisam estar juntas. Acento é opcional.
              </Typography>
              <Button variant="contained" size="large" onClick={start} sx={{ px: 4 }}>
                Acender o pavio
              </Button>
              <Typography variant="caption" sx={{ color: MUTED }}>ou aperte Enter</Typography>
            </Stack>
          )}

          {status === "over" && (
            <Stack spacing={1.75} sx={{ alignItems: "center", textAlign: "center", maxWidth: 480 }}>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                {newRecord ? "Novo recorde!" : "Explodiu!"}
              </Typography>
              <Typography sx={{ color: MUTED }}>
                {words.length} {words.length === 1 ? "palavra" : "palavras"}
                {longest && <> · mais longa: <b style={{ color: "#fff" }}>{longest}</b></>}
              </Typography>
              {examples.length > 0 && (
                <Typography variant="body2" sx={{ color: MUTED }}>
                  Para <b style={{ color: "#fff" }}>{syllable.toUpperCase()}</b> dava:{" "}
                  {examples.join(", ")}
                </Typography>
              )}
              <Stack direction="row" spacing={1.5}>
                <Button variant="contained" size="large" onClick={start} autoFocus>
                  Jogar de novo
                </Button>
                <Button
                  component={Link}
                  to="/battle?mode=pavio"
                  size="large"
                  variant="outlined"
                  startIcon={<GroupsRoundedIcon />}
                  sx={{ borderColor: "#343844", color: "#d5d7de" }}
                >
                  Com amigos
                </Button>
              </Stack>
            </Stack>
          )}

          {words.length > 0 && (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, justifyContent: "center", maxWidth: 640 }}>
              {words.slice(0, 18).map((word) => (
                <Chip
                  key={word}
                  label={word}
                  size="small"
                  sx={{ fontFamily: MONO_FONT, bgcolor: "#12141a", color: "#d5d7de", border: "1px solid #262a33" }}
                />
              ))}
            </Box>
          )}
        </Box>
      </Stack>
    </Container>
  );
}
