import { Box, Paper, Stack, Typography } from "@mui/material";

import type { TypingResult } from "../../../services/api";
import PerformanceEvolution from "../../../components/profile/PerformanceEvolution";
import {
  formatTypingTime,
  getDurationStats,
  getProfileStats,
} from "../profileStats";
import { panelSx } from "../styles";
import { StatCard } from "./StatCard";

const DURATIONS = [
  { label: "15 segundos", seconds: 15 },
  { label: "30 segundos", seconds: 30 },
  { label: "60 segundos", seconds: 60 },
];

interface ProfileOverviewProps {
  results: TypingResult[];
}

// Visão geral, estatísticas, desempenho por duração e gráfico de evolução.
export function ProfileOverview({ results }: ProfileOverviewProps) {
  const stats = getProfileStats(results);

  const durationStats = DURATIONS.map(({ label, seconds }) => ({
    label,
    stats: getDurationStats(results, seconds),
  }));

  return (
    <>
      <Box>
        <Box sx={{ mb: 2.5 }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Visão geral
          </Typography>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(2, minmax(0, 1fr))",
              md: "repeat(4, minmax(0, 1fr))",
            },
            gap: 2,
          }}
        >
          <StatCard
            label="Melhor PPM"
            value={stats.bestPpm}
            description="Seu recorde de velocidade"
            accent="#a78bfa"
          />
          <StatCard
            label="Precisão média"
            value={`${stats.averageAccuracy}%`}
            description="Média entre seus testes"
            accent="#5eead4"
          />
          <StatCard
            label="Testes realizados"
            value={stats.totalTests}
            description="Total de rodadas concluídas"
            accent="#93c5fd"
          />
          <StatCard
            label="Tempo digitando"
            value={formatTypingTime(stats.totalTypingSeconds)}
            description="Tempo acumulado dos testes"
            accent="#f0abfc"
          />
        </Box>
      </Box>

      <Box>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 2.5 }}>
          Estatísticas
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(3, minmax(0, 1fr))",
            },
            gap: 2,
          }}
        >
          <StatCard label="PPM médio" value={stats.averagePpm} accent="#a78bfa" />
          <StatCard
            label="Melhor precisão"
            value={`${stats.bestAccuracy}%`}
            accent="#5eead4"
          />
          <StatCard
            label="Caracteres digitados"
            value={stats.totalCharacters.toLocaleString("pt-BR")}
            accent="#93c5fd"
          />
        </Box>
      </Box>

      <Box>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
          Desempenho por duração
        </Typography>
        <Typography color="text.secondary" variant="body2" sx={{ mb: 2.5 }}>
          Compare seus resultados em cada modalidade.
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(3, minmax(0, 1fr))",
            },
            gap: 2,
          }}
        >
          {durationStats.map(({ label, stats }) => (
            <Paper
              key={label}
              elevation={0}
              sx={{
                ...panelSx,
                p: 2.5,
                transition: "transform 180ms ease",
                "&:hover": { transform: "translateY(-3px)" },
              }}
            >
              <Typography
                variant="overline"
                color="primary.main"
                sx={{ fontWeight: 800, letterSpacing: 1.5 }}
              >
                MODALIDADE
              </Typography>

              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
                {label}
              </Typography>

              <Stack spacing={1.5}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Melhor PPM
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>
                    {stats.tests > 0 ? stats.bestPpm : "—"}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    PPM médio
                  </Typography>
                  <Typography sx={{ fontWeight: 700 }}>
                    {stats.tests > 0 ? stats.averagePpm : "—"}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    pt: 1.5,
                    borderTop: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {stats.tests} {stats.tests === 1 ? "teste" : "testes"}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          ))}
        </Box>
      </Box>

      <Box>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 2.5 }}>
          Evolução de desempenho
        </Typography>
        <PerformanceEvolution results={results} />
      </Box>
    </>
  );
}
