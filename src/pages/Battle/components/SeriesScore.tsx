import { Box } from "@mui/material";

import { getPlayerColor } from "../battleUtils";
import { colors } from "../styles";
import type { BattleRoom } from "../types";

interface SeriesScoreProps {
  room: BattleRoom;
  myId: string | null;
}

// Vitórias de cada jogador na série (melhor de 3 ou 5).
export function SeriesScore({ room, myId }: SeriesScoreProps) {
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
      {room.players.map((player) => (
        <Box
          key={player.socketId}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 1,
            px: 1.5,
            py: 0.75,
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 700,
            bgcolor:
              player.socketId === myId
                ? "rgba(167,139,250,0.14)"
                : "rgba(255,255,255,0.05)",
            color: colors.textMuted,
          }}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              bgcolor: getPlayerColor(room, player.socketId),
            }}
          />
          {player.nickname} {room.seriesWins?.[player.socketId] ?? 0}
        </Box>
      ))}
    </Box>
  );
}
