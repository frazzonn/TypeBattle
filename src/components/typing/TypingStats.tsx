import { Box, Paper, Typography } from "@mui/material";
import SpeedRoundedIcon from "@mui/icons-material/SpeedRounded";
import TrackChangesRoundedIcon from "@mui/icons-material/TrackChangesRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import TextFieldsRoundedIcon from "@mui/icons-material/TextFieldsRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";

interface TypingStatsProps {
  ppm: number;
  accuracy: number;
  errors: number;
  characters: number;
  showPpm?: boolean;
  duration?: number;
}

export function TypingStats({
  ppm,
  accuracy,
  errors,
  characters,
  showPpm = true,
  duration,
}: TypingStatsProps) {
  const stats = [
    {
      label: "PPM",
      value: ppm,
      description: "Palavras por minuto",
      icon: <SpeedRoundedIcon />,
      color: "#a78bfa",
      background: "rgba(167, 139, 250, 0.10)",
    },
    {
      label: "Precisão",
      value: `${accuracy}%`,
      description: "Acertos na digitação",
      icon: <TrackChangesRoundedIcon />,
      color: "#6ee7b7",
      background: "rgba(110, 231, 183, 0.10)",
    },
    {
      label: "Erros",
      value: errors,
      description: "Caracteres incorretos",
      icon: <ErrorOutlineRoundedIcon />,
      color: "#fb7185",
      background: "rgba(251, 113, 133, 0.10)",
    },
    {
      label: "Caracteres",
      value: characters,
      description: "Caracteres digitados",
      icon: <TextFieldsRoundedIcon />,
      color: "#7dd3fc",
      background: "rgba(125, 211, 252, 0.10)",
    },
    ...(duration !== undefined
      ? [
          {
            label: "Duração",
            value: `${duration}s`,
            description: "Tempo do teste",
            icon: <AccessTimeRoundedIcon />,
            color: "#c4b5fd",
            background: "rgba(196, 181, 253, 0.10)",
          },
        ]
      : []),
  ];

  // Mantém o PPM opcional e inclui a duração somente quando informada.
  const visibleStats = showPpm
    ? stats
    : stats.filter((stat) => stat.label !== "PPM");

  const columns = showPpm ? 4 : duration !== undefined ? 4 : 3;

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "repeat(2, minmax(0, 1fr))",
          md: `repeat(${columns}, minmax(0, 1fr))`,
        },
        gap: { xs: 1.25, sm: 2 },
        width: "100%",
        minWidth: 0,
      }}
    >
      {visibleStats.map((stat) => (
        <Paper
          key={stat.label}
          elevation={0}
          sx={{
            position: "relative",
            overflow: "hidden",
            minWidth: 0,
            p: { xs: 1.5, sm: 2 },
            borderRadius: 3,
            backgroundColor: "#181b21",
            backgroundImage: "none",
            border: "1px solid #292d36",
            transition: "border-color 180ms ease, transform 180ms ease",
            "&:hover": {
              borderColor: stat.color,
              transform: "translateY(-2px)",
            },
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
              mb: 2,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: "#a0a4ad",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              {stat.label}
            </Typography>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 34,
                height: 34,
                flexShrink: 0,
                borderRadius: 2,
                color: stat.color,
                backgroundColor: stat.background,
                "& .MuiSvgIcon-root": {
                  fontSize: 20,
                },
              }}
            >
              {stat.icon}
            </Box>
          </Box>

          <Typography
            variant="h4"
            sx={{
              color: stat.color,
              fontWeight: 800,
              fontSize: { xs: "1.65rem", sm: "2rem" },
              lineHeight: 1.2,
              fontVariantNumeric: "tabular-nums",
              overflowWrap: "anywhere",
            }}
          >
            {stat.value}
          </Typography>

          <Typography
            variant="caption"
            sx={{
              display: "block",
              mt: 1,
              color: "#777d8b",
              lineHeight: 1.4,
            }}
          >
            {stat.description}
          </Typography>
        </Paper>
      ))}
    </Box>
  );
}
