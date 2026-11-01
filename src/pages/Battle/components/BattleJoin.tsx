import {
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  InputBase,
  Typography,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";

import { cardSx, colors, labelSx, monoFont, primaryButtonSx } from "../styles";

interface BattleJoinProps {
  code: string;
  nickname: string;
  connected: boolean;
  isJoining: boolean;
  onNicknameChange: (value: string) => void;
  onJoin: () => void;
  onBack: () => void;
}

// Tela de quem recebeu o link ou digitou o código: escolhe o nick e entra.
export function BattleJoin({
  code,
  nickname,
  connected,
  isJoining,
  onNicknameChange,
  onJoin,
  onBack,
}: BattleJoinProps) {
  const isBusy = !connected || isJoining;

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 480,
        mx: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <ButtonBase
        onClick={onBack}
        sx={{
          alignSelf: "flex-start",
          gap: 0.75,
          px: 1,
          py: 0.5,
          ml: -1,
          borderRadius: "8px",
          fontFamily: "inherit",
          fontSize: 14,
          fontWeight: 600,
          color: colors.textSecondary,
          "&:hover": { color: "#ffffff" },
          "&.Mui-focusVisible": {
            outline: `2px solid ${colors.accent}`,
            outlineOffset: 2,
          },
        }}
      >
        <ArrowBackRoundedIcon sx={{ fontSize: 18 }} />
        Voltar
      </ButtonBase>

      <Box
        component="form"
        onSubmit={(event: React.FormEvent) => {
          event.preventDefault();
          onJoin();
        }}
        sx={{
          ...cardSx,
          p: { xs: 2.5, md: 3.5 },
          display: "flex",
          flexDirection: "column",
          gap: 3,
          borderColor: "rgba(103,232,249,0.4)",
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Box
            sx={{
              display: "grid",
              placeItems: "center",
              width: 48,
              height: 48,
              borderRadius: "12px",
              bgcolor: "rgba(0,188,212,0.14)",
              color: colors.cyan,
            }}
          >
            <LoginRoundedIcon />
          </Box>
          <Box>
            <Typography component="h1" sx={{ fontSize: 26, fontWeight: 900 }}>
              Entrar na sala
            </Typography>
            <Typography sx={{ color: colors.textSecondary, fontSize: 15 }}>
              Escolha como você quer aparecer na partida.
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 0.5,
            px: 2,
            py: 1.5,
            borderRadius: "12px",
            bgcolor: colors.background,
          }}
        >
          <Typography sx={{ ...labelSx, letterSpacing: "2px" }}>
            CÓDIGO DA SALA
          </Typography>
          <Typography
            sx={{
              fontFamily: monoFont,
              fontWeight: 700,
              fontSize: { xs: 26, sm: 30 },
              letterSpacing: { xs: 4, sm: 6 },
              wordBreak: "break-all",
            }}
          >
            {code.slice(0, 4)}
            <Box component="span" sx={{ color: colors.cyan }}>
              {code.slice(4)}
            </Box>
          </Typography>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
          <Typography
            component="label"
            htmlFor="battle-join-nickname"
            sx={labelSx}
          >
            SEU NICK
          </Typography>
          <InputBase
            id="battle-join-nickname"
            autoFocus
            value={nickname}
            onChange={(event) => onNicknameChange(event.target.value)}
            placeholder="Como você quer aparecer"
            inputProps={{ maxLength: 16 }}
            sx={{
              height: 52,
              px: 1.75,
              borderRadius: "10px",
              border: `1px solid ${colors.borderStrong}`,
              bgcolor: colors.background,
              color: "#ffffff",
              fontSize: 16,
              fontWeight: 600,
              "&.Mui-focused": { borderColor: colors.accent },
            }}
          />
        </Box>

        <Button
          type="submit"
          variant="contained"
          disabled={isBusy}
          sx={primaryButtonSx}
        >
          {isJoining ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            "Entrar na sala"
          )}
        </Button>

        {!connected && (
          <Typography
            sx={{
              color: colors.textSecondary,
              fontSize: 13,
              textAlign: "center",
            }}
          >
            Conectando ao servidor...
          </Typography>
        )}
      </Box>
    </Box>
  );
}
