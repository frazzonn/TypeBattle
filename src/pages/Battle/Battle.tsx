import { useEffect, useRef, useState } from "react";

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import AddCircleOutlineRoundedIcon from "@mui/icons-material/AddCircleOutlineRounded";

import LoginRoundedIcon from "@mui/icons-material/LoginRounded";

import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";

import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";

import { io, type Socket } from "socket.io-client";

import { useSearchParams } from "react-router-dom";

import { useAuth } from "../../contexts/AuthContext";

import { TypingText } from "../../components/typing/TypingText";

const SOCKET_URL = (
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.PROD
    ? "https://typebattle.up.railway.app"
    : "http://localhost:3000")
).replace(/\/+$/, "");

type Difficulty = "easy" | "normal" | "hard";

type MatchFormat = "single" | "best-of-3" | "best-of-5";

type Duration = 15 | 30 | 60;

type PlayerLimit = 2 | 3 | 4;

type Screen = "home" | "create" | "join";

type RoomStatus = "waiting" | "countdown" | "playing" | "finished";

type PendingAction = "create" | "join" | null;

interface RoomSettings {
  difficulty: Difficulty;

  accents: boolean;

  uppercase: boolean;

  punctuation: boolean;

  duration: Duration;

  format: MatchFormat;

  playerLimit: PlayerLimit;
}

interface RoomPlayer {
  socketId: string;

  nickname: string;

  isGuest?: boolean;

  ppm: number;

  accuracy: number;

  errors: number;

  progress: number;
}

interface BattleState {
  round: number;

  text: string;

  countdownEndsAt: number | null;

  startedAt: number | null;

  endsAt: number | null;

  winnerSocketId: string | null;
}

interface BattleRoom {
  code: string;

  hostSocketId: string;

  players: RoomPlayer[];

  settings: RoomSettings;

  status: RoomStatus;

  battle: BattleState | null;

  seriesWins?: Record<string, number>;

  seriesWinnerSocketId?: string | null;

  seriesFinished?: boolean;

  lastSeriesResult?: unknown;
}

const DEFAULT_SETTINGS: RoomSettings = {
  difficulty: "normal",

  accents: true,

  uppercase: false,

  punctuation: false,

  duration: 30,

  format: "single",

  playerLimit: 2,
};

const pageBackground = {
  minHeight: "100vh",

  background:
    "radial-gradient(ellipse at 10% 0%, rgba(124,58,237,0.16), transparent 40%), radial-gradient(ellipse at 100% 70%, rgba(91,33,182,0.10), transparent 35%), #0b0b10",
};

const panelSx = {
  borderRadius: 4,

  borderColor: "rgba(167,139,250,0.20)",

  background: "rgba(20,20,30,0.88)",

  backdropFilter: "blur(14px)",
};

function extractRoomCode(value: string): string {
  const input = value.trim();

  try {
    const url = new URL(input, window.location.origin);

    const code = url.searchParams.get("room");

    if (code) return code.trim().toUpperCase();
  } catch {
    // O valor também pode ser somente o código da sala.
  }

  return input.toUpperCase();
}

function getRoomFromPayload(payload: unknown): BattleRoom | null {
  if (!payload || typeof payload !== "object") return null;

  const candidate = payload as Record<string, unknown>;

  const possibleRoom =
    "room" in candidate && candidate.room && typeof candidate.room === "object"
      ? (candidate.room as Record<string, unknown>)
      : candidate;

  if (
    typeof possibleRoom.code !== "string" ||
    typeof possibleRoom.hostSocketId !== "string" ||
    !Array.isArray(possibleRoom.players)
  ) {
    return null;
  }

  return possibleRoom as unknown as BattleRoom;
}

function normalizeRoom(room: BattleRoom): BattleRoom {
  return {
    ...room,

    settings: {
      ...DEFAULT_SETTINGS,

      ...(room.settings ?? {}),
    },

    players: room.players ?? [],
  };
}

function getErrorMessage(payload: unknown): string {
  if (typeof payload === "string") return payload;

  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;

    if (typeof message === "string") return message;
  }

  return "Ocorreu um erro. Tente novamente.";
}

interface SettingsFieldsProps {
  settings: RoomSettings;
  disabled?: boolean;
  minimumPlayerCount?: number;
  onChange: <K extends keyof RoomSettings>(
    key: K,
    value: RoomSettings[K],
  ) => void;
}

interface SettingOptionProps {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}

// Botão reutilizável para selecionar regras da partida sem usar selects tradicionais.
function SettingOption({
  label,
  selected,
  disabled = false,
  onClick,
}: SettingOptionProps) {
  return (
    <Button
      variant="outlined"
      disabled={disabled}
      onClick={onClick}
      sx={{
        minHeight: 46,
        width: "100%",
        px: 1.5,
        py: 1,
        borderRadius: 2.5,
        textTransform: "none",
        fontWeight: selected ? 800 : 600,
        color: selected ? "#ede9fe" : "rgba(226,226,239,0.72)",
        borderColor: selected
          ? "rgba(167,139,250,0.85)"
          : "rgba(255,255,255,0.10)",
        background: selected
          ? "linear-gradient(135deg, rgba(139,92,246,0.30), rgba(109,40,217,0.16))"
          : "rgba(255,255,255,0.025)",
        boxShadow: selected ? "inset 0 0 0 1px rgba(167,139,250,0.12)" : "none",
        transition: "all 160ms ease",
        "&:hover": {
          borderColor: "#a78bfa",
          background: selected
            ? "rgba(139,92,246,0.30)"
            : "rgba(139,92,246,0.09)",
        },
      }}
    >
      {selected && (
        <Box component="span" sx={{ color: "#c4b5fd", mr: 0.8, fontSize: 12 }}>
          ●
        </Box>
      )}
      {label}
    </Button>
  );
}

