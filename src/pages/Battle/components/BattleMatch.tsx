import { Box, Typography } from "@mui/material";

import { TypingText } from "../../../components/typing/TypingText";
import {
  formatClock,
  getMaximumRounds,
  getPlayerColor,
} from "../battleUtils";
import { cardSx, colors, labelSx, monoFont } from "../styles";
import type { BattleRoom } from "../types";
import { PlayerAvatar } from "./PlayerAvatar";
import { SeriesScore } from "./SeriesScore";

interface BattleMatchProps {
  room: BattleRoom;
  myId: string | null;
  typedText: string;
  now: number;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onType: (value: string) => void;
}

// Contagem regressiva e corrida: pistas de progresso e o texto da rodada.
export function BattleMatch({
  room,
  myId,
  typedText,
  now,
  inputRef,
  onType,
}: BattleMatchProps) {
  const battle = room.battle;
  if (!battle) return null;

  const isCountdown = room.status === "countdown";
  const isSeries = room.settings.format !== "single";
  const me = room.players.find((player) => player.socketId === myId);

  const countdown = battle.countdownEndsAt
    ? Math.max(0, Math.ceil((battle.countdownEndsAt - now) / 1000))
    : 0;

  const isWordsMode = room.settings.mode === "words";

  const remaining = isCountdown
    ? room.settings.duration * 1000
    : battle.endsAt != null
      ? Math.max(0, battle.endsAt - now)
      : 0;

  // No modo palavras o relógio conta para cima: o tempo de cada um é o placar.
  const elapsed =
    !isCountdown && battle.startedAt != null
      ? Math.max(0, now - battle.startedAt)
      : 0;

  const isRunningOut = !isWordsMode && !isCountdown && remaining <= 5000;

  // Chegou ao fim do texto, mas ainda há letras erradas no caminho.
  const needsFixing =
    isWordsMode &&
    typedText.length >= battle.text.length &&
    typedText !== battle.text;

  const textLength = battle.text.length;

  function handleType(value: string) {
    // No modo palavras não dá para digitar além do texto.
    onType(isWordsMode ? value.slice(0, textLength) : value);
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          <Typography sx={{ color: colors.textSecondary, fontSize: 13 }}>
            Sala{" "}
            <Box component="span" sx={{ fontFamily: monoFont, color: colors.textMuted }}>
              {room.code}
            </Box>
          </Typography>
          <Typography sx={{ fontSize: 20, fontWeight: 800 }}>
            {isSeries ? (
              <>
                Rodada {battle.round}{" "}
                <Box component="span" sx={{ color: colors.textSecondary, fontWeight: 600 }}>
                  de {getMaximumRounds(room.settings.format)}
                </Box>
              </>
            ) : (
              "Partida única"
            )}
          </Typography>
        </Box>

        {isSeries && <SeriesScore room={room} myId={myId} />}

        <Box
          role="timer"
          aria-label={isWordsMode ? "Tempo da rodada" : "Tempo restante"}
          sx={{
            display: "flex",
            alignItems: "baseline",
            gap: 0.75,
            px: 2.25,
            py: 1,
            borderRadius: "12px",
            bgcolor: colors.paper,
            border: `1px solid ${
              isRunningOut ? "rgba(248,113,113,0.6)" : "rgba(167,139,250,0.3)"
            }`,
          }}
        >
          <Typography
            sx={{
              fontFamily: monoFont,
              fontWeight: 700,
              fontSize: 36,
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
              color: isRunningOut ? "#f87171" : "#ffffff",
            }}
          >
            {isWordsMode
              ? formatClock(Math.floor(elapsed / 1000) * 1000)
              : formatClock(remaining)}
          </Typography>
          <Typography sx={{ color: colors.textSecondary, fontSize: 13 }}>
            {isWordsMode
              ? `${room.settings.wordCount} palavras`
              : isCountdown
                ? "de prova"
                : "restantes"}
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          ...cardSx,
          px: { xs: 2, sm: 2.5 },
          py: 2.25,
          display: "flex",
          flexDirection: "column",
          gap: 1.25,
        }}
      >
        {room.players.map((player) => {
          const isMe = player.socketId === myId;
          const color = getPlayerColor(room, player.socketId);
          const progress = Math.min(100, Math.max(0, player.progress ?? 0));

          return (
            <Box
              key={player.socketId}
              title={player.connected === false ? "Reconectando…" : undefined}
              sx={{
                // Conexão caiu: a pista fica apagada até o jogador voltar.
                opacity: player.connected === false ? 0.45 : 1,
                display: "grid",
                gridTemplateColumns: {
                  xs: "84px minmax(0, 1fr) 64px",
                  sm: "140px minmax(0, 1fr) 96px",
                },
                alignItems: "center",
                gap: { xs: 1.25, sm: 2 },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                <PlayerAvatar
                  nickname={player.nickname}
                  avatarUrl={player.avatarUrl}
                  color={color}
                  size={24}
                />
                <Typography
                  noWrap
                  sx={{
                    minWidth: 0,
                    fontSize: 14,
                    fontWeight: isMe ? 800 : 600,
                    color: isMe ? "#ffffff" : colors.textMuted,
                  }}
                >
                  {player.nickname}
                  {isMe && (
                    <Box component="span" sx={{ color: colors.textSecondary, fontWeight: 500 }}>
                      {" "}(você)
                    </Box>
                  )}
                </Typography>
              </Box>

              <Box
                role="progressbar"
                aria-label={`Progresso de ${player.nickname}`}
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                sx={{
                  position: "relative",
                  height: 28,
                  borderRadius: "8px",
                  bgcolor: colors.background,
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: 0,
                    width: `${progress}%`,
                    bgcolor: `${color}33`,
                    borderRight: progress > 0 ? `3px solid ${color}` : "none",
                    transition: "width 200ms ease-out",
                  }}
                />
                <Typography
                  component="span"
                  sx={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontFamily: monoFont,
                    fontSize: 11,
                    fontWeight: 600,
                    color: colors.textSecondary,
                  }}
                >
                  {progress}%
                </Typography>
              </Box>

              <Typography
                sx={{
                  textAlign: "right",
                  fontFamily: monoFont,
                  fontWeight: 700,
                  fontSize: 18,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {player.ppm}{" "}
                <Box
                  component="span"
                  sx={{ fontFamily: "inherit", fontSize: 11, color: colors.textSecondary }}
                >
                  PPM
                </Box>
              </Typography>
            </Box>
          );
        })}
      </Box>

      {isCountdown ? (
        <Box
          sx={{
            ...cardSx,
            position: "relative",
            overflow: "hidden",
            minHeight: 220,
            borderColor: "rgba(167,139,250,0.35)",
          }}
        >
          <Typography
            aria-hidden="true"
            sx={{
              p: { xs: 2.5, sm: 4 },
              fontFamily: monoFont,
              fontSize: { xs: 20, sm: 24 },
              lineHeight: 1.7,
              color: colors.textSecondary,
              filter: "blur(6px)",
              userSelect: "none",
            }}
          >
            {battle.text.slice(0, 220)}
          </Typography>
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              bgcolor: "rgba(15,17,21,0.55)",
            }}
          >
            <Typography sx={{ ...labelSx, letterSpacing: "3px" }}>
              PREPARE-SE PARA DIGITAR
            </Typography>
            <Typography
              aria-live="assertive"
              sx={{
                fontFamily: monoFont,
                fontWeight: 700,
                fontSize: { xs: 72, sm: 96 },
                lineHeight: 1,
                color: colors.accent,
              }}
            >
              {countdown || "VAI!"}
            </Typography>
          </Box>
        </Box>
      ) : (
        <Box>
          <TypingText
            text={battle.text}
            input={typedText}
            isStarted
            onInputChange={handleType}
            inputRef={inputRef}
          />
          {needsFixing && (
            <Typography
              role="status"
              sx={{ mt: 1.5, color: "#fbbf24", fontWeight: 700, fontSize: 15 }}
            >
              Corrija os erros para terminar: apague até a letra errada e digite
              de novo.
            </Typography>
          )}
        </Box>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 1.5,
        }}
      >
        {[
          { label: "PPM", value: me?.ppm ?? 0 },
          { label: "PRECISÃO", value: `${me?.accuracy ?? 100}%` },
          { label: "ERROS", value: me?.errors ?? 0 },
        ].map((stat) => (
          <Box
            key={stat.label}
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 0.5,
              px: 2.25,
              py: 1.75,
              borderRadius: "12px",
              border: `1px solid ${colors.border}`,
            }}
          >
            <Typography sx={labelSx}>{stat.label}</Typography>
            <Typography
              sx={{
                fontFamily: monoFont,
                fontWeight: 700,
                fontSize: { xs: 22, sm: 28 },
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {stat.value}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
