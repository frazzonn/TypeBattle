import { useEffect, useRef, useState, type FormEvent } from "react";
import { Box, Typography } from "@mui/material";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";

import { UserTags } from "../../../components/UserTags";
import { Bomb } from "../../Arcade/pavio/Bomb";
import { normalizeWord, REJECTION_MESSAGES } from "../../Arcade/pavio/pavioRules";
import { getMaximumRounds, getPlayerColor, getPlayerName } from "../battleUtils";
import { cardSx, colors, labelSx, monoFont } from "../styles";
import type { BattleRoom } from "../types";
import type { PavioFeedback, PavioTyping } from "../useBattleRoom";
import { PlayerAvatar } from "./PlayerAvatar";

// Mesmo valor de PAVIO_LIVES no servidor (backend/src/socket/pavioBattle.ts).
const LIVES = 2;
// O pavio queima entre 12 e 24 s; a bomba treme mais conforme o tempo passa.
const FUSE_MAX_MS = 24_000;

interface PavioMatchProps {
  room: BattleRoom;
  myId: string | null;
  now: number;
  typing: PavioTyping | null;
  feedback: PavioFeedback | null;
  onType: (text: string) => void;
  onSubmit: (word: string) => void;
}

// Destaca a sílaba dentro do que foi digitado.
function Highlighted({ value, syllable }: { value: string; syllable: string | null }) {
  const index = syllable ? normalizeWord(value).indexOf(syllable) : -1;
  if (!syllable || index < 0 || normalizeWord(value).length !== value.trim().length) {
    return <>{value}</>;
  }
  return (
    <>
      {value.slice(0, index)}
      <Box component="span" sx={{ color: colors.accent }}>
        {value.slice(index, index + syllable.length)}
      </Box>
      {value.slice(index + syllable.length)}
    </>
  );
}

