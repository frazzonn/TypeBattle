import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Box, CircularProgress, Link, Paper, Typography } from "@mui/material";

import { getUserRecords, type UserRecords } from "../../../services/api";
import { panelSx } from "../styles";
import { StatCard } from "./StatCard";

interface RecordsCardProps {
  userId: number;
  token?: string | null;
  // Perfil de outra pessoa: textos em terceira pessoa.
  isOther?: boolean;
}

function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1).replace(".", ",")} s`;
}

function playedLabel(played: number): string {
  return played === 1 ? "1 partida" : `${played} partidas`;
}

function SectionTitle({ title, to }: { title: string; to: string }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 2, mb: 1.5 }}>
      <Typography variant="h6" sx={{ fontWeight: 800 }}>
        {title}
      </Typography>
      <Link component={RouterLink} to={to} underline="hover" sx={{ fontSize: 14, fontWeight: 600, color: "#a78bfa" }}>
        Ver ranking
      </Link>
    </Box>
  );
}

// Recordes do Arcade e do modo palavras (os do modo tempo ficam no resumo).
export function RecordsCard({ userId, token, isOther = false }: RecordsCardProps) {
  const [records, setRecords] = useState<UserRecords | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    getUserRecords(userId, token)
      .then((data) => active && setRecords(data))
      .catch((error: unknown) => {
        console.error(error);
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [userId, token]);

  if (failed) return null;

  if (!records) {
    return (
      <Paper elevation={0} sx={{ ...panelSx, py: 4, textAlign: "center" }}>
        <CircularProgress size={26} color="secondary" />
      </Paper>
    );
  }

  const { pavio, orbita, chase } = records.arcade;
  const empty = isOther ? "Ainda não jogou" : "Você ainda não jogou";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Box>
        <SectionTitle title="Arcade" to="/ranking?tipo=pavio" />
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" }, gap: 2 }}>
          <StatCard
            label="Pavio · mais palavras"
            value={pavio.best ? pavio.best.score : "—"}
            description={
              pavio.best
                ? `${playedLabel(pavio.played)}${pavio.best.details.longest ? ` · mais longa: ${pavio.best.details.longest}` : ""}`
                : empty
            }
            accent="#fdba74"
          />
          <StatCard
            label="Órbita · mais pontos"
            value={orbita.best ? orbita.best.score.toLocaleString("pt-BR") : "—"}
            description={
              orbita.best
                ? `${playedLabel(orbita.played)} · onda ${orbita.best.details.wave ?? "?"}`
                : empty
            }
            accent="#a78bfa"
          />
          <StatCard
            label="Perseguição · aguentou"
            value={chase.best ? formatSeconds(chase.best.score) : "—"}
            description={
              chase.best ? `${playedLabel(chase.played)} · ${chase.best.details.ppm ?? 0} PPM` : empty
            }
            accent="#ff5c7a"
          />
        </Box>
      </Box>

      <Box>
        <SectionTitle title="Modo palavras" to="/ranking?tipo=words" />
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" }, gap: 2 }}>
          {records.words.map((entry) => (
            <StatCard
              key={entry.wordCount}
              label={`${entry.wordCount} palavras`}
              value={entry.best ? `${entry.best.ppm} PPM` : "—"}
              description={
                entry.best
                  ? `${entry.best.durationMs ? formatSeconds(entry.best.durationMs) : `${entry.best.accuracy}%`} · ${playedLabel(entry.played)}`
                  : empty
              }
              accent="#67e8f9"
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
}
