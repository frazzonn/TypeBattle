import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Box, Button, Paper, Skeleton, Typography } from "@mui/material";
import SportsEsportsRoundedIcon from "@mui/icons-material/SportsEsportsRounded";

import {
  getBattleResults,
  type BattleResultsResponse,
} from "../../../services/api";
import { LANGUAGE_OPTIONS } from "../../../utils/textGenerator";
import { panelSx } from "../styles";
import { StatCard } from "./StatCard";

interface BattleStatsProps {
  token: string;
}

const RECENT_SHOWN = 8;

function getLanguageLabel(code: string) {
  return LANGUAGE_OPTIONS.find((option) => option.code === code)?.label ?? code;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

// Resumo das partidas multiplayer jogadas logado e as mais recentes.
export function BattleStats({ token }: BattleStatsProps) {
  const [data, setData] = useState<BattleResultsResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    getBattleResults(token)
      .then((response) => {
        if (active) setData(response);
      })
      .catch((loadError: unknown) => {
        console.error(loadError);
        if (active) setError(true);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const summary = data?.summary;

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 2.5 }}>
        Battle
      </Typography>

      {error && (
        <Paper elevation={0} sx={{ ...panelSx, p: 3 }}>
          <Typography color="text.secondary">
            Não foi possível carregar suas partidas.
          </Typography>
        </Paper>
      )}

      {!error && !data && (
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
          {[0, 1, 2, 3].map((item) => (
            <Skeleton
              key={item}
              variant="rounded"
              height={128}
              sx={{ borderRadius: 3 }}
            />
          ))}
        </Box>
      )}

      {summary && summary.played === 0 && (
        <Paper
          elevation={0}
          sx={{
            ...panelSx,
            p: { xs: 3, sm: 4 },
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "flex-start", sm: "center" },
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Box>
            <Typography sx={{ fontWeight: 700, mb: 0.5 }}>
              Nenhuma partida ainda
            </Typography>
            <Typography color="text.secondary" variant="body2">
              Jogue uma battle logado e suas vitórias aparecem aqui.
            </Typography>
          </Box>
          <Button
            component={RouterLink}
            to="/battle"
            variant="contained"
            startIcon={<SportsEsportsRoundedIcon />}
            sx={{ fontWeight: 700, textTransform: "none", flexShrink: 0 }}
          >
            Jogar battle
          </Button>
        </Paper>
      )}

      {summary && summary.played > 0 && data && (
        <>
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
              label="Rodadas jogadas"
              value={summary.played}
              description="Cada rodada da battle conta"
              accent="#93c5fd"
            />
            <StatCard
              label="Vitórias"
              value={summary.wins}
              description={`${summary.losses} sem vitória`}
              accent="#fde047"
            />
            <StatCard
              label="Taxa de vitória"
              value={`${summary.winRate}%`}
              description="Rodadas que você venceu"
              accent="#86efac"
            />
            <StatCard
              label="Melhor PPM na battle"
              value={summary.bestPpm}
              description={`Média de ${summary.averagePpm} PPM`}
              accent="#a78bfa"
            />
          </Box>

          <Paper elevation={0} sx={{ ...panelSx, mt: 2, overflow: "hidden" }}>
            <Typography
              sx={{ fontWeight: 700, px: { xs: 2, sm: 3 }, pt: 2.5, pb: 1 }}
            >
              Últimas rodadas
            </Typography>

            <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
              {data.recent.slice(0, RECENT_SHOWN).map((result) => (
                <Box
                  component="li"
                  key={result.id}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "88px 1fr auto",
                      sm: "120px 1fr 1fr auto",
                    },
                    alignItems: "center",
                    gap: 2,
                    px: { xs: 2, sm: 3 },
                    py: 1.5,
                    borderTop: "1px solid rgba(155, 109, 255, 0.1)",
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: 800,
                      fontSize: 14,
                      color: result.won ? "#fde047" : "text.secondary",
                    }}
                  >
                    {result.won
                      ? "Vitória"
                      : `${result.placement}º de ${result.players}`}
                  </Typography>
                  <Typography sx={{ fontWeight: 700 }}>
                    {result.ppm} PPM
                    <Typography
                      component="span"
                      color="text.secondary"
                      sx={{ fontWeight: 500, fontSize: 14 }}
                    >
                      {" "}
                      · {result.accuracy}%
                    </Typography>
                  </Typography>
                  <Typography
                    color="text.secondary"
                    sx={{ fontSize: 14, display: { xs: "none", sm: "block" } }}
                  >
                    {getLanguageLabel(result.language)} · {result.duration}s
                  </Typography>
                  <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                    {formatDate(result.createdAt)}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </>
      )}
    </Box>
  );
}
