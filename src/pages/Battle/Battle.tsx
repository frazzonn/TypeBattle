import { useEffect, useRef, useState } from "react";
import { Alert, Box } from "@mui/material";
import { useSearchParams } from "react-router-dom";

import { useAuth } from "../../contexts/useAuth";
import { BattleEntry } from "./components/BattleEntry";
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

  if (!room) {
    content = (
      <BattleEntry
        nickname={nickname}
        inviteCode={inviteCode}
        connected={battle.connected}
        isCreating={battle.isCreating}
        isJoining={battle.isJoining}
        onNicknameChange={setNicknameInput}
        onCreate={() => battle.createRoom(nickname)}
        onJoin={(code) => battle.joinRoom(nickname, code)}
      />
    );
  } else if ((status === "countdown" || status === "playing") && room.battle) {
    content = (
      <BattleMatch
        room={room}
        myId={battle.myId}
        typedText={battle.typedText}
        now={now}
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
        onLeave={battle.leaveRoom}
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
        onLeave={battle.leaveRoom}
        onCopyInvite={battle.copyInviteLink}
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
