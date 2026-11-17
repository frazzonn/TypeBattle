import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import { keyframes } from "@mui/material/styles";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";

import { UserTags } from "../../../components/UserTags";
import { Bomb } from "../../Arcade/pavio/Bomb";
import { normalizeWord, REJECTION_MESSAGES } from "../../Arcade/pavio/pavioRules";
import { getMaximumRounds, getPlayerColor, getPlayerName } from "../battleUtils";
import { cardSx, colors, labelSx, monoFont } from "../styles";
import type { BattleRoom, PavioRejection } from "../types";
import type { PavioFeedback, PavioLogEntry, PavioTyping } from "../useBattleRoom";
import { PlayerAvatar } from "./PlayerAvatar";

// Mesmo valor de PAVIO_LIVES no servidor (backend/src/socket/pavioBattle.ts).
const LIVES = 2;
// O pavio queima entre 20 e 35 s; a bomba treme mais conforme o tempo passa.
const FUSE_MAX_MS = 35_000;
const HOLDER = "#fdba74";
const DANGER = "#ff5c7a";

const ring = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(253,186,116,.55); }
  100% { box-shadow: 0 0 0 12px rgba(253,186,116,0); }
`;
const blink = keyframes`0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; }`;

// Motivos curtos para o lance a lance.
const SHORT_REASON: Record<PavioRejection, string> = {
  short: "curta demais",
  letters: "só letras",
  missing: "sem a sílaba",
  used: "já usada",
  unknown: "não existe",
};

interface PavioMatchProps {
  room: BattleRoom;
  myId: string | null;
  now: number;
  typing: PavioTyping | null;
  feedback: PavioFeedback | null;
  log: PavioLogEntry[];
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

function Caret({ height }: { height: number }) {
  return (
    <Box
      component="span"
      aria-hidden="true"
      sx={{
        display: "inline-block", width: 2, height, ml: "2px", verticalAlign: "middle", bgcolor: HOLDER,
        animation: `${blink} 1s step-end infinite`,
        "@media (prefers-reduced-motion: reduce)": { animation: "none" },
      }}
    />
  );
}

function Hearts({ lives }: { lives: number }) {
  return (
    <Box sx={{ display: "flex", gap: "2px" }} aria-label={`${lives} de ${LIVES} vidas`}>
      {Array.from({ length: LIVES }, (_, index) =>
        index < lives ? (
          <FavoriteRoundedIcon key={index} sx={{ fontSize: 14, color: DANGER }} />
        ) : (
          <FavoriteBorderRoundedIcon key={index} sx={{ fontSize: 14, color: "#5d6270" }} />
        ),
      )}
    </Box>
  );
}

export function PavioMatch({ room, myId, now, typing, feedback, log, onType, onSubmit }: PavioMatchProps) {
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
  const syllable = explosion ? explosion.syllable : (pavio?.syllable ?? null);

  // Texto ao vivo de quem está com a bomba (o meu vem do campo).
  const liveText = isMyTurn ? input : typing && typing.socketId === turnId ? typing.text : "";
  const rejectedNow =
    feedback?.kind === "rejected" && feedback.socketId === turnId && now - feedback.key < 900;

  // Roda: você sempre embaixo; os outros seguem a ordem da sala, no sentido horário.
  const players = room.players;
  const myIndex = Math.max(0, players.findIndex((player) => player.socketId === myId));
  const seats = players.map((player, index) => {
    const step = (index - myIndex + players.length) % players.length;
    const angle = 90 + (step * 360) / players.length;
    const radians = (angle * Math.PI) / 180;
    return { player, angle, x: 50 + Math.cos(radians) * 38, y: 50 + Math.sin(radians) * 38 };
  });
  const pointerSeat = seats.find((seat) => seat.player.socketId === (explosion?.socketId ?? turnId));

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!isMyTurn || !input.trim()) return;
    onSubmit(input);
  }

  let headline: string;
  let headlineColor: string = colors.textSecondary;
  if (isCountdown) headline = "Prepare-se";
  else if (explosion) {
    const name = getPlayerName(room, explosion.socketId);
    const out = (pavio?.lives[explosion.socketId] ?? 0) === 0;
    headline = out ? `Explodiu com ${name} · está fora` : `Explodiu com ${name} · perdeu uma vida`;
    headlineColor = DANGER;
  } else if (isMyTurn) {
    headline = `Sua vez · escreva uma palavra com ${(syllable ?? "").toUpperCase()}`;
    headlineColor = HOLDER;
  } else headline = turnId ? `Vez de ${getPlayerName(room, turnId)}` : "";

  let below: ReactNode = null;
  if (isCountdown) {
    below = (
      <Typography sx={{ color: colors.textSecondary, textAlign: "center" }}>
        Cada um tem {LIVES} vidas. Quem estiver com a bomba quando ela explodir perde uma.
      </Typography>
    );
  } else if (explosion) {
    below = (
      <Typography sx={{ color: colors.textMuted, fontSize: 15, textAlign: "center" }}>
        {explosion.examples.length > 0 && (
          <>
            Para <b style={{ fontFamily: monoFont }}>{explosion.syllable.toUpperCase()}</b> dava:{" "}
            <Box component="span" sx={{ fontFamily: monoFont, color: "#fff" }}>{explosion.examples.join(", ")}</Box>
          </>
        )}
      </Typography>
    );
  } else if (isMyTurn) {
    below = (
      <Box component="form" onSubmit={submit} sx={{ width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", alignItems: "center", gap: 0.75 }}>
        <Box
          component="label"
          onClick={() => inputRef.current?.focus()}
          sx={{
            position: "relative", width: "100%", boxSizing: "border-box", px: 2, py: 1.25, borderRadius: "12px",
            bgcolor: colors.background, border: `1px solid ${rejectedNow ? "rgba(255,92,122,.7)" : "rgba(253,186,116,.6)"}`,
            fontFamily: monoFont, fontSize: 26, fontWeight: 700, textAlign: "center", minHeight: 58,
            cursor: "text", overflowWrap: "anywhere",
          }}
        >
          {input ? <Highlighted value={input} syllable={syllable} /> : null}
          <Caret height={26} />
          <input
            ref={inputRef}
            value={input}
            onChange={(event) => {
              const value = event.target.value.slice(0, 30);
              setInput(value);
              onType(value);
            }}
            aria-label={`Palavra com ${syllable ?? ""}`}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%" }}
          />
        </Box>
        <Typography sx={{ fontSize: 13, color: colors.textSecondary }}>Enter manda a palavra · acento é opcional</Typography>
      </Box>
    );
  } else if (turnId) {
    below = (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5, minHeight: 58 }}>
        <Typography sx={{ fontSize: 13, color: colors.textSecondary }}>
          {getPlayerName(room, turnId)} está digitando
        </Typography>
        <Typography sx={{ fontFamily: monoFont, fontSize: 26, fontWeight: 700 }}>
          {liveText ? <Highlighted value={liveText} syllable={syllable} /> : null}
          <Caret height={26} />
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 2 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          <Typography sx={{ color: colors.textSecondary, fontSize: 13 }}>
            Sala{" "}
            <Box component="span" sx={{ fontFamily: monoFont, color: colors.textMuted }}>{room.code}</Box>
          </Typography>
          <Typography component="h1" sx={{ fontSize: 22, fontWeight: 800 }}>
            Pavio
            {isSeries && (
              <Box component="span" sx={{ color: colors.textSecondary, fontWeight: 600, fontSize: 18 }}>
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

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) 290px" }, gap: 2.5, alignItems: "start" }}>
        {/* Arena */}
        <Box
          sx={{
            ...cardSx, borderRadius: "20px", px: { xs: 1.5, sm: 3 }, pt: 2.25, pb: 3,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5,
            borderColor: explosion ? "rgba(255,92,122,.45)" : isMyTurn ? "rgba(253,186,116,.45)" : colors.border,
            transition: "border-color 200ms ease",
          }}
        >
          <Typography sx={{ ...labelSx, letterSpacing: "2px", color: headlineColor, textAlign: "center" }}>
            {headline.toUpperCase()}
          </Typography>

          <Box sx={{ position: "relative", width: "100%", maxWidth: 560, aspectRatio: { xs: "1 / 1.05", sm: "1.2 / 1" } }}>
            {/* Órbita */}
            <Box
              sx={{
                position: "absolute", left: "12%", top: "12%", right: "12%", bottom: "12%", borderRadius: "50%",
                border: "2px dashed rgba(167,139,250,.16)",
              }}
            />

            {/* Seta da bomba para quem está com ela */}
            {pointerSeat && !isCountdown && (
              <Box
                aria-hidden="true"
                sx={{
                  position: "absolute", left: "50%", top: "50%", width: 120, height: 4,
                  transformOrigin: "0 50%", transform: `rotate(${pointerSeat.angle}deg)`,
                  transition: "transform 350ms cubic-bezier(.3,1.4,.5,1)",
                  "@media (prefers-reduced-motion: reduce)": { transition: "none" },
                }}
              >
                <Box sx={{ position: "absolute", left: 58, top: 0, width: 50, height: 4, borderRadius: 2, background: `linear-gradient(90deg, rgba(253,186,116,0), ${explosion ? DANGER : HOLDER})` }} />
                <Box sx={{ position: "absolute", left: 106, top: -6, width: 0, height: 0, borderLeft: `12px solid ${explosion ? DANGER : HOLDER}`, borderTop: "8px solid transparent", borderBottom: "8px solid transparent" }} />
              </Box>
            )}

            {/* Bomba no centro */}
            <Box sx={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -54%)" }}>
              {isCountdown ? (
                <Typography sx={{ fontFamily: monoFont, fontSize: 64, fontWeight: 900, color: colors.accent }}>
                  {countdown || "Já!"}
                </Typography>
              ) : (
                <Bomb syllable={syllable} tension={tension} exploded={Boolean(explosion)} error={rejectedNow} size={96} />
              )}
            </Box>

            {/* Jogadores em volta */}
            {seats.map(({ player, x, y }) => {
              const lives = pavio?.lives[player.socketId] ?? LIVES;
              const out = lives === 0 && explosion?.socketId !== player.socketId;
              const holding = player.socketId === turnId;
              const exploded = explosion?.socketId === player.socketId;
              const isMe = player.socketId === myId;
              const showBubble = holding && !isMe && Boolean(typing?.text) && typing?.socketId === player.socketId;
              return (
                <Box
                  key={player.socketId}
                  sx={{
                    position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)",
                    // Com muitos jogadores na roda, cada lugar fica mais estreito.
                    width: players.length > 5 ? { xs: 78, sm: 116 } : { xs: 104, sm: 150 },
                    display: "flex", flexDirection: "column", alignItems: "center",
                    gap: 0.4, textAlign: "center", opacity: out ? 0.4 : player.connected === false ? 0.6 : 1,
                    transition: "opacity 200ms ease",
                  }}
                >
                  <Box
                    sx={{
                      borderRadius: "50%", lineHeight: 0,
                      outline: holding || exploded ? `3px solid ${exploded ? DANGER : HOLDER}` : "none",
                      outlineOffset: 2,
                      animation: holding ? `${ring} 1.2s ease-out infinite` : "none",
                      boxShadow: exploded ? "0 0 22px rgba(255,92,122,.6)" : "none",
                      "@media (prefers-reduced-motion: reduce)": { animation: "none" },
                    }}
                  >
                    <PlayerAvatar nickname={player.nickname} avatarUrl={player.avatarUrl} color={getPlayerColor(room, player.socketId)} size={holding ? 52 : 46} round />
                  </Box>
                  <Typography noWrap sx={{ maxWidth: "100%", fontSize: 13, fontWeight: holding || isMe ? 800 : 700 }}>
                    {player.nickname}
                    {isMe && <Box component="span" sx={{ color: colors.textSecondary, fontWeight: 500 }}> (você)</Box>}
                  </Typography>
                  <UserTags tags={player.tags} sx={{ justifyContent: "center" }} />
                  {out ? (
                    <Typography sx={{ fontSize: 12, color: colors.textSecondary }}>fora</Typography>
                  ) : (
                    <Hearts lives={lives} />
                  )}
                  {showBubble && (
                    <Box
                      sx={{
                        mt: 0.5, px: 1.25, py: 0.4, borderRadius: "10px", bgcolor: "#262a33",
                        border: "1px solid rgba(253,186,116,.45)", fontFamily: monoFont, fontSize: 15, fontWeight: 700,
                        maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}
                    >
                      <Highlighted value={typing!.text} syllable={syllable} />
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>

          {below}

          {myId && myLives === 0 && !explosion && !isCountdown && (
            <Typography sx={{ color: colors.textSecondary, fontSize: 14 }}>
              Você está fora desta rodada. Assista até o fim!
            </Typography>
          )}
        </Box>

        {/* Lance a lance */}
        <Box sx={{ ...cardSx, borderRadius: "20px", p: 2.5, display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Typography component="h2" sx={{ ...labelSx, letterSpacing: "1.5px", fontWeight: 800 }}>
            LANCE A LANCE
          </Typography>
          {log.length === 0 ? (
            <Typography sx={{ fontSize: 14, color: colors.textSecondary }}>
              As palavras e explosões da rodada aparecem aqui.
            </Typography>
          ) : (
            <Box component="ul" sx={{ m: 0, p: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 1.1 }}>
              {log.map((entry) => {
                const name = entry.socketId === myId ? "Você" : getPlayerName(room, entry.socketId);
                const color = getPlayerColor(room, entry.socketId);
                const good = entry.kind === "accepted";
                const status =
                  entry.kind === "accepted" ? "vale"
                  : entry.kind === "rejected" ? SHORT_REASON[entry.reason ?? "unknown"]
                  : entry.kind === "out" ? "fora" : "−1 vida";
                return (
                  <Box component="li" key={entry.key + entry.socketId + entry.kind} sx={{ display: "flex", justifyContent: "space-between", gap: 1, fontSize: 14 }}>
                    <Box component="span" sx={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <b style={{ color }}>{name}</b>{" "}
                      {entry.word ? (
                        <Box
                          component="span"
                          sx={{ fontFamily: monoFont, color: good ? "#fff" : colors.textSecondary, textDecoration: good ? "none" : "line-through" }}
                        >
                          {entry.word}
                        </Box>
                      ) : entry.kind === "out" ? "perdeu a última vida" : "perdeu uma vida"}
                    </Box>
                    <Box component="span" sx={{ flexShrink: 0, fontWeight: 700, color: good ? "#4ade80" : DANGER }}>
                      {status}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
          {feedback?.kind === "rejected" && feedback.socketId === myId && now - feedback.key < 2500 && (
            <Typography sx={{ fontSize: 13, color: DANGER, pt: 1, borderTop: `1px solid ${colors.border}` }}>
              {REJECTION_MESSAGES[feedback.reason]}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}