export function PavioMatch({ room, myId, now, typing, feedback, onType, onSubmit }: PavioMatchProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [input, setInput] = useState("");

  const pavio = room.pavio ?? null;
  const battle = room.battle;
  const turnId = pavio?.turnSocketId ?? null;
  const isMyTurn = Boolean(myId) && turnId === myId && room.status === "playing";
  const myLives = myId ? (pavio?.lives[myId] ?? LIVES) : 0;

  // Quando a vez muda, o campo começa vazio. A hora em que a bomba nova
  // chegou é marcada pelo relógio daqui (o do servidor pode estar adiantado).
  const [previousTurn, setPreviousTurn] = useState(turnId);
  const [previousBomb, setPreviousBomb] = useState(pavio?.bombStartedAt ?? null);
  const [bombSeenAt, setBombSeenAt] = useState(() => Date.now());
  if (turnId !== previousTurn) {
    setPreviousTurn(turnId);
    setInput("");
  }
  if ((pavio?.bombStartedAt ?? null) !== previousBomb) {
    setPreviousBomb(pavio?.bombStartedAt ?? null);
    setBombSeenAt(now);
  }

  useEffect(() => {
    if (isMyTurn) inputRef.current?.focus();
  }, [isMyTurn]);

  if (!battle) return null;

  const isCountdown = room.status === "countdown";
  const countdown = battle.countdownEndsAt
    ? Math.max(0, Math.ceil((battle.countdownEndsAt - now) / 1000))
    : 0;
  const explosion = pavio?.explosion ?? null;
  const tension = pavio?.bombStartedAt && !explosion
    ? Math.min(1, Math.max(0, now - bombSeenAt) / FUSE_MAX_MS)
    : 0;
  const isSeries = room.settings.format !== "single";

  // Texto ao vivo de quem está com a bomba (o meu vem do campo).
  const liveText = isMyTurn ? input : typing && typing.socketId === turnId ? typing.text : "";
  const rejectedNow =
    feedback?.kind === "rejected" && feedback.socketId === turnId && now - feedback.key < 900;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!isMyTurn || !input.trim()) return;
    onSubmit(input);
  }

  let message: string;
  if (isCountdown) message = "Prepare-se…";
  else if (explosion) {
    const name = getPlayerName(room, explosion.socketId);
    const left = pavio?.lives[explosion.socketId] ?? 0;
    message = left > 0 ? `Explodiu com ${name}! Perdeu uma vida.` : `Explodiu com ${name}! Está fora.`;
  } else if (isMyTurn) message = "Sua vez! Escreva uma palavra com essas letras.";
  else if (turnId) message = `Vez de ${getPlayerName(room, turnId)}`;
  else message = "";

  let feedbackLine = "";
  if (feedback && now - feedback.key < 2500) {
    const name = feedback.socketId === myId ? "Você" : getPlayerName(room, feedback.socketId);
    feedbackLine =
      feedback.kind === "accepted"
        ? `${name}: ${feedback.word} ✓`
        : `${name} tentou "${feedback.word}": ${REJECTION_MESSAGES[feedback.reason]}`;
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 2 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          <Typography sx={{ color: colors.textSecondary, fontSize: 13 }}>
            Sala{" "}
            <Box component="span" sx={{ fontFamily: monoFont, color: colors.textMuted }}>
              {room.code}
            </Box>
          </Typography>
          <Typography sx={{ fontSize: 20, fontWeight: 800 }}>
            Pavio
            {isSeries && (
              <Box component="span" sx={{ color: colors.textSecondary, fontWeight: 600 }}>
                {" "}· rodada {battle.round} de {getMaximumRounds(room.settings.format)}
              </Box>
            )}
          </Typography>
        </Box>
        {pavio && (
          <Typography sx={{ color: colors.textSecondary, fontSize: 14 }}>
            {pavio.wordsPlayed} {pavio.wordsPlayed === 1 ? "palavra usada" : "palavras usadas"}
          </Typography>
        )}
      </Box>

      {/* Jogadores */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: `repeat(${room.players.length}, minmax(0, 1fr))` },
          gap: 1.5,
        }}
      >
        {room.players.map((player) => {
          const lives = pavio?.lives[player.socketId] ?? LIVES;
          const out = lives === 0;
          const holding = player.socketId === turnId;
          const color = getPlayerColor(room, player.socketId);
          return (
            <Box
              key={player.socketId}
              sx={{
                ...cardSx,
                p: 1.75, display: "flex", alignItems: "center", gap: 1.25, minWidth: 0,
                borderColor: holding ? "rgba(253,186,116,0.6)" : colors.border,
                bgcolor: holding ? "rgba(253,186,116,0.07)" : colors.paper,
                opacity: out ? 0.4 : player.connected === false ? 0.6 : 1,
                transition: "border-color 150ms ease, background-color 150ms ease",
              }}
            >
              <PlayerAvatar nickname={player.nickname} avatarUrl={player.avatarUrl} color={color} size={36} />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography noWrap sx={{ fontWeight: 700, fontSize: 14 }}>
                  {player.nickname}
                  {player.socketId === myId && (
                    <Box component="span" sx={{ color: colors.textSecondary, fontWeight: 500 }}> (você)</Box>
                  )}
                </Typography>
                <UserTags tags={player.tags} sx={{ my: 0.25 }} />
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  {out ? (
                    <Typography sx={{ fontSize: 12, color: colors.textSecondary }}>fora</Typography>
                  ) : (
                    Array.from({ length: LIVES }, (_, index) =>
                      index < lives ? (
                        <FavoriteRoundedIcon key={index} sx={{ fontSize: 15, color: "#ff5c7a" }} />
                      ) : (
                        <FavoriteBorderRoundedIcon key={index} sx={{ fontSize: 15, color: "#5d6270" }} />
                      ),
                    )
                  )}
                  <Typography sx={{ fontSize: 12, color: colors.textSecondary, fontFamily: monoFont }}>
                    · {pavio?.words[player.socketId] ?? 0} pal.
                  </Typography>
                </Box>
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Bomba */}
      <Box
        sx={{
          ...cardSx,
          px: { xs: 2, sm: 4 }, py: 4, minHeight: 440,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
          borderColor: isMyTurn ? "rgba(253,186,116,0.45)" : colors.border,
        }}
      >
        {isCountdown ? (
          <Box sx={{ display: "grid", placeItems: "center", minHeight: 320, gap: 1 }}>
            <Typography sx={{ fontFamily: monoFont, fontSize: 96, fontWeight: 900, color: colors.accent }}>
              {countdown || "Já!"}
            </Typography>
            <Typography sx={{ color: colors.textSecondary }}>
              Cada um tem {LIVES} vidas. Quem estiver com a bomba quando ela explodir perde uma.
            </Typography>
          </Box>
        ) : (
          <>
            <Typography sx={{ ...labelSx, letterSpacing: "2px", color: isMyTurn ? "#fdba74" : colors.textSecondary }}>
              {message.toUpperCase()}
            </Typography>

            <Bomb
              syllable={explosion ? explosion.syllable : (pavio?.syllable ?? null)}
              tension={tension}
              exploded={Boolean(explosion)}
              error={rejectedNow}
              size={170}
            />

            {explosion ? (
              explosion.examples.length > 0 && (
                <Typography sx={{ color: colors.textSecondary, fontSize: 15 }}>
                  Dava para usar: {explosion.examples.join(", ")}
                </Typography>
              )
            ) : isMyTurn ? (
              <Box component="form" onSubmit={submit} sx={{ width: "100%", maxWidth: 440 }}>
                <Box
                  onClick={() => inputRef.current?.focus()}
                  sx={{
                    position: "relative", px: 2, py: 1.5, borderRadius: "12px", bgcolor: colors.background,
                    border: `1px solid ${rejectedNow ? "rgba(255,92,122,.6)" : "rgba(253,186,116,.5)"}`,
                    fontFamily: monoFont, fontSize: 26, fontWeight: 700, textAlign: "center",
                    minHeight: 62, cursor: "text", overflowWrap: "anywhere",
                  }}
                >
                  {input ? (
                    <Highlighted value={input} syllable={pavio?.syllable ?? null} />
                  ) : (
                    <Box component="span" sx={{ color: "#5d6270" }}>digite e aperte Enter…</Box>
                  )}
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(event) => {
                      const value = event.target.value.slice(0, 30);
                      setInput(value);
                      onType(value);
                    }}
                    aria-label={`Palavra com ${pavio?.syllable ?? ""}`}
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%" }}
                  />
                </Box>
              </Box>
            ) : (
              <Typography
                sx={{
                  fontFamily: monoFont, fontSize: 26, fontWeight: 700, minHeight: 62,
                  display: "grid", placeItems: "center", color: liveText ? "#fff" : "#5d6270",
                }}
              >
                {liveText ? <Highlighted value={liveText} syllable={pavio?.syllable ?? null} /> : "…"}
              </Typography>
            )}

            <Typography
              sx={{
                minHeight: 22, fontSize: 14, fontWeight: 600,
                color: feedback?.kind === "accepted" ? "#4ade80" : "#ff5c7a",
              }}
            >
              {feedbackLine}
            </Typography>

            {myId && myLives === 0 && !explosion && (
              <Typography sx={{ color: colors.textSecondary, fontSize: 14 }}>
                Você está fora desta rodada. Assista até o fim!
              </Typography>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}
