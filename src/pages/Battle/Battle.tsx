import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
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
  import.meta.env.VITE_SOCKET_URL || "http://localhost:3000"
).replace(/\/$/, "");
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

function extractRoomCode(value: string): string {
  const input = value.trim();

  try {
    const url = new URL(input, window.location.origin);
    const code = url.searchParams.get("room");
    if (code) return code.trim().toUpperCase();
  } catch {
    // O valor informado também pode ser somente o código da sala.
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
  /** Evita reduzir a capacidade abaixo do número de pessoas já na sala. */
  minimumPlayerCount?: number;
  onChange: <K extends keyof RoomSettings>(
    key: K,
    value: RoomSettings[K],
  ) => void;
}

function SettingsFields({
  settings,
  disabled = false,
  minimumPlayerCount = 1,
  onChange,
}: SettingsFieldsProps) {
  return (
    <Stack spacing={2}>
      <FormControl fullWidth disabled={disabled}>
        <InputLabel id="battle-difficulty-label">Dificuldade</InputLabel>
        <Select
          labelId="battle-difficulty-label"
          value={settings.difficulty}
          label="Dificuldade"
          onChange={(event) =>
            onChange("difficulty", event.target.value as Difficulty)
          }
        >
          <MenuItem value="easy">Fácil</MenuItem>
          <MenuItem value="normal">Normal</MenuItem>
          <MenuItem value="hard">Difícil</MenuItem>
        </Select>
      </FormControl>

      <FormControl fullWidth disabled={disabled}>
        <InputLabel id="battle-player-limit-label">
          Quantidade de jogadores
        </InputLabel>
        <Select
          labelId="battle-player-limit-label"
          value={settings.playerLimit}
          label="Quantidade de jogadores"
          onChange={(event) =>
            onChange("playerLimit", Number(event.target.value) as PlayerLimit)
          }
        >
          <MenuItem value={2} disabled={minimumPlayerCount > 2}>
            2 jogadores
          </MenuItem>
          <MenuItem value={3} disabled={minimumPlayerCount > 3}>
            3 jogadores
          </MenuItem>
          <MenuItem value={4}>4 jogadores</MenuItem>
        </Select>
      </FormControl>

      <FormControl fullWidth disabled={disabled}>
        <InputLabel id="battle-accents-label">Acentuação</InputLabel>
        <Select
          labelId="battle-accents-label"
          value={settings.accents ? "with" : "without"}
          label="Acentuação"
          onChange={(event) =>
            onChange("accents", event.target.value === "with")
          }
        >
          <MenuItem value="with">Com acentos</MenuItem>
          <MenuItem value="without">Sem acentos</MenuItem>
        </Select>
      </FormControl>

      <FormControl fullWidth disabled={disabled}>
        <InputLabel id="battle-duration-label">Duração por rodada</InputLabel>
        <Select
          labelId="battle-duration-label"
          value={settings.duration}
          label="Duração por rodada"
          onChange={(event) =>
            onChange("duration", Number(event.target.value) as Duration)
          }
        >
          <MenuItem value={15}>15 segundos</MenuItem>
          <MenuItem value={30}>30 segundos</MenuItem>
          <MenuItem value={60}>60 segundos</MenuItem>
        </Select>
      </FormControl>

      <FormControl fullWidth disabled={disabled}>
        <InputLabel id="battle-format-label">Formato da batalha</InputLabel>
        <Select
          labelId="battle-format-label"
          value={settings.format}
          label="Formato da batalha"
          onChange={(event) =>
            onChange("format", event.target.value as MatchFormat)
          }
        >
          <MenuItem value="single">Partida única</MenuItem>
          <MenuItem value="best-of-3">Melhor de 3</MenuItem>
          <MenuItem value="best-of-5">Melhor de 5</MenuItem>
        </Select>
      </FormControl>

      <Divider />

      <FormControlLabel
        control={
          <Switch
            checked={settings.uppercase}
            disabled={disabled}
            onChange={(event) => onChange("uppercase", event.target.checked)}
          />
        }
        label="Usar letras maiúsculas"
      />

      <FormControlLabel
        control={
          <Switch
            checked={settings.punctuation}
            disabled={disabled}
            onChange={(event) => onChange("punctuation", event.target.checked)}
          />
        }
        label="Usar pontuação"
      />
    </Stack>
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
        p: 2,
        borderColor: isWinner ? "success.main" : "divider",
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
          {isWinner && <Chip label="Vencedor" color="success" size="small" />}
        </Box>

        <Typography variant="h4" sx={{ fontWeight: 800 }}>
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

  // Atualiza o cronômetro apenas durante a contagem e a partida.
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

  // Durante a partida, mostra o progresso de todos os adversários.
  if (room && isInGame && room.battle) {
    return (
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
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                TypeBattle
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
              sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
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
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography sx={{ fontWeight: 700 }} noWrap>
                {myPlayer?.nickname ?? nickname} (você)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {myPlayer?.ppm ?? 0} PPM · Precisão {myPlayer?.accuracy ?? 100}%
                · {myPlayer?.errors ?? 0} erros
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, Math.max(0, myPlayer?.progress ?? 0))}
                sx={{ mt: 1.5, height: 4, borderRadius: 2 }}
              />
            </Paper>

            <Stack spacing={1.5}>
              <Typography variant="subtitle2" color="text.secondary">
                Adversários ({opponents.length})
              </Typography>
              {opponents.map((opponent) => (
                <Paper key={opponent.socketId} variant="outlined" sx={{ p: 2 }}>
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
                    sx={{ mt: 1, height: 4, borderRadius: 2 }}
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
                Prepare-se para digitar
              </Typography>
              <Typography
                variant="h1"
                sx={{ fontWeight: 900, fontVariantNumeric: "tabular-nums" }}
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
                    sx={{ color: "text.primary", fontWeight: 700 }}
                  >
                    {myPlayer?.ppm ?? 0}
                  </Box>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Precisão:{" "}
                  <Box
                    component="span"
                    sx={{ color: "text.primary", fontWeight: 700 }}
                  >
                    {myPlayer?.accuracy ?? 100}%
                  </Box>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Erros:{" "}
                  <Box
                    component="span"
                    sx={{ color: "text.primary", fontWeight: 700 }}
                  >
                    {myPlayer?.errors ?? 0}
                  </Box>
                </Typography>
              </Box>
            </Box>
          )}
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 6 } }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>
            TypeBattle
          </Typography>
          <Typography color="text.secondary">
            Desafie seus amigos e descubra quem digita mais rápido.
          </Typography>
          <Chip
            sx={{ mt: 2 }}
            size="small"
            color={connected ? "success" : "default"}
            label={connected ? "Conectado ao servidor" : "Conectando..."}
          />
        </Box>

        {error && <Alert severity="error">{error}</Alert>}
        {notice && <Alert severity="info">{notice}</Alert>}

        {!room && screen === "home" && (
          <Stack spacing={2}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Como você quer jogar?
            </Typography>

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
              <Paper
                variant="outlined"
                sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2 }}
              >
                <AddCircleOutlineRoundedIcon
                  color="primary"
                  sx={{ fontSize: 42 }}
                />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Criar sala
                </Typography>
                <Typography color="text.secondary" sx={{ flexGrow: 1 }}>
                  Configure a partida e convide seus amigos.
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => openScreen("create")}
                >
                  Criar sala
                </Button>
              </Paper>

              <Paper
                variant="outlined"
                sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2 }}
              >
                <LoginRoundedIcon color="success" sx={{ fontSize: 42 }} />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Entrar na sala
                </Typography>
                <Typography color="text.secondary" sx={{ flexGrow: 1 }}>
                  Use o link ou o código recebido do anfitrião.
                </Typography>
                <Button
                  variant="outlined"
                  color="success"
                  size="large"
                  onClick={() => openScreen("join")}
                >
                  Entrar na sala
                </Button>
              </Paper>
            </Box>
          </Stack>
        )}

        {!room && screen === "create" && (
          <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
            <Stack spacing={3}>
              <Button
                startIcon={<ArrowBackRoundedIcon />}
                onClick={() => openScreen("home")}
                sx={{ alignSelf: "flex-start" }}
              >
                Voltar
              </Button>

              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  Criar uma sala
                </Typography>
                <Typography color="text.secondary">
                  Escolha seu nick e configure a batalha.
                </Typography>
              </Box>

              <TextField
                label="Seu nick"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                slotProps={{ htmlInput: { maxLength: 16 } }}
                fullWidth
              />

              <Divider />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Configurações da partida
              </Typography>

              <SettingsFields settings={settings} onChange={updateSetting} />

              <Button
                variant="contained"
                size="large"
                onClick={createRoom}
                disabled={!connected || isCreating || isJoining}
              >
                {isCreating ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  "Criar sala"
                )}
              </Button>
            </Stack>
          </Paper>
        )}

        {!room && screen === "join" && (
          <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
            <Stack spacing={3}>
              {!inviteCode && (
                <Button
                  startIcon={<ArrowBackRoundedIcon />}
                  onClick={() => openScreen("home")}
                  sx={{ alignSelf: "flex-start" }}
                >
                  Voltar
                </Button>
              )}

              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
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

        {room && (
          <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  Sala {room.code}
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

                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Jogadores ({room.players.length}/{room.settings.playerLimit}
                    )
                  </Typography>

                  <Stack spacing={1}>
                    {room.players.map((player) => (
                      <Paper
                        key={player.socketId}
                        variant="outlined"
                        sx={{ p: 2 }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 2,
                          }}
                        >
                          <Typography sx={{ fontWeight: 600 }}>
                            {player.nickname}
                          </Typography>
                          <Chip
                            size="small"
                            label={
                              player.socketId === room.hostSocketId
                                ? "Anfitrião"
                                : "Jogador"
                            }
                          />
                        </Box>
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
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Configurações da partida
                  </Typography>
                  <Typography>
                    Dificuldade:{" "}
                    {room.settings.difficulty === "easy"
                      ? "Fácil"
                      : room.settings.difficulty === "normal"
                        ? "Normal"
                        : "Difícil"}
                  </Typography>
                  <Typography>
                    Jogadores necessários: {room.settings.playerLimit}
                  </Typography>
                  <Typography>
                    Acentuação:{" "}
                    {room.settings.accents ? "Com acentos" : "Sem acentos"}
                  </Typography>
                  <Typography>
                    Duração: {room.settings.duration} segundos
                  </Typography>
                  <Typography>
                    Formato:{" "}
                    {room.settings.format === "single"
                      ? "Partida única"
                      : room.settings.format === "best-of-3"
                        ? "Melhor de 3"
                        : "Melhor de 5"}
                  </Typography>
                  <Typography>
                    Letras maiúsculas:{" "}
                    {room.settings.uppercase ? "Ativadas" : "Desativadas"}
                  </Typography>
                  <Typography>
                    Pontuação:{" "}
                    {room.settings.punctuation ? "Ativada" : "Desativada"}
                  </Typography>

                  {isHost && (
                    <>
                      <Divider />
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
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
                      >
                        Atualizar configurações
                      </Button>
                      <Button
                        variant="contained"
                        size="large"
                        startIcon={<PlayArrowRoundedIcon />}
                        onClick={startBattle}
                        disabled={!connected || !roomIsFull}
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
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>
                    {room.battle.winnerSocketId
                      ? `Vitória de ${room.players.find((player) => player.socketId === room.battle?.winnerSocketId)?.nickname ?? "um jogador"}!`
                      : "Empate!"}
                  </Typography>

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
  );
}
