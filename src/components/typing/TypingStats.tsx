import { Box, Paper, Typography } from "@mui/material";

interface TypingStatsProps {
  ppm: number;
  accuracy: number;
  errors: number;
  characters: number;
}

export function TypingStats({
  ppm,
  accuracy,
  errors,
  characters,
}: TypingStatsProps) {
  const stats = [
    {
      label: "PPM",
      value: ppm,
    },
    {
      label: "Precisão",
      value: `${accuracy}%`,
    },
    {
      label: "Erros",
      value: errors,
    },
    {
      label: "Caracteres",
      value: characters,
    },
  ];

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "repeat(2, 1fr)",
          md: "repeat(4, 1fr)",
        },
        gap: 2,
      }}
    >
      {stats.map((stat) => (
        <Paper
          key={stat.label}
          sx={{
            p: 2,
            textAlign: "center",
          }}
        >
          <Typography color="text.secondary">{stat.label}</Typography>

          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {stat.value}
          </Typography>
        </Paper>
      ))}
    </Box>
  );
}
