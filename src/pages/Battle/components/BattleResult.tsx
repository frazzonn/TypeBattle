import { Box, Button, Typography } from "@mui/material";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";

import {
  formatSeconds,
  getMaximumRounds,
  getPlayerColor,
  getPlayerName,
  rankPlayers,
} from "../battleUtils";
import { cardSx, colors, ghostButtonSx, labelSx, monoFont } from "../styles";
import type { BattleRoom } from "../types";
import { PlayerAvatar } from "./PlayerAvatar";

// Tempo que o servidor espera antes da próxima rodada / de voltar ao lobby.
const NEXT_ROUND_DELAY = 2500;
const BACK_TO_LOBBY_DELAY = 6000;

interface BattleResultProps {
  room: BattleRoom;
  myId: string | null;
  finishedAt: number | null;
  now: number;
  onLeave: () => void;
  onCopyInvite: () => void;
}

const cellSx = {
  py: 2,
  px: 1,
  fontFamily: monoFont,
  textAlign: "right" as const,
  color: colors.textMuted,
};

// Resultado da rodada (e da série, quando ela termina).
export function BattleResult({
  room,
  myId,
  finishedAt,
  now,
  onLeave,
  onCopyInvite,
}: BattleResultProps) {
  const battle = room.battle;
  if (!battle) return null;

  const isSeries = room.settings.format !== "single";
  const seriesFinished = Boolean(room.seriesFinished);
  const roundWinner = battle.winnerSocketId;
  const seriesWinner = room.seriesWinnerSocketId ?? null;
  const ranking = rankPlayers(room.players);
  const isWordsMode = room.settings.mode === "words";
  const isChase = room.settings.mode === "chase";
  const showTime = isWordsMode || isChase;
  const winnerFinishMs = room.players.find(
    (player) => player.socketId === roundWinner,
  )?.finishMs;
  const headers = showTime
    ? ["#", "JOGADOR", isChase ? "AGUENTOU" : "TEMPO", "PPM", "PRECISÃO", "ERROS"]
    : ["#", "JOGADOR", "PPM", "PRECISÃO", "ERROS"];

  let title: string;
  if (seriesFinished && isSeries) {
    title = seriesWinner
      ? `${getPlayerName(room, seriesWinner)} venceu a série!`
      : "A série terminou empatada";
  } else {
    title = roundWinner
      ? `${getPlayerName(room, roundWinner)} venceu${isSeries ? " a rodada" : "!"}`
      : isSeries
        ? "Rodada empatada"
        : "Empate!";
  }

  const delay = seriesFinished ? BACK_TO_LOBBY_DELAY : NEXT_ROUND_DELAY;
  const elapsed = finishedAt ? Math.max(0, now - finishedAt) : 0;
  const secondsLeft = Math.max(0, Math.ceil((delay - elapsed) / 1000));
  const timeProgress = Math.min(100, (elapsed / delay) * 100);

  return (
    <Box
      sx={{
        maxWidth: 900,
        mx: "auto",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 2.5,
      }}
    >
      <Box
        sx={{
          ...cardSx,
          px: 3,
          py: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 1.5,
          textAlign: "center",
          borderColor: roundWinner || seriesWinner
            ? "rgba(250,204,21,0.30)"
            : "rgba(167,139,250,0.30)",
        }}
      >
        <Box
          sx={{
            display: "grid",
            placeItems: "center",
            width: 56,
            height: 56,
            borderRadius: "16px",
            bgcolor: "rgba(250,204,21,0.12)",
            color: colors.gold,
          }}
        >
          <EmojiEventsOutlinedIcon sx={{ fontSize: 30 }} />
        </Box>
        {isSeries && (
          <Typography sx={{ ...labelSx, letterSpacing: "2px", fontWeight: 800 }}>
            {seriesFinished
              ? `FIM DA SÉRIE · ${battle.round} RODADAS`
              : `RODADA ${battle.round} DE ${getMaximumRounds(room.settings.format)}`}
          </Typography>
        )}
        <Typography
          component="h1"
          sx={{ fontSize: { xs: 28, sm: 36 }, fontWeight: 900, letterSpacing: "-0.03em" }}
        >
          {title}
        </Typography>
        {isChase && (
          <Typography sx={{ color: colors.textSecondary, fontSize: 15 }}>
            {roundWinner
              ? "Foi o último que o perseguidor não alcançou."
              : "O perseguidor alcançou todos ao mesmo tempo."}
          </Typography>
        )}
        {isWordsMode && (
          <Typography sx={{ color: colors.textSecondary, fontSize: 15 }}>
            {winnerFinishMs != null
              ? `Terminou as ${room.settings.wordCount} palavras em ${formatSeconds(winnerFinishMs)}`
              : "Ninguém terminou a tempo: vale quem foi mais longe."}
          </Typography>
        )}
        {isSeries && (
          <Typography sx={{ color: colors.textSecondary, fontSize: 15 }}>
            Placar da série:{" "}
            <Box component="strong" sx={{ color: "#ffffff" }}>
              {room.players
                .map((player) => `${player.nickname} ${room.seriesWins?.[player.socketId] ?? 0}`)
                .join(" · ")}
            </Box>
          </Typography>
        )}
      </Box>

      <Box sx={{ ...cardSx, overflowX: "auto" }}>
        <Box
          component="table"
          sx={{ width: "100%", borderCollapse: "collapse", fontSize: 15 }}
        >
          <Box component="thead">
            <Box component="tr" sx={{ textAlign: "left" }}>
              {headers.map((header, index) => (
                <Box
                  component="th"
                  key={header}
                  scope="col"
                  sx={{
                    ...labelSx,
                    py: 1.75,
                    px: index === 0 ? 2.5 : 1,
                    pr: index === headers.length - 1 ? 2.5 : 1,
                    textAlign: index >= 2 ? "right" : "left",
                  }}
                >
                  {header}
                </Box>
              ))}
            </Box>
          </Box>
          <Box component="tbody">
            {ranking.map((player, index) => {
              const isWinner = player.socketId === roundWinner;
              const isMe = player.socketId === myId;

              return (
                <Box
                  component="tr"
                  key={player.socketId}
                  sx={{
                    borderTop: `1px solid ${colors.border}`,
                    bgcolor: isWinner ? "rgba(250,204,21,0.06)" : "transparent",
                  }}
                >
                  <Box
                    component="td"
                    sx={{
                      ...cellSx,
                      px: 2.5,
                      textAlign: "left",
                      fontWeight: 700,
                      color: isWinner ? colors.gold : colors.textMuted,
                    }}
                  >
                    {index + 1}
                  </Box>
                  <Box component="td" sx={{ py: 2, px: 1 }}>
                    <Box
                      sx={{ display: "inline-flex", alignItems: "center", gap: 1.25, fontWeight: 700 }}
                    >
                      <PlayerAvatar
                        nickname={player.nickname}
                        avatarUrl={player.avatarUrl}
                        color={getPlayerColor(room, player.socketId)}
                        size={30}
                      />
                      {player.nickname}
                      {isMe && (
                        <Box component="span" sx={{ color: colors.textSecondary, fontWeight: 500 }}>
                          (você)
                        </Box>
                      )}
                    </Box>
                  </Box>
                  {/* Modo palavras: tempo de quem terminou; progresso dos demais. */}
                  {showTime && (
                    <Box component="td" sx={cellSx}>
                      {isChase
                        ? player.caughtMs != null
                          ? formatSeconds(player.caughtMs)
                          : "não foi alcançado"
                        : player.finishMs != null
                          ? formatSeconds(player.finishMs)
                          : `${player.progress}%`}
                    </Box>
                  )}
                  <Box
                    component="td"
                    sx={{ ...cellSx, color: "#ffffff", fontWeight: 700, fontSize: 18 }}
                  >
                    {player.ppm}
                  </Box>
                  <Box component="td" sx={cellSx}>
                    {player.accuracy}%
                  </Box>
                  <Box component="td" sx={{ ...cellSx, pr: 2.5 }}>
                    {player.errors}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>

      <Box sx={{ ...cardSx, px: 2.5, py: 2.25, display: "flex", flexDirection: "column", gap: 1.25 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, fontSize: 14 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
            {seriesFinished ? "Voltando ao lobby em " : "Próxima rodada em "}
            <Box component="span" sx={{ fontFamily: monoFont, color: colors.accent }}>
              {secondsLeft}s
            </Box>
          </Typography>
          {!seriesFinished && isSeries && (
            <Typography sx={{ fontSize: 14, color: colors.textSecondary }}>
              Rodada {battle.round + 1}
            </Typography>
          )}
        </Box>
        <Box sx={{ height: 6, borderRadius: "3px", bgcolor: colors.background, overflow: "hidden" }}>
          <Box
            sx={{
              width: `${timeProgress}%`,
              height: "100%",
              bgcolor: colors.accent,
              transition: "width 100ms linear",
            }}
          />
        </Box>
      </Box>

      <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 1.25 }}>
        <Button
          variant="outlined"
          startIcon={<LinkRoundedIcon />}
          onClick={onCopyInvite}
          sx={{
            ...ghostButtonSx,
            fontWeight: 700,
            color: colors.accentSoft,
            borderColor: "rgba(167,139,250,0.45)",
          }}
        >
          Copiar convite
        </Button>
        <Button variant="outlined" onClick={onLeave} sx={ghostButtonSx}>
          Sair da sala
        </Button>
      </Box>
    </Box>
  );
}
