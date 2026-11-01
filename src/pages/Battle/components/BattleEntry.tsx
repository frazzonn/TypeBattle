import { useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  InputBase,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";

import { getFormatLabel } from "../battleUtils";
import { cardSx, colors, labelSx, monoFont, primaryButtonSx } from "../styles";
import { DEFAULT_SETTINGS } from "../types";

interface BattleEntryProps {
  nickname: string;
  inviteCode: string;
  connected: boolean;
  isCreating: boolean;
  isJoining: boolean;
  onNicknameChange: (value: string) => void;
  onCreate: () => void;
  onJoin: (code: string) => void;
}

const inputSx = {
  height: 48,
  px: 1.75,
  borderRadius: "10px",
  border: `1px solid ${colors.borderStrong}`,
  bgcolor: colors.background,
  color: "#ffffff",
  fontSize: 16,
  fontWeight: 600,
  "&.Mui-focused": { borderColor: colors.accent },
};

const STEPS = [
  {
    title: "Crie a sala",
    text: "e ajuste dificuldade, tempo e formato.",
  },
  {
    title: "Mande o link",
    text: "pros amigos. Não precisa de conta.",
  },
  {
    title: "Corram no mesmo texto",
    text: "e vejam o progresso ao vivo.",
  },
];

function CardIcon({ color, bg, children }: {
  color: string;
  bg: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
        width: 48,
        height: 48,
        borderRadius: "12px",
        bgcolor: bg,
        color,
      }}
    >
      {children}
    </Box>
  );
}

