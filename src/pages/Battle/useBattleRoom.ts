import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

import { useAuth } from "../../contexts/useAuth";
import {
  buildInviteLink,
  extractRoomCode,
  getErrorMessage,
  getRoomFromPayload,
} from "./battleUtils";
import { DEFAULT_SETTINGS, type BattleRoom, type RoomSettings } from "./types";

const SOCKET_URL = (
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.PROD
    ? "https://typebattle.up.railway.app"
    : "http://localhost:3000")
).replace(/\/+$/, "");

type PendingAction = "create" | "join" | null;

// Conexão com o servidor de batalhas e todo o estado da sala atual.
export function useBattleRoom() {
  // Com o token, o servidor mostra a foto de perfil de quem está logado.
  const { token } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const pendingActionRef = useRef<PendingAction>(null);
  const hasRoomRef = useRef(false);

  const [connected, setConnected] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const [room, setRoom] = useState<BattleRoom | null>(null);
  const [typedText, setTypedText] = useState("");
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  // Relógio local da contagem, do cronômetro e de "próxima rodada".
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    function applyRoom(incomingRoom: BattleRoom) {
      const action = pendingActionRef.current;

      hasRoomRef.current = true;
      pendingActionRef.current = null;
      // Atualiza o relógio junto com a sala para a contagem não começar defasada.
      setNow(Date.now());
      setRoom(incomingRoom);
      setPendingAction(null);
      setError("");

      if (action === "create") {
        window.history.replaceState(
          {},
          "",
          `/battle?room=${incomingRoom.code}`,
        );
      }
    }

    socket.on("connect", () => {
      setConnected(true);
      setMyId(socket.id ?? null);
      setError("");
    });

    socket.on("disconnect", () => {
      setConnected(false);

      // O servidor remove o jogador da sala ao perder a conexão.
      if (hasRoomRef.current) {
        hasRoomRef.current = false;
        setRoom(null);
        setError("A conexão com o servidor caiu. Entre na sala novamente.");
      }
    });

    for (const event of ["room:created", "room:joined", "room:updated"]) {
      socket.on(event, (payload: unknown) => {
        const incomingRoom = getRoomFromPayload(payload);
        if (incomingRoom) applyRoom(incomingRoom);
      });
    }

    socket.on("battle:countdown", () => {
      setTypedText("");
      setNotice("");
    });

    socket.on("battle:started", () => {
      setTypedText("");
    });

    socket.on("battle:finished", (payload: unknown) => {
      const finishedRoom = getRoomFromPayload(payload);
      const finishedTime = Date.now();
      if (finishedRoom) setRoom(finishedRoom);
      setNow(finishedTime);
      setFinishedAt(finishedTime);
    });

    socket.on("room:error", (payload: unknown) => {
      pendingActionRef.current = null;
      setPendingAction(null);
      setError(getErrorMessage(payload));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const status = room?.status;
  const isTimed =
    status === "countdown" || status === "playing" || status === "finished";

  useEffect(() => {
    if (!isTimed) return;

    const interval = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(interval);
  }, [isTimed]);

  function getConnectedSocket(): Socket | null {
    if (!connected || !socketRef.current) {
      setError("Conectando ao servidor. Tente novamente em instantes.");
      return null;
    }

    return socketRef.current;
  }

  function createRoom(nickname: string) {
    const cleanNickname = nickname.trim();

    if (!cleanNickname) {
      setError("Digite seu nick antes de criar a sala.");
      return;
    }

    const socket = getConnectedSocket();
    if (!socket) return;

    setError("");
    setNotice("");
    pendingActionRef.current = "create";
    setPendingAction("create");
    socket.emit("room:create", {
      nickname: cleanNickname,
      settings: DEFAULT_SETTINGS,
      token: token ?? undefined,
    });
  }

  function joinRoom(nickname: string, codeOrLink: string) {
    const cleanNickname = nickname.trim();
    const code = extractRoomCode(codeOrLink);

    if (!cleanNickname) {
      setError("Digite seu nick antes de entrar na sala.");
      return;
    }

    if (!code) {
      setError("Informe o código ou link da sala.");
      return;
    }

    const socket = getConnectedSocket();
    if (!socket) return;

    setError("");
    setNotice("");
    pendingActionRef.current = "join";
    setPendingAction("join");
    socket.emit("room:join", {
      nickname: cleanNickname,
      code,
      token: token ?? undefined,
    });
  }

  // Só o anfitrião altera; a mudança vale assim que o servidor confirma.
  function updateSettings(settings: RoomSettings) {
    setError("");
    socketRef.current?.emit("room:update-settings", { settings });
  }

  function startBattle() {
    setError("");
    setNotice("");
    socketRef.current?.emit("battle:start");
  }

  function leaveRoom() {
    socketRef.current?.emit("room:leave");
    hasRoomRef.current = false;
    setRoom(null);
    setError("");
    setNotice("");
    window.history.replaceState({}, "", "/battle");
  }

  const sendProgress = useCallback(
    (value: string) => {
      setTypedText(value);

      if (room?.status === "playing") {
        socketRef.current?.emit("battle:progress", { typedText: value });
      }
    },
    [room?.status],
  );

  async function copyText(text: string, success: string, fallback: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice(success);
    } catch {
      setNotice(`${fallback}: ${text}`);
    }
  }

  function copyInviteLink() {
    if (!room) return;

    void copyText(
      buildInviteLink(room.code),
      "Link de convite copiado!",
      "Copie este link para convidar",
    );
  }

  function copyRoomCode() {
    if (!room) return;

    void copyText(room.code, "Código da sala copiado!", "Código da sala");
  }

  // Mensagem de erro da tela de entrada (ex.: código vazio).
  function showError(message: string) {
    setError(message);
  }

  return {
    connected,
    myId,
    room,
    now,
    typedText,
    finishedAt,
    error,
    notice,
    isCreating: pendingAction === "create",
    isJoining: pendingAction === "join",
    createRoom,
    joinRoom,
    updateSettings,
    startBattle,
    leaveRoom,
    sendProgress,
    copyInviteLink,
    copyRoomCode,
    showError,
  };
}
