import { useState } from "react";
import { Box } from "@mui/material";

import { colors } from "../styles";

interface PlayerAvatarProps {
  nickname: string;
  avatarUrl?: string | null;
  color: string;
  size?: number;
}

// Foto de perfil de quem está logado; senão, a inicial na cor do jogador.
export function PlayerAvatar({
  nickname,
  avatarUrl,
  color,
  size = 40,
}: PlayerAvatarProps) {
  // Se a imagem não carregar, volta para a inicial.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showPhoto = Boolean(avatarUrl) && avatarUrl !== failedUrl;

  const frameSx = {
    flexShrink: 0,
    width: size,
    height: size,
    borderRadius: "10px",
  };

  if (showPhoto) {
    return (
      <Box
        component="img"
        src={avatarUrl ?? undefined}
        alt=""
        onError={() => setFailedUrl(avatarUrl ?? null)}
        sx={{
          ...frameSx,
          display: "block",
          objectFit: "cover",
          // Borda na cor do jogador, igual às pistas da partida.
          border: `2px solid ${color}`,
          bgcolor: colors.paper,
        }}
      />
    );
  }

  return (
    <Box
      aria-hidden="true"
      sx={{
        ...frameSx,
        display: "grid",
        placeItems: "center",
        bgcolor: color,
        color: colors.background,
        fontWeight: 900,
        fontSize: Math.round(size * 0.42),
      }}
    >
      {nickname.charAt(0).toUpperCase()}
    </Box>
  );
}