// Tela inicial: criar uma sala ou entrar com o código recebido.
export function BattleEntry({
  nickname,
  inviteCode,
  connected,
  isCreating,
  isJoining,
  onNicknameChange,
  onCreate,
  onJoin,
}: BattleEntryProps) {
  const [code, setCode] = useState(inviteCode);
  const isBusy = !connected || isCreating || isJoining;

  const defaultsSummary = [
    `${DEFAULT_SETTINGS.duration} s`,
    `${DEFAULT_SETTINGS.playerLimit} jogadores`,
    getFormatLabel(DEFAULT_SETTINGS.format),
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Typography
            component="h1"
            sx={{
              fontSize: { xs: 36, md: 48 },
              fontWeight: 900,
              letterSpacing: "-0.04em",
              lineHeight: 1,
            }}
          >
            Multiplayer
          </Typography>
          <Typography sx={{ color: colors.textSecondary, fontSize: 16 }}>
            Até 4 jogadores, mesmo texto, quem digitar mais rápido vence.
          </Typography>
        </Box>

        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 1,
            px: 1.5,
            py: 0.75,
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 700,
            color: connected ? "#86efac" : colors.accentSoft,
            bgcolor: connected
              ? "rgba(34,197,94,0.10)"
              : "rgba(124,77,255,0.12)",
            border: `1px solid ${
              connected ? "rgba(34,197,94,0.28)" : "rgba(167,139,250,0.28)"
            }`,
          }}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              bgcolor: connected ? "#22c55e" : colors.accent,
            }}
          />
          {connected ? "Servidor conectado" : "Conectando ao servidor..."}
        </Box>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
          gap: 2.5,
        }}
      >
        <Box
          component="form"
          onSubmit={(event: React.FormEvent) => {
            event.preventDefault();
            onCreate();
          }}
          sx={{
            ...cardSx,
            p: { xs: 2.5, md: 3.5 },
            display: "flex",
            flexDirection: "column",
            gap: 2.5,
            borderColor: "rgba(167,139,250,0.30)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.75 }}>
            <CardIcon color="#c4b5fd" bg="rgba(124,77,255,0.16)">
              <AddRoundedIcon />
            </CardIcon>
            <Box>
              <Typography component="h2" sx={{ fontSize: 20, fontWeight: 800 }}>
                Criar sala
              </Typography>
              <Typography sx={{ color: colors.textSecondary, fontSize: 14 }}>
                Você escolhe as regras e manda o link.
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
            <Typography component="label" htmlFor="battle-nickname" sx={labelSx}>
              SEU NICK
            </Typography>
            <InputBase
              id="battle-nickname"
              value={nickname}
              onChange={(event) => onNicknameChange(event.target.value)}
              placeholder="Como você quer aparecer"
              inputProps={{ maxLength: 16 }}
              sx={inputSx}
            />
          </Box>

          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
            {defaultsSummary.map((item) => (
              <Box
                key={item}
                component="span"
                sx={{
                  px: 1.25,
                  py: 0.75,
                  borderRadius: "8px",
                  bgcolor: "rgba(255,255,255,0.05)",
                  color: colors.textMuted,
                  fontSize: 13,
                }}
              >
                {item}
              </Box>
            ))}
            <Typography
              component="span"
              sx={{ color: colors.textSecondary, fontSize: 13, px: 0.5 }}
            >
              dá pra mudar no lobby
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          <Button
            type="submit"
            variant="contained"
            disabled={isBusy}
            sx={primaryButtonSx}
          >
            {isCreating ? <CircularProgress size={24} color="inherit" /> : "Criar sala"}
          </Button>
        </Box>

        <Box
          component="form"
          onSubmit={(event: React.FormEvent) => {
            event.preventDefault();
            onJoin(code);
          }}
          sx={{
            ...cardSx,
            p: { xs: 2.5, md: 3.5 },
            display: "flex",
            flexDirection: "column",
            gap: 2.5,
            borderColor: inviteCode
              ? "rgba(103,232,249,0.55)"
              : "rgba(0,188,212,0.28)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.75 }}>
            <CardIcon color={colors.cyan} bg="rgba(0,188,212,0.14)">
              <LoginRoundedIcon />
            </CardIcon>
            <Box>
              <Typography component="h2" sx={{ fontSize: 20, fontWeight: 800 }}>
                Entrar numa sala
              </Typography>
              <Typography sx={{ color: colors.textSecondary, fontSize: 14 }}>
                {inviteCode
                  ? "Você recebeu um convite. É só entrar."
                  : "Cole o código ou o link do convite."}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
            <Typography component="label" htmlFor="battle-room-code" sx={labelSx}>
              CÓDIGO DA SALA
            </Typography>
            <InputBase
              id="battle-room-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="A1B2C3D4"
              inputProps={{ maxLength: 300, autoCapitalize: "characters" }}
              sx={{
                ...inputSx,
                height: 56,
                fontFamily: monoFont,
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: 4,
                "& input": { textTransform: "uppercase" },
              }}
            />
          </Box>

          <Typography sx={{ color: colors.textSecondary, fontSize: 13 }}>
            Você entra com o nick do card ao lado.
          </Typography>

          <Box sx={{ flexGrow: 1 }} />

          <Button
            type="submit"
            variant="outlined"
            disabled={isBusy}
            sx={{
              height: 52,
              borderRadius: "10px",
              fontWeight: 800,
              fontSize: 16,
              textTransform: "none",
              color: colors.cyan,
              borderColor: "rgba(0,188,212,0.55)",
              "&:hover": {
                borderColor: colors.cyan,
                bgcolor: "rgba(0,188,212,0.08)",
              },
            }}
          >
            {isJoining ? <CircularProgress size={24} color="inherit" /> : "Entrar"}
          </Button>
        </Box>
      </Box>

      <Box
        component="ol"
        sx={{
          m: 0,
          p: 0,
          listStyle: "none",
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
          gap: 1.5,
        }}
      >
        {STEPS.map((step, index) => (
          <Box
            component="li"
            key={step.title}
            sx={{
              display: "flex",
              gap: 1.5,
              alignItems: "flex-start",
              p: 2,
              borderRadius: "12px",
              border: `1px solid ${colors.border}`,
            }}
          >
            <Typography
              component="span"
              sx={{ fontFamily: monoFont, fontWeight: 700, color: colors.accent }}
            >
              {String(index + 1).padStart(2, "0")}
            </Typography>
            <Typography sx={{ color: colors.textSecondary, fontSize: 14, lineHeight: 1.5 }}>
              <Box component="strong" sx={{ color: "#ffffff" }}>
                {step.title}
              </Box>{" "}
              {step.text}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
