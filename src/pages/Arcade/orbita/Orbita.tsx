import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Box,
  Button,
  CircularProgress,
  Container,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import FullscreenExitRoundedIcon from "@mui/icons-material/FullscreenExitRounded";
import FullscreenRoundedIcon from "@mui/icons-material/FullscreenRounded";

import { useAuth } from "../../../contexts/useAuth";
import { saveArcadeResult } from "../../../services/api";
import { DEFAULT_LANGUAGE, loadWordBank } from "../../../utils/textGenerator";
import {
  buildOrbitaWords,
  OrbitaGame,
  type OrbitaHud,
  type OrbitaResult,
} from "./orbitaEngine";

const MONO_FONT = "'JetBrains Mono', ui-monospace, monospace";
const MUTED = "#a0a4ad";
const RECORD_KEY = "typebattle_orbita_record";

// Se o banco de palavras não carregar, o jogo ainda funciona com estas.
const FALLBACK_WORDS = [
  "casa", "tempo", "mundo", "vida", "jogo", "tecla", "nave", "letra", "ponto", "vento",
  "fogo", "terra", "noite", "sonho", "livro", "folha", "verde", "forte", "salto", "foco",
  "campo", "linha", "ciclo", "rede", "sinal", "raio", "pulso", "radar", "motor", "onda",
  "chave", "porta", "ponte", "alvo", "laser", "ritmo", "frase", "brilho", "sombra", "cometa",
  "orbita", "planeta", "estrela", "corrida", "batalha", "teclado", "palavra", "caminho",
  "viagem", "destino", "recorde", "desafio", "energia", "galaxia", "meteoro", "universo",
];

type Status = "loading" | "ready" | "playing" | "paused" | "over";

const EMPTY_HUD: OrbitaHud = {
  score: 0, ppm: 0, combo: 0, multiplier: 1, wave: 1, shields: 3, demo: true,
};