function SettingsFields({
  settings,
  disabled = false,
  minimumPlayerCount = 1,
  onChange,
}: SettingsFieldsProps) {
  const groupSx = {
    p: { xs: 1.5, sm: 2 },
    borderRadius: 3,
    border: "1px solid rgba(167,139,250,0.13)",
    background: "rgba(255,255,255,0.025)",
    minWidth: 0,
  };

  const titleSx = {
    fontWeight: 800,
    fontSize: 13,
    mb: 1.5,
    color: "rgba(226,226,239,0.85)",
  };

  const optionsSx = {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 1,
  };

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          sm: "repeat(2, minmax(0, 1fr))",
        },
        gap: 1.5,
      }}
    >
      <Box sx={groupSx}>
        <Typography sx={titleSx}>DIFICULDADE</Typography>
        <Box sx={optionsSx}>
          <SettingOption
            label="Fácil"
            selected={settings.difficulty === "easy"}
            disabled={disabled}
            onClick={() => onChange("difficulty", "easy")}
          />
          <SettingOption
            label="Normal"
            selected={settings.difficulty === "normal"}
            disabled={disabled}
            onClick={() => onChange("difficulty", "normal")}
          />
          <SettingOption
            label="Difícil"
            selected={settings.difficulty === "hard"}
            disabled={disabled}
            onClick={() => onChange("difficulty", "hard")}
          />
        </Box>
      </Box>

      <Box sx={groupSx}>
        <Typography sx={titleSx}>JOGADORES</Typography>
        <Box sx={optionsSx}>
          {([2, 3, 4] as PlayerLimit[]).map((amount) => (
            <SettingOption
              key={amount}
              label={`${amount} jogadores`}
              selected={settings.playerLimit === amount}
              disabled={disabled || minimumPlayerCount > amount}
              onClick={() => onChange("playerLimit", amount)}
            />
          ))}
        </Box>
      </Box>

      <Box sx={groupSx}>
        <Typography sx={titleSx}>DURAÇÃO POR RODADA</Typography>
        <Box sx={optionsSx}>
          {([15, 30, 60] as Duration[]).map((seconds) => (
            <SettingOption
              key={seconds}
              label={`${seconds} segundos`}
              selected={settings.duration === seconds}
              disabled={disabled}
              onClick={() => onChange("duration", seconds)}
            />
          ))}
        </Box>
      </Box>

      <Box sx={groupSx}>
        <Typography sx={titleSx}>FORMATO DA BATALHA</Typography>
        <Box sx={optionsSx}>
          <SettingOption
            label="Única"
            selected={settings.format === "single"}
            disabled={disabled}
            onClick={() => onChange("format", "single")}
          />
          <SettingOption
            label="Melhor de 3"
            selected={settings.format === "best-of-3"}
            disabled={disabled}
            onClick={() => onChange("format", "best-of-3")}
          />
          <SettingOption
            label="Melhor de 5"
            selected={settings.format === "best-of-5"}
            disabled={disabled}
            onClick={() => onChange("format", "best-of-5")}
          />
        </Box>
      </Box>

      <Box sx={groupSx}>
        <Typography sx={titleSx}>ACENTUAÇÃO</Typography>
        <Box sx={optionsSx}>
          <SettingOption
            label="Com acentos"
            selected={settings.accents}
            disabled={disabled}
            onClick={() => onChange("accents", true)}
          />
          <Box sx={{ gridColumn: "span 2" }}>
            <SettingOption
              label="Sem acentos"
              selected={!settings.accents}
              disabled={disabled}
              onClick={() => onChange("accents", false)}
            />
          </Box>
        </Box>
      </Box>

      <Box sx={groupSx}>
        <Typography sx={titleSx}>LETRAS MAIÚSCULAS</Typography>
        <Box sx={optionsSx}>
          <SettingOption
            label="Ativadas"
            selected={settings.uppercase}
            disabled={disabled}
            onClick={() => onChange("uppercase", true)}
          />
          <Box sx={{ gridColumn: "span 2" }}>
            <SettingOption
              label="Desativadas"
              selected={!settings.uppercase}
              disabled={disabled}
              onClick={() => onChange("uppercase", false)}
            />
          </Box>
        </Box>
      </Box>

      <Box sx={{ ...groupSx, gridColumn: { xs: "auto", sm: "1 / -1" } }}>
        <Typography sx={titleSx}>PONTUAÇÃO</Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 1,
          }}
        >
          <SettingOption
            label="Com pontuação"
            selected={settings.punctuation}
            disabled={disabled}
            onClick={() => onChange("punctuation", true)}
          />
          <SettingOption
            label="Sem pontuação"
            selected={!settings.punctuation}
            disabled={disabled}
            onClick={() => onChange("punctuation", false)}
          />
        </Box>
      </Box>
    </Box>
  );
}

function formatTime(milliseconds: number): string {
  return Math.max(0, milliseconds / 1000).toFixed(1);
}

