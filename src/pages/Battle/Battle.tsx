import { useEffect, useRef, useState } from "react";
import { Alert, Box } from "@mui/material";
import { useSearchParams } from "react-router-dom";

import { useAuth } from "../../contexts/useAuth";
import { extractRoomCode } from "./battleUtils";
import { BattleEntry } from "./components/BattleEntry";
import { BattleJoin } from "./components/BattleJoin";
import { BattleLobby } from "./components/BattleLobby";
import { BattleMatch } from "./components/BattleMatch";
import { BattleResult } from "./components/BattleResult";
import { colors } from "./styles";
import { useBattleRoom } from "./useBattleRoom";

export function Battle() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get("room")?.toUpperCase() ?? "";

  const battle = useBattleRoom();
  const { room } = battle;

  // Código da sala em que a pessoa vai entrar (link de convite ou digitado).
  // Com ele preenchido, aparece a tela de escolher o nick.
  const [joinCode, setJoinCode] = useState(inviteCode);

  function continueToJoin(codeOrLink: string) {
    const code = extractRoomCode(codeOrLink);

    if (!code) {
      battle.showError("Informe o código ou link da sala.");
      return;
    }

    battle.showError("");
    setJoinCode(code);
    window.history.replaceState({}, "", `/battle?room=${code}`);
  }

  function backToEntry() {
    battle.showError("");
    setJoinCode("");
    window.history.replaceState({}, "", "/battle");
  }

  function leaveRoom() {
    battle.leaveRoom();
    setJoinCode("");
  }

  // Usa o nome da conta até o jogador digitar outro nick.
  const [nicknameInput, setNicknameInput] = useState<string | null>(null);
  const nickname = nicknameInput ?? user?.name ?? "";

  const typingInputRef = useRef<HTMLInputElement | null>(null);
  const { now } = battle;
  const status = room?.status;

  useEffect(() => {
    if (status === "playing") typingInputRef.current?.focus();
  }, [status, room?.battle?.round]);

  let content;

  if (!room && joinCode) {
    content = (
      <BattleJoin
        code={joinCode}
        nickname={nickname}
        connected={battle.connected}
        isJoining={battle.isJoining}
        onNicknameChange={setNicknameInput}
        onJoin={() => battle.joinRoom(nickname, joinCode)}
        onBack={backToEntry}
      />
    );
  } else if (!room) {
    content = (
      <BattleEntry
        nickname={nickname}
        connected={battle.connected}
        isCreating={battle.isCreating}
        onNicknameChange={setNicknameInput}
        onCreate={() => battle.createRoom(nickname)}
        onContinue={continueToJoin}
      />
    );
  } else if ((status === "countdown" || status === "playing") && room.battle) {
    content = (
      <BattleMatch
        room={room}
        myId={battle.myId}
        typedText={battle.typedText}
        now={now}
        playStartedAt={battle.playStartedAt}
        inputRef={typingInputRef}
        onType={battle.sendProgress}
      />
    );
  } else if (status === "finished" && room.battle) {
    content = (
      <BattleResult
        room={room}
        myId={battle.myId}
        finishedAt={battle.finishedAt}
        now={now}
        onLeave={leaveRoom}
        onCopyInvite={battle.copyInviteLink}
      />
    );
  } else {
    content = (
      <BattleLobby
        room={room}
        myId={battle.myId}
        connected={battle.connected}
        onUpdateSettings={battle.updateSettings}
        onStart={battle.startBattle}
        onLeave={leaveRoom}
        onCopyInvite={battle.copyInviteLink}
        onCopyCode={battle.copyRoomCode}
      />
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: colors.background,
        color: "#ffffff",
        px: { xs: 2, md: 3 },
        py: { xs: 3, md: 5 },
      }}
    >
      <Box
        sx={{
          maxWidth: 1100,
          mx: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 2.5,
        }}
      >
        {battle.error && <Alert severity="error">{battle.error}</Alert>}
        {battle.notice && <Alert severity="info">{battle.notice}</Alert>}
        {content}
      </Box>
    </Box>
  );
}