function readRecord(): number {
  try {
    return Number(localStorage.getItem(RECORD_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveRecord(score: number) {
  try {
    localStorage.setItem(RECORD_KEY, String(score));
  } catch {
    // Sem armazenamento, só não lembra o recorde.
  }
}

function HudStat({ label, value, color }: { label: string; value: ReactNode; color?: string }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
      <Typography
        component="b"
        sx={{
          fontFamily: MONO_FONT, fontWeight: 700, fontSize: { xs: 15, sm: 18 },
          color: color ?? "#fff", fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </Typography>
      <Typography
        component="small"
        sx={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED }}
      >
        {label}
      </Typography>
    </Box>
  );
}

function Overlay({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        position: "absolute", inset: 0, zIndex: 3, display: "grid", placeItems: "center", p: 2.5,
        background: "radial-gradient(ellipse at center, rgba(15,17,21,.55), rgba(15,17,21,.85))",
      }}
    >
      <Stack
        spacing={1.75}
        sx={{
          width: "min(420px, 100%)", alignItems: "center", textAlign: "center",
          bgcolor: "rgba(24,27,33,.92)", border: "1px solid #262a33", borderRadius: "14px",
          px: 3, py: 3.25,
        }}
      >
        {children}
      </Stack>
    </Box>
  );
}

function ResultCell({ label, value, wide }: { label: string; value: ReactNode; wide?: boolean }) {
  return (
    <Box
      sx={{
        gridColumn: wide ? "span 3" : undefined, display: "flex", flexDirection: "column", gap: 0.25,
        py: 1.25, px: 0.5, borderRadius: "10px", bgcolor: "#12141a",
      }}
    >
      <Typography
        sx={{
          fontFamily: MONO_FONT, fontWeight: 700, fontSize: wide ? 34 : 20,
          color: wide ? "#a78bfa" : "#fff", fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </Typography>
      <Typography sx={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: MUTED }}>
        {label}
      </Typography>
    </Box>
  );
}

export function Orbita() {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const gameRef = useRef<OrbitaGame | null>(null);

  const [status, setStatus] = useState<Status>("loading");
  const statusRef = useRef<Status>("loading");
  const [hud, setHud] = useState<OrbitaHud>(EMPTY_HUD);
  const [result, setResult] = useState<OrbitaResult | null>(null);
  const [record, setRecord] = useState(readRecord);
  const recordRef = useRef(record);
  // O motor é criado uma vez; o token atual fica numa ref.
  const { token } = useAuth();
  const tokenRef = useRef(token);
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);
  const [newRecord, setNewRecord] = useState(false);

  const changeStatus = useCallback((next: Status) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const focusInput = useCallback(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  // Carrega as palavras e liga o motor (que já começa na demonstração).
  useEffect(() => {
    let cancelled = false;

    loadWordBank(DEFAULT_LANGUAGE)
      .then((bank) => buildOrbitaWords([bank.easy, bank.normal ?? []]))
      .catch(() => FALLBACK_WORDS)
      .then((words) => {
        const canvas = canvasRef.current;
        if (cancelled || !canvas) return;

        gameRef.current = new OrbitaGame(canvas, words.length > 30 ? words : FALLBACK_WORDS, {
          onHud: setHud,
          onGameOver: (finalResult) => {
            const beat = finalResult.score > recordRef.current;
            if (beat) {
              recordRef.current = finalResult.score;
              saveRecord(finalResult.score);
              setRecord(finalResult.score);
            }
            setNewRecord(beat);
            setResult(finalResult);
            changeStatus("over");
            // Logado: a partida vai para o perfil e o ranking do Órbita.
            const currentToken = tokenRef.current;
            if (currentToken && finalResult.letters > 0 && finalResult.seconds >= 3) {
              void saveArcadeResult(
                {
                  game: "orbita",
                  score: finalResult.score,
                  letters: finalResult.letters,
                  seconds: finalResult.seconds,
                  wave: finalResult.wave,
                  bestCombo: finalResult.bestCombo,
                  killed: finalResult.killed,
                  accuracy: finalResult.accuracy,
                },
                currentToken,
              ).catch((error: unknown) => console.error("Erro ao salvar o Órbita:", error));
            }
          },
        });
        changeStatus("ready");
      });

    return () => {
      cancelled = true;
      gameRef.current?.dispose();
      gameRef.current = null;
    };
  }, [changeStatus]);

  // Canvas acompanha o tamanho da moldura.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(() => gameRef.current?.resize());
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  const startGame = useCallback(() => {
    if (!gameRef.current) return;
    gameRef.current.start();
    setResult(null);
    setNewRecord(false);
    changeStatus("playing");
    focusInput();
  }, [changeStatus, focusInput]);

  // Tela cheia: só a moldura do jogo ocupa a tela.
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const request = document.fullscreenElement
      ? document.exitFullscreen()
      : frame.requestFullscreen();
    request
      .catch(() => {
        // Navegador ou janela sem permissão: o jogo segue no tamanho normal.
      })
      .finally(() => {
        if (statusRef.current === "playing") focusInput();
      });
  }, [focusInput]);

  useEffect(() => {
    function onChange() {
      setIsFullscreen(document.fullscreenElement === frameRef.current);
    }
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const pauseGame = useCallback(() => {
    if (statusRef.current !== "playing") return;
    gameRef.current?.pause();
    changeStatus("paused");
  }, [changeStatus]);

  const resumeGame = useCallback(() => {
    if (statusRef.current !== "paused") return;
    gameRef.current?.resume();
    changeStatus("playing");
    focusInput();
  }, [changeStatus, focusInput]);

  // Teclado.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const current = statusRef.current;

      if (event.key === "Enter") {
        if (current === "ready" || current === "over") {
          event.preventDefault();
          startGame();
        } else if (current === "paused") {
          event.preventDefault();
          resumeGame();
        }
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        if (current === "paused") resumeGame();
        else pauseGame();
        return;
      }

      // F liga/desliga a tela cheia fora da partida (durante ela, F é letra).
      if (current !== "playing") {
        if (event.key.toLowerCase() === "f" && current !== "loading") {
          event.preventDefault();
          toggleFullscreen();
        }
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        gameRef.current?.releaseTarget();
        return;
      }

      if (event.key.length === 1) {
        event.preventDefault();
        const ch = event.key.toLowerCase();
        if (/^[a-z]$/.test(ch)) gameRef.current?.typeChar(ch);
      }
    }

    function onHide() {
      if (document.hidden) pauseGame();
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("blur", pauseGame);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", pauseGame);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [startGame, pauseGame, resumeGame, toggleFullscreen]);

  // Teclado virtual do celular: muitos não mandam a tecla no keydown.
  function handleMobileInput(event: React.FormEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const value = input.value;
    input.value = "";
    if (statusRef.current !== "playing") return;
    for (const raw of value) {
      const ch = raw.toLowerCase();
      if (/^[a-z]$/.test(ch)) gameRef.current?.typeChar(ch);
    }
  }

  const multiplierLabel = `x${String(hud.multiplier).replace(".", ",")}`;
  const canFullscreen = typeof document !== "undefined" && document.fullscreenEnabled;
  const showNumbers = !hud.demo;

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
      <Stack spacing={2.5} sx={{ maxWidth: 1100, mx: "auto" }}>
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
              Órbita
            </Typography>
            <Typography variant="body2" sx={{ color: MUTED, maxWidth: "60ch" }}>
              As palavras vêm em espiral até o núcleo. Digite cada uma para destruí-la antes que
              ela encoste nele.
            </Typography>
          </Stack>
          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            <Typography variant="body2" sx={{ color: MUTED, fontFamily: MONO_FONT, fontSize: 13 }}>
              Recorde: {record.toLocaleString("pt-BR")}
            </Typography>
            <Button
              component={Link}
              to="/ranking?tipo=orbita"
              size="small"
              variant="outlined"
              startIcon={<EmojiEventsRoundedIcon />}
              sx={{ borderColor: "#343844", color: "#d5d7de" }}
            >
              Ranking
            </Button>
          </Stack>
        </Stack>

        <Box
          ref={frameRef}
          onPointerDown={(event) => {
            if (statusRef.current === "playing" && !(event.target as HTMLElement).closest("button")) {
              event.preventDefault();
              focusInput();
            }
          }}
          sx={{
            position: "relative", width: "100%",
            aspectRatio: { xs: "3 / 4", sm: "16 / 10" },
            maxHeight: { xs: "78vh", sm: "74vh" }, minHeight: 360,
            bgcolor: "#181b21", border: "1px solid #23262e", borderRadius: "14px",
            overflow: "hidden", cursor: "text",
            "&:fullscreen": {
              width: "100vw", height: "100vh", maxHeight: "none", aspectRatio: "auto",
              border: 0, borderRadius: 0,
            },
          }}
        >
          <Box
            component="canvas"
            ref={canvasRef}
            aria-label="Área do jogo: palavras orbitando em direção ao núcleo"
            sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
          />

          {/* HUD */}
          <Box
            sx={{
              position: "absolute", top: 0, left: 0, right: 0, zIndex: 2, pointerEvents: "none",
              display: "flex", flexWrap: "wrap", alignItems: "center",
              gap: { xs: "4px 14px", sm: "6px 22px" }, px: { xs: 1.5, sm: 2 }, py: 1.5,
            }}
          >
            <HudStat label="Pontos" value={showNumbers ? hud.score.toLocaleString("pt-BR") : "—"} />
            <HudStat label="PPM" value={showNumbers ? hud.ppm : "—"} />
            <HudStat label={`Combo ${hud.combo}`} value={multiplierLabel} color="#a78bfa" />
            <HudStat label="Onda" value={hud.wave} />
            <Box sx={{ ml: "auto", display: "flex", gap: "5px" }} aria-label={`${hud.shields} escudos`}>
              {[0, 1, 2].map((index) => {
                const on = hud.demo || index < hud.shields;
                return (
                  <Box
                    key={index}
                    sx={{
                      width: 22, height: 7, borderRadius: 4,
                      bgcolor: on ? "#00bcd4" : "#2b3038",
                      boxShadow: on ? "0 0 10px rgba(0,188,212,.55)" : "none",
                      transition: "background-color .2s, box-shadow .2s",
                    }}
                  />
                );
              })}
            </Box>
          </Box>

          {canFullscreen && (
            <Tooltip title={isFullscreen ? "Sair da tela cheia (F)" : "Tela cheia (F)"}>
              <IconButton
                onClick={toggleFullscreen}
                aria-label={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
                size="small"
                sx={{
                  position: "absolute", right: 10, bottom: 10, zIndex: 4,
                  color: MUTED, bgcolor: "rgba(15,17,21,.6)", border: "1px solid #262a33",
                  "&:hover": { color: "#fff", bgcolor: "rgba(124,77,255,.25)" },
                }}
              >
                {isFullscreen ? <FullscreenExitRoundedIcon /> : <FullscreenRoundedIcon />}
              </IconButton>
            </Tooltip>
          )}

          {status === "loading" && (
            <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
              <CircularProgress size={32} sx={{ color: "#a78bfa" }} />
            </Box>
          )}

          {status === "ready" && (
            <Overlay>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                Defenda o núcleo
              </Typography>
              <Typography variant="body2" sx={{ color: MUTED }}>
                Comece a digitar uma palavra para travar a mira nela. Errou uma letra? O combo
                zera. Se uma palavra encostar no núcleo, você perde um escudo.
              </Typography>
              <Button variant="contained" size="large" onClick={startGame} sx={{ px: 3.5 }}>
                Começar
              </Button>
              <Typography variant="caption" sx={{ color: MUTED }}>
                ou aperte Enter
              </Typography>
            </Overlay>
          )}

          {status === "paused" && (
            <Overlay>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                Pausado
              </Typography>
              <Button variant="contained" size="large" onClick={resumeGame} sx={{ px: 3.5 }}>
                Continuar
              </Button>
              <Typography variant="caption" sx={{ color: MUTED }}>
                ou aperte Enter
              </Typography>
            </Overlay>
          )}

          {status === "over" && result && (
            <Overlay>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                {newRecord ? "Novo recorde!" : "Núcleo destruído"}
              </Typography>
              <Box
                sx={{
                  width: "100%", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1.25,
                }}
              >
                <ResultCell wide label="Pontos" value={result.score.toLocaleString("pt-BR")} />
                <ResultCell label="PPM" value={result.ppm} />
                <ResultCell label="Precisão" value={`${result.accuracy}%`} />
                <ResultCell label="Onda" value={result.wave} />
              </Box>
              <Typography variant="body2" sx={{ color: MUTED }}>
                Maior combo: {result.bestCombo} · {result.killed} palavras destruídas
              </Typography>
              <Button variant="contained" size="large" onClick={startGame} autoFocus sx={{ px: 3.5 }}>
                Jogar de novo
              </Button>
              <Typography variant="caption" sx={{ color: MUTED }}>
                ou aperte Enter
              </Typography>
            </Overlay>
          )}

          <input
            ref={inputRef}
            type="text"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Teclado do jogo"
            onInput={handleMobileInput}
            style={{ position: "absolute", left: -9999, top: 0, width: 1, height: 1, opacity: 0 }}
          />
        </Box>

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={{ xs: 1, md: 4 }}
          sx={{ color: MUTED, fontSize: 14 }}
        >
          <Typography variant="body2">
            <Box component="span" sx={{ color: "#fff", fontWeight: 600 }}>Mira:</Box> a primeira
            letra trava na palavra mais perto que começa com ela. Backspace troca de alvo.
          </Typography>
          <Typography variant="body2">
            <Box component="span" sx={{ color: "#fff", fontWeight: 600 }}>Combo:</Box> a cada 5
            acertos seguidos o multiplicador sobe 0,5, até x3.
          </Typography>
          <Typography variant="body2">
            <Box component="span" sx={{ color: "#00bcd4", fontWeight: 600 }}>Ciano:</Box> essas
            palavras devolvem um escudo.
          </Typography>
        </Stack>
      </Stack>
    </Container>
  );
}