function PlayerResult({
  player,

  isWinner,
}: {
  player: RoomPlayer;

  isWinner: boolean;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        ...panelSx,

        p: 2.5,

        borderColor: isWinner ? "#a78bfa" : "rgba(167,139,250,0.20)",

        borderWidth: isWinner ? 2 : 1,
      }}
    >
      <Stack spacing={1.5}>
        <Box
          sx={{
            display: "flex",

            justifyContent: "space-between",

            alignItems: "center",

            gap: 1,
          }}
        >
          <Typography sx={{ fontWeight: 700 }}>{player.nickname}</Typography>

          {isWinner && (
            <Chip
              label="Vencedor"
              size="small"
              sx={{
                color: "#ddd6fe",

                bgcolor: "rgba(139,92,246,0.18)",

                fontWeight: 700,
              }}
            />
          )}
        </Box>

        <Typography variant="h4" sx={{ fontWeight: 900 }}>
          {player.ppm}{" "}
          <Box
            component="span"
            sx={{ fontSize: "0.45em", color: "text.secondary" }}
          >
            PPM
          </Box>
        </Typography>

        <LinearProgress
          variant="determinate"
          value={Math.min(100, Math.max(0, player.progress ?? 0))}
          sx={{
            height: 6,

            borderRadius: 4,

            bgcolor: "rgba(167,139,250,0.12)",

            "& .MuiLinearProgress-bar": { bgcolor: "#a78bfa" },
          }}
        />

        <Box
          sx={{
            display: "flex",

            justifyContent: "space-between",

            gap: 2,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Precisão: {player.accuracy}%
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Erros: {player.errors}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

export function Battle() {
  const { user } = useAuth();

  const [searchParams] = useSearchParams();

  const socketRef = useRef<Socket | null>(null);

  const typingInputRef = useRef<HTMLInputElement | null>(null);

  const pendingActionRef = useRef<PendingAction>(null);

  const inviteCode = searchParams.get("room")?.toUpperCase() ?? "";

  const [screen, setScreen] = useState<Screen>(() =>
    inviteCode ? "join" : "home",
  );

  const [connected, setConnected] = useState(false);

  const [nickname, setNickname] = useState(user?.name ?? "");

  const [roomCode, setRoomCode] = useState(inviteCode);

  const [room, setRoom] = useState<BattleRoom | null>(null);

  const [settings, setSettings] = useState<RoomSettings>(DEFAULT_SETTINGS);

  const [typedText, setTypedText] = useState("");

  const [error, setError] = useState("");

  const [notice, setNotice] = useState("");

  const [isCreating, setIsCreating] = useState(false);

  const [isJoining, setIsJoining] = useState(false);

  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const socket = io(SOCKET_URL);

    socketRef.current = socket;

    function applyRoom(incomingRoom: BattleRoom, action?: PendingAction) {
      const normalized = normalizeRoom(incomingRoom);

      setRoom(normalized);

      setRoomCode(normalized.code);

      setSettings(normalized.settings);

      setError("");

      setIsCreating(false);

      setIsJoining(false);

      if (action === "create") {
        setNotice("Sala criada! Compartilhe o convite com seus amigos.");

        window.history.replaceState({}, "", `/battle?room=${normalized.code}`);
      } else if (action === "join") {
        setNotice("Você entrou na sala!");
      }
    }

    socket.on("connect", () => {
      setConnected(true);

      setError("");
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("room:created", (payload: unknown) => {
      const createdRoom = getRoomFromPayload(payload);

      if (createdRoom) {
        applyRoom(createdRoom, "create");

        pendingActionRef.current = null;
      }
    });

    socket.on("room:joined", (payload: unknown) => {
      const joinedRoom = getRoomFromPayload(payload);

      if (joinedRoom) {
        applyRoom(joinedRoom, "join");

        pendingActionRef.current = null;
      }
    });

    socket.on("room:updated", (payload: unknown) => {
      const updatedRoom = getRoomFromPayload(payload);

      if (!updatedRoom) return;

      const action = pendingActionRef.current;

      applyRoom(updatedRoom, action);

      if (action) pendingActionRef.current = null;
    });

    socket.on("battle:countdown", () => {
      setTypedText("");

      setNotice("");
    });

    socket.on("battle:started", (payload: unknown) => {
      const startedRoom = getRoomFromPayload(payload);

      if (startedRoom) setRoom(normalizeRoom(startedRoom));

      setTypedText("");

      setNotice("");
    });

    socket.on("battle:finished", (payload: unknown) => {
      const finishedRoom = getRoomFromPayload(payload);

      if (finishedRoom) setRoom(normalizeRoom(finishedRoom));

      setTypedText("");

      setNotice("");
    });

    socket.on("room:error", (payload: unknown) => {
      setError(getErrorMessage(payload));

      setIsCreating(false);

      setIsJoining(false);

      pendingActionRef.current = null;
    });

    return () => {
      socket.disconnect();

      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (user?.name) {
      setNickname((current) => current || user.name);
    }
  }, [user]);

  useEffect(() => {
    if (room?.status !== "countdown" && room?.status !== "playing") return;

    const interval = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 100);

    return () => window.clearInterval(interval);
  }, [room?.status]);

  useEffect(() => {
    if (room?.status === "countdown") setTypedText("");

    if (room?.status === "playing") {
      typingInputRef.current?.focus();
    }
  }, [room?.status, room?.battle?.round]);

  const isHost = Boolean(room && room.hostSocketId === socketRef.current?.id);

  const myPlayer = room?.players.find(
    (player) => player.socketId === socketRef.current?.id,
  );

  const opponents =
    room?.players.filter(
      (player) => player.socketId !== socketRef.current?.id,
    ) ?? [];

  const countdown = room?.battle?.countdownEndsAt
    ? Math.max(0, Math.ceil((room.battle.countdownEndsAt - currentTime) / 1000))
    : 0;

  const remainingTime =
    room?.status === "playing" && room.battle?.endsAt != null
      ? Math.max(0, room.battle.endsAt - currentTime)
      : 0;

  function updateSetting<K extends keyof RoomSettings>(
    key: K,

    value: RoomSettings[K],
  ) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function openScreen(nextScreen: Screen) {
    setError("");

    setNotice("");

    setScreen(nextScreen);
  }

  function createRoom() {
    const cleanNickname = nickname.trim();

    if (!cleanNickname) {
      setError("Digite seu nick antes de criar a sala.");

      return;
    }

    if (!connected || !socketRef.current) {
      setError("Conectando ao servidor. Tente novamente em instantes.");

      return;
    }

    setError("");

    setNotice("");

    setIsCreating(true);

    pendingActionRef.current = "create";

    socketRef.current.emit("room:create", {
      nickname: cleanNickname,

      settings,
    });
  }

  function joinRoom() {
    const cleanNickname = nickname.trim();

    const cleanCode = extractRoomCode(roomCode);

    if (!cleanNickname) {
      setError("Digite seu nick antes de entrar na sala.");

      return;
    }

    if (!cleanCode) {
      setError("Informe o código ou link da sala.");

      return;
    }

    if (!connected || !socketRef.current) {
      setError("Conectando ao servidor. Tente novamente em instantes.");

      return;
    }

    setError("");

    setNotice("");

    setIsJoining(true);

    pendingActionRef.current = "join";

    socketRef.current.emit("room:join", {
      nickname: cleanNickname,

      code: cleanCode,
    });
  }

  function updateRoomSettings() {
    if (!socketRef.current || !isHost || !room) return;

    socketRef.current.emit("room:update-settings", {
      code: room.code,

      settings,
    });
  }

  function startBattle() {
    if (!room) return;

    setError("");

    setNotice("");

    socketRef.current?.emit("battle:start", { code: room.code });
  }

  function handleTyping(value: string) {
    setTypedText(value);

    if (room?.status === "playing") {
      socketRef.current?.emit("battle:progress", {
        code: room.code,

        typedText: value,
      });
    }
  }

  async function copyInviteLink() {
    if (!room) return;

    const link = `${window.location.origin}/battle?room=${room.code}`;

    try {
      await navigator.clipboard.writeText(link);

      setNotice("Link de convite copiado!");
    } catch {
      setNotice(`Copie este link para convidar: ${link}`);
    }
  }

  const inviteLink = room
    ? `${window.location.origin}/battle?room=${room.code}`
    : "";

  const isInGame = room?.status === "countdown" || room?.status === "playing";

  const roomIsFull = Boolean(
    room && room.players.length === room.settings.playerLimit,
  );

  const missingPlayers = room
    ? Math.max(0, room.settings.playerLimit - room.players.length)
    : 0;

  if (room && isInGame && room.battle) {
    return (
      <Box sx={pageBackground}>
        <Container maxWidth="md" sx={{ py: { xs: 3, md: 6 } }}>
          <Stack spacing={4}>
            <Box
              sx={{
                display: "flex",

                justifyContent: "space-between",

                alignItems: "center",

                gap: 2,
              }}
            >
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 900 }}>
                  Type
                  <Box component="span" sx={{ color: "#a78bfa" }}>
                    Battle
                  </Box>
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  Sala {room.code} · {room.players.length} jogadores
                </Typography>
              </Box>

              <Chip
                color={
                  room.status === "playing" && remainingTime <= 5000
                    ? "error"
                    : "default"
                }
                label={
                  room.status === "countdown"
                    ? `Começa em ${countdown || "..."}`
                    : `${formatTime(remainingTime)} s`
                }
                sx={{
                  fontWeight: 800,

                  fontVariantNumeric: "tabular-nums",

                  border: "1px solid rgba(167,139,250,0.3)",
                }}
              />
            </Box>

            <Divider />

            <Box
              sx={{
                display: "grid",

                gridTemplateColumns: {
                  xs: "1fr",

                  sm: "repeat(2, minmax(0, 1fr))",
                },

                gap: 2,
              }}
            >
              <Paper variant="outlined" sx={{ ...panelSx, p: 2.5 }}>
                <Typography sx={{ fontWeight: 800 }} noWrap>
                  {myPlayer?.nickname ?? nickname} (você)
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  {myPlayer?.ppm ?? 0} PPM · Precisão{" "}
                  {myPlayer?.accuracy ?? 100}% · {myPlayer?.errors ?? 0} erros
                </Typography>

                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, Math.max(0, myPlayer?.progress ?? 0))}
                  sx={{
                    mt: 1.5,

                    height: 6,

                    borderRadius: 2,

                    "& .MuiLinearProgress-bar": { bgcolor: "#a78bfa" },
                  }}
                />
              </Paper>

              <Stack spacing={1.5}>
                <Typography variant="subtitle2" color="text.secondary">
                  Adversários ({opponents.length})
                </Typography>

                {opponents.map((opponent) => (
                  <Paper
                    key={opponent.socketId}
                    variant="outlined"
                    sx={{ ...panelSx, p: 2 }}
                  >
                    <Box
                      sx={{
                        display: "flex",

                        justifyContent: "space-between",

                        alignItems: "center",

                        gap: 1,
                      }}
                    >
                      <Typography sx={{ fontWeight: 700 }} noWrap>
                        {opponent.nickname}
                      </Typography>

                      <Typography variant="body2" color="text.secondary" noWrap>
                        {opponent.ppm} PPM
                      </Typography>
                    </Box>

                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, Math.max(0, opponent.progress ?? 0))}
                      sx={{
                        mt: 1,

                        height: 6,

                        borderRadius: 2,

                        "& .MuiLinearProgress-bar": { bgcolor: "#a78bfa" },
                      }}
                    />

                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", mt: 0.5, textAlign: "right" }}
                    >
                      {opponent.progress ?? 0}% de progresso
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            </Box>

            {room.status === "countdown" ? (
              <Box sx={{ textAlign: "center", py: { xs: 5, md: 8 } }}>
                <Typography color="text.secondary">
                  PREPARE-SE PARA DIGITAR
                </Typography>

                <Typography
                  variant="h1"
                  sx={{
                    fontWeight: 900,

                    fontVariantNumeric: "tabular-nums",

                    color: "#a78bfa",
                  }}
                >
                  {countdown || "VAI!"}
                </Typography>
              </Box>
            ) : (
              <Box>
                <TypingText
                  text={room.battle.text}
                  input={typedText}
                  isStarted={room.status === "playing"}
                  onInputChange={handleTyping}
                  inputRef={typingInputRef}
                />

                <Box
                  sx={{
                    mt: 3,

                    display: "flex",

                    justifyContent: "center",

                    flexWrap: "wrap",

                    gap: 3,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    PPM:{" "}
                    <Box
                      component="span"
                      sx={{ color: "text.primary", fontWeight: 800 }}
                    >
                      {myPlayer?.ppm ?? 0}
                    </Box>
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    Precisão:{" "}
                    <Box
                      component="span"
                      sx={{ color: "text.primary", fontWeight: 800 }}
                    >
                      {myPlayer?.accuracy ?? 100}%
                    </Box>
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    Erros:{" "}
                    <Box
                      component="span"
                      sx={{ color: "text.primary", fontWeight: 800 }}
                    >
                      {myPlayer?.errors ?? 0}
                    </Box>
                  </Typography>
                </Box>
              </Box>
            )}
          </Stack>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={pageBackground}>
      <Container
        maxWidth={false}
        sx={{
          py: { xs: 3, md: 6 },

          px: { xs: 2, md: 4 },
        }}
      >
        <Stack spacing={4} sx={{ maxWidth: 1100, mx: "auto" }}>
          {/* Cabeçalho principal */}

          <Box
            sx={{
              position: "relative",

              overflow: "hidden",

              p: { xs: 2.5, md: 4 },

              borderRadius: 4,

              border: "1px solid rgba(167,139,250,0.22)",

              background:
                "linear-gradient(135deg, rgba(124,58,237,0.16), rgba(17,17,27,0.96) 60%)",

              boxShadow: "0 18px 60px rgba(0,0,0,0.20)",
            }}
          >
            <Typography
              sx={{
                color: "#a78bfa",

                fontSize: 12,

                fontWeight: 800,

                letterSpacing: 3,

                textTransform: "uppercase",

                mb: 1.5,
              }}
            >
              Multiplayer · Desafie seus amigos
            </Typography>

            <Typography
              variant="h2"
              sx={{
                fontWeight: 900,

                letterSpacing: "-0.055em",

                fontSize: { xs: "2.6rem", md: "4rem" },

                lineHeight: 1.05,

                mb: 1.5,
              }}
            >
              Type
              <Box component="span" sx={{ color: "#a78bfa" }}>
                Battle
              </Box>
              <Box component="span" sx={{ color: "#a78bfa" }}>
                .
              </Box>
            </Typography>

            <Typography
              sx={{
                color: "rgba(226,226,239,0.72)",

                maxWidth: 520,

                fontSize: { xs: 14, md: 16 },

                lineHeight: 1.8,
              }}
            >
              Velocidade, precisão e competição. Reúna seus amigos e descubra
              quem domina o teclado.
            </Typography>

            <Chip
              sx={{
                mt: 2.5,

                color: connected ? "#86efac" : "#c4b5fd",

                backgroundColor: connected
                  ? "rgba(34,197,94,0.10)"
                  : "rgba(139,92,246,0.12)",

                border: `1px solid ${
                  connected ? "rgba(34,197,94,0.25)" : "rgba(139,92,246,0.25)"
                }`,

                fontWeight: 700,
              }}
              size="small"
              label={
                connected
                  ? "● Servidor conectado"
                  : "◌ Conectando ao servidor..."
              }
            />
          </Box>

          {error && <Alert severity="error">{error}</Alert>}

          {notice && <Alert severity="info">{notice}</Alert>}

          {/* Opções da tela inicial */}

          {!room && screen === "home" && (
            <Stack spacing={2.5}>
              <Box>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 800, letterSpacing: "-0.03em", mb: 0.5 }}
                >
                  Escolha sua próxima batalha
                </Typography>

                <Typography color="text.secondary">
                  Crie uma sala privada ou entre na partida de um amigo.
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "grid",

                  gridTemplateColumns: {
                    xs: "1fr",

                    sm: "repeat(2, minmax(0, 1fr))",
                  },

                  gap: 2.5,
                }}
              >
                <Paper
                  variant="outlined"
                  sx={{
                    p: { xs: 2.5, md: 3.5 },

                    display: "flex",

                    flexDirection: "column",

                    gap: 2,

                    minHeight: 280,

                    borderRadius: 4,

                    border: "1px solid rgba(167,139,250,0.28)",

                    background:
                      "linear-gradient(145deg, rgba(124,58,237,0.14), rgba(20,20,30,0.96) 70%)",

                    transition:
                      "transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease",

                    "&:hover": {
                      transform: "translateY(-5px)",

                      borderColor: "#a78bfa",

                      boxShadow: "0 18px 40px rgba(124,58,237,0.13)",
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: "grid",

                      placeItems: "center",

                      width: 58,

                      height: 58,

                      borderRadius: 3,

                      color: "#c4b5fd",

                      background: "rgba(139,92,246,0.16)",

                      border: "1px solid rgba(167,139,250,0.24)",
                    }}
                  >
                    <AddCircleOutlineRoundedIcon sx={{ fontSize: 32 }} />
                  </Box>

                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
                      Criar sala
                    </Typography>

                    <Typography
                      color="text.secondary"
                      sx={{ fontSize: 14, lineHeight: 1.8 }}
                    >
                      Monte sua própria partida, escolha as regras e chame seus
                      amigos para competir.
                    </Typography>
                  </Box>

                  <Box sx={{ flexGrow: 1 }} />

                  <Button
                    variant="contained"
                    size="large"
                    onClick={() => openScreen("create")}
                    endIcon={<PlayArrowRoundedIcon />}
                    sx={{
                      py: 1.3,

                      borderRadius: 2.5,

                      fontWeight: 800,

                      textTransform: "none",

                      background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",

                      boxShadow: "0 8px 24px rgba(124,58,237,0.22)",

                      "&:hover": {
                        background: "linear-gradient(135deg, #a78bfa, #7c3aed)",
                      },
                    }}
                  >
                    Criar uma batalha
                  </Button>
                </Paper>

                <Paper
                  variant="outlined"
                  sx={{
                    p: { xs: 2.5, md: 3.5 },

                    display: "flex",

                    flexDirection: "column",

                    gap: 2,

                    minHeight: 280,

                    borderRadius: 4,

                    border: "1px solid rgba(52,211,153,0.20)",

                    background:
                      "linear-gradient(145deg, rgba(16,185,129,0.07), rgba(20,20,30,0.96) 70%)",

                    transition:
                      "transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease",

                    "&:hover": {
                      transform: "translateY(-5px)",

                      borderColor: "rgba(52,211,153,0.65)",

                      boxShadow: "0 18px 40px rgba(16,185,129,0.08)",
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: "grid",

                      placeItems: "center",

                      width: 58,

                      height: 58,

                      borderRadius: 3,

                      color: "#6ee7b7",

                      background: "rgba(16,185,129,0.12)",

                      border: "1px solid rgba(52,211,153,0.20)",
                    }}
                  >
                    <LoginRoundedIcon sx={{ fontSize: 32 }} />
                  </Box>

                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
                      Entrar na sala
                    </Typography>

                    <Typography
                      color="text.secondary"
                      sx={{ fontSize: 14, lineHeight: 1.8 }}
                    >
                      Já recebeu um convite? Use o link ou o código da sala e
                      entre na disputa.
                    </Typography>
                  </Box>

                  <Box sx={{ flexGrow: 1 }} />

                  <Button
                    variant="outlined"
                    color="success"
                    size="large"
                    onClick={() => openScreen("join")}
                    endIcon={<LoginRoundedIcon />}
                    sx={{
                      py: 1.3,

                      borderRadius: 2.5,

                      fontWeight: 800,

                      textTransform: "none",

                      borderColor: "rgba(52,211,153,0.45)",

                      "&:hover": {
                        borderColor: "#6ee7b7",

                        background: "rgba(16,185,129,0.08)",
                      },
                    }}
                  >
                    Entrar na batalha
                  </Button>
                </Paper>
              </Box>
            </Stack>
          )}

          {/* Criação de partida — layout de lobby gamer */}
          {!room && screen === "create" && (
            <Paper
              variant="outlined"
              sx={{
                ...panelSx,
                p: { xs: 2, sm: 3, md: 4 },
                overflow: "hidden",
                position: "relative",
                background:
                  "radial-gradient(ellipse at 100% 0%, rgba(124,58,237,0.15), transparent 45%), rgba(15,15,23,0.96)",
              }}
            >
              <Stack spacing={3}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 2,
                  }}
                >
                  <Box>
                    <Button
                      startIcon={<ArrowBackRoundedIcon />}
                      onClick={() => openScreen("home")}
                      sx={{
                        mb: 2,
                        ml: -1,
                        color: "text.secondary",
                        textTransform: "none",
                      }}
                    >
                      Voltar
                    </Button>
                    <Typography
                      sx={{
                        color: "#a78bfa",
                        fontSize: 11,
                        fontWeight: 900,
                        letterSpacing: 2.5,
                        mb: 1,
                      }}
                    >
                      PREPARE-SE PARA A DISPUTA
                    </Typography>
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 900,
                        letterSpacing: "-0.04em",
                        fontSize: { xs: "1.8rem", sm: "2.3rem" },
                      }}
                    >
                      Montar batalha
                    </Typography>
                    <Typography
                      color="text.secondary"
                      sx={{ mt: 1, fontSize: 14, lineHeight: 1.7 }}
                    >
                      Defina as regras, reúna seus amigos e descubra quem domina
                      o teclado.
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: { xs: "none", sm: "grid" },
                      placeItems: "center",
                      flexShrink: 0,
                      width: 64,
                      height: 64,
                      borderRadius: 3,
                      border: "1px solid rgba(167,139,250,0.25)",
                      color: "#c4b5fd",
                      background: "rgba(139,92,246,0.12)",
                      fontSize: 28,
                      fontWeight: 900,
                    }}
                  >
                    VS
                  </Box>
                </Box>

                <Divider sx={{ borderColor: "rgba(167,139,250,0.15)" }} />

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    p: 2,
                    borderRadius: 3,
                    border: "1px solid rgba(167,139,250,0.15)",
                    background: "rgba(255,255,255,0.025)",
                  }}
                >
                  <Box
                    sx={{
                      width: 46,
                      height: 46,
                      flexShrink: 0,
                      display: "grid",
                      placeItems: "center",
                      borderRadius: 2.5,
                      color: "#ddd6fe",
                      fontWeight: 900,
                      fontSize: 19,
                      background: "linear-gradient(135deg, #7c3aed, #4c1d95)",
                    }}
                  >
                    {nickname.trim().charAt(0).toUpperCase() || "?"}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary">
                      JOGANDO COMO
                    </Typography>
                    <TextField
                      value={nickname}
                      onChange={(event) => setNickname(event.target.value)}
                      placeholder="Seu nick"
                      size="small"
                      fullWidth
                      slotProps={{ htmlInput: { maxLength: 16 } }}
                      sx={{
                        mt: 0.5,
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 2,
                          background: "rgba(0,0,0,0.16)",
                        },
                      }}
                    />
                  </Box>
                </Box>

                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 2,
                      mb: 2,
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>
                      Regras da partida
                    </Typography>
                    <Chip
                      label="PERSONALIZÁVEL"
                      size="small"
                      sx={{
                        color: "#c4b5fd",
                        background: "rgba(139,92,246,0.12)",
                        border: "1px solid rgba(167,139,250,0.2)",
                        fontWeight: 800,
                        fontSize: 10,
                        letterSpacing: 0.5,
                      }}
                    />
                  </Box>
                  <SettingsFields
                    settings={settings}
                    onChange={updateSetting}
                  />
                </Box>

                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {[
                    `${settings.duration} segundos`,
                    `${settings.playerLimit} jogadores`,
                    settings.format === "single"
                      ? "Partida única"
                      : settings.format === "best-of-3"
                        ? "Melhor de 3"
                        : "Melhor de 5",
                  ].map((item) => (
                    <Chip
                      key={item}
                      label={item}
                      size="small"
                      sx={{
                        color: "rgba(226,226,239,0.82)",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    />
                  ))}
                </Box>

                <Button
                  variant="contained"
                  size="large"
                  onClick={createRoom}
                  disabled={!connected || isCreating || isJoining}
                  endIcon={!isCreating ? <PlayArrowRoundedIcon /> : undefined}
                  sx={{
                    minHeight: 56,
                    borderRadius: 2.5,
                    fontWeight: 900,
                    fontSize: 16,
                    textTransform: "none",
                    background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                    boxShadow: "0 10px 30px rgba(124,58,237,0.23)",
                    "&:hover": {
                      background: "linear-gradient(135deg, #a78bfa, #7c3aed)",
                      boxShadow: "0 12px 34px rgba(124,58,237,0.32)",
                    },
                  }}
                >
                  {isCreating ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    "Criar sala e chamar os amigos"
                  )}
                </Button>

                {!connected && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ textAlign: "center" }}
                  >
                    Conectando ao servidor para liberar a criação da partida...
                  </Typography>
                )}
              </Stack>
            </Paper>
          )}

          {/* Formulário para entrar */}

          {!room && screen === "join" && (
            <Paper
              variant="outlined"
              sx={{ ...panelSx, p: { xs: 2, md: 3.5 } }}
            >
              <Stack spacing={3}>
                {!inviteCode && (
                  <Button
                    startIcon={<ArrowBackRoundedIcon />}
                    onClick={() => openScreen("home")}
                    sx={{ alignSelf: "flex-start", textTransform: "none" }}
                  >
                    Voltar
                  </Button>
                )}

                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>
                    Entrar na sala
                  </Typography>

                  <Typography color="text.secondary">
                    {inviteCode
                      ? "Escolha seu nick para aceitar o convite."
                      : "Informe seu nick e o código ou link recebido."}
                  </Typography>
                </Box>

                <TextField
                  label="Seu nick"
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  slotProps={{ htmlInput: { maxLength: 16 } }}
                  fullWidth
                />

                <TextField
                  label="Código ou link da sala"
                  placeholder="Ex.: A1B2C3D4"
                  value={roomCode}
                  onChange={(event) => setRoomCode(event.target.value)}
                  slotProps={{ htmlInput: { maxLength: 300 } }}
                  fullWidth
                />

                <Button
                  variant="contained"
                  color="success"
                  size="large"
                  onClick={joinRoom}
                  disabled={!connected || isCreating || isJoining}
                  sx={{
                    py: 1.3,

                    borderRadius: 2.5,

                    fontWeight: 800,

                    textTransform: "none",
                  }}
                >
                  {isJoining ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    "Entrar na sala"
                  )}
                </Button>
              </Stack>
            </Paper>
          )}

          {/* Sala de espera e resultados */}

          {room && (
            <Paper
              variant="outlined"
              sx={{ ...panelSx, p: { xs: 2, md: 3.5 } }}
            >
              <Stack spacing={3}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>
                    Sala{" "}
                    <Box component="span" sx={{ color: "#a78bfa" }}>
                      {room.code}
                    </Box>
                  </Typography>

                  <Typography color="text.secondary">
                    {room.status === "finished"
                      ? "Confira o resultado da rodada."
                      : "Compartilhe o convite e prepare-se para jogar."}
                  </Typography>
                </Box>

                {room.status !== "finished" && (
                  <>
                    <Button
                      variant="outlined"
                      startIcon={<ContentCopyRoundedIcon />}
                      onClick={copyInviteLink}
                      sx={{ alignSelf: "flex-start", textTransform: "none" }}
                    >
                      Copiar link de convite
                    </Button>

                    <TextField
                      label="Link de convite"
                      value={inviteLink}
                      fullWidth
                      slotProps={{ input: { readOnly: true } }}
                    />

                    <Divider />

                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      Jogadores ({room.players.length}/
                      {room.settings.playerLimit})
                    </Typography>

                    <Stack spacing={1}>
                      {room.players.map((player) => (
                        <Paper
                          key={player.socketId}
                          variant="outlined"
                          sx={{
                            ...panelSx,

                            p: 2,

                            display: "flex",

                            alignItems: "center",

                            justifyContent: "space-between",

                            gap: 2,
                          }}
                        >
                          <Typography sx={{ fontWeight: 700 }}>
                            {player.nickname}
                          </Typography>

                          <Chip
                            size="small"
                            label={
                              player.socketId === room.hostSocketId
                                ? "♛ Anfitrião"
                                : "Jogador"
                            }
                            sx={{
                              color:
                                player.socketId === room.hostSocketId
                                  ? "#c4b5fd"
                                  : "text.secondary",

                              bgcolor:
                                player.socketId === room.hostSocketId
                                  ? "rgba(139,92,246,0.14)"
                                  : "rgba(255,255,255,0.04)",
                            }}
                          />
                        </Paper>
                      ))}

                      {!roomIsFull && (
                        <Typography color="text.secondary" sx={{ py: 1 }}>
                          Aguardando mais {missingPlayers}{" "}
                          {missingPlayers === 1 ? "jogador" : "jogadores"} para
                          completar a sala...
                        </Typography>
                      )}
                    </Stack>
                  </>
                )}

                {room.status === "waiting" && (
                  <>
                    <Divider />

                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      Configurações da partida
                    </Typography>

                    <Box
                      sx={{
                        display: "grid",

                        gridTemplateColumns: {
                          xs: "1fr",

                          sm: "repeat(2, minmax(0, 1fr))",
                        },

                        gap: 1.5,
                      }}
                    >
                      {[
                        {
                          label: "Dificuldade",

                          value:
                            room.settings.difficulty === "easy"
                              ? "Fácil"
                              : room.settings.difficulty === "normal"
                                ? "Normal"
                                : "Difícil",
                        },

                        {
                          label: "Jogadores",

                          value: `${room.settings.playerLimit} participantes`,
                        },

                        {
                          label: "Acentuação",

                          value: room.settings.accents
                            ? "Com acentos"
                            : "Sem acentos",
                        },

                        {
                          label: "Duração",

                          value: `${room.settings.duration} segundos`,
                        },

                        {
                          label: "Formato",

                          value:
                            room.settings.format === "single"
                              ? "Partida única"
                              : room.settings.format === "best-of-3"
                                ? "Melhor de 3"
                                : "Melhor de 5",
                        },

                        {
                          label: "Maiúsculas",

                          value: room.settings.uppercase
                            ? "Ativadas"
                            : "Desativadas",
                        },

                        {
                          label: "Pontuação",

                          value: room.settings.punctuation
                            ? "Ativada"
                            : "Desativada",
                        },
                      ].map((item) => (
                        <Box
                          key={item.label}
                          sx={{
                            p: 1.8,

                            borderRadius: 2.5,

                            border: "1px solid rgba(167,139,250,0.13)",

                            bgcolor: "rgba(255,255,255,0.02)",
                          }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            {item.label}
                          </Typography>

                          <Typography sx={{ fontWeight: 700 }}>
                            {item.value}
                          </Typography>
                        </Box>
                      ))}
                    </Box>

                    {isHost && (
                      <>
                        <Divider />

                        <Typography variant="h6" sx={{ fontWeight: 800 }}>
                          Editar configurações
                        </Typography>

                        <SettingsFields
                          settings={settings}
                          minimumPlayerCount={room.players.length}
                          onChange={updateSetting}
                        />

                        <Button
                          variant="outlined"
                          onClick={updateRoomSettings}
                          disabled={!connected}
                          sx={{ textTransform: "none" }}
                        >
                          Atualizar configurações
                        </Button>

                        <Button
                          variant="contained"
                          size="large"
                          startIcon={<PlayArrowRoundedIcon />}
                          onClick={startBattle}
                          disabled={!connected || !roomIsFull}
                          sx={{
                            py: 1.3,

                            borderRadius: 2.5,

                            fontWeight: 800,

                            textTransform: "none",

                            background:
                              "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                          }}
                        >
                          {roomIsFull
                            ? "Iniciar batalha"
                            : `Aguardando jogadores (${room.players.length}/${room.settings.playerLimit})`}
                        </Button>
                      </>
                    )}

                    {!isHost && (
                      <Alert severity="info">
                        {roomIsFull
                          ? "Todos os jogadores entraram. O anfitrião pode iniciar a batalha."
                          : `Aguardando mais ${missingPlayers} ${missingPlayers === 1 ? "jogador" : "jogadores"} para completar a sala.`}
                      </Alert>
                    )}
                  </>
                )}

                {room.status === "finished" && room.battle && (
                  <>
                    <Box
                      sx={{
                        p: { xs: 2, md: 3 },

                        textAlign: "center",

                        borderRadius: 3,

                        border: "1px solid rgba(167,139,250,0.22)",

                        background:
                          "linear-gradient(135deg, rgba(124,58,237,0.16), rgba(20,20,30,0.7))",
                      }}
                    >
                      <Typography
                        sx={{
                          color: "#c4b5fd",

                          fontSize: 12,

                          fontWeight: 800,

                          letterSpacing: 2,

                          mb: 1,
                        }}
                      >
                        RESULTADO DA BATALHA
                      </Typography>

                      <Typography variant="h4" sx={{ fontWeight: 900 }}>
                        {room.battle.winnerSocketId
                          ? `Vitória de ${room.players.find((player) => player.socketId === room.battle?.winnerSocketId)?.nickname ?? "um jogador"}!`
                          : "Empate!"}
                      </Typography>
                    </Box>

                    {room.seriesFinished && room.seriesWinnerSocketId && (
                      <Alert severity="success">
                        Série concluída! Vencedor:{" "}
                        {room.players.find(
                          (player) =>
                            player.socketId === room.seriesWinnerSocketId,
                        )?.nickname ?? "um jogador"}
                      </Alert>
                    )}

                    <Box
                      sx={{
                        display: "grid",

                        gridTemplateColumns: {
                          xs: "1fr",

                          sm: "repeat(2, minmax(0, 1fr))",
                        },

                        gap: 2,
                      }}
                    >
                      {room.players.map((player) => (
                        <PlayerResult
                          key={player.socketId}
                          player={player}
                          isWinner={
                            player.socketId === room.battle?.winnerSocketId
                          }
                        />
                      ))}
                    </Box>

                    <Button
                      variant="outlined"
                      startIcon={<ContentCopyRoundedIcon />}
                      onClick={copyInviteLink}
                      sx={{ textTransform: "none" }}
                    >
                      Copiar convite novamente
                    </Button>

                    <Typography variant="body2" color="text.secondary">
                      Para jogar novamente na mesma sala, aguarde o servidor
                      reiniciar a rodada e atualizar o estado da sala.
                    </Typography>
                  </>
                )}
              </Stack>
            </Paper>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
