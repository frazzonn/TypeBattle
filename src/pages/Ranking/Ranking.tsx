import { useEffect, useState } from "react";

import {
  Alert,
  Box,
  CircularProgress,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";

import { useAuth } from "../../contexts/AuthContext";
import { getRanking } from "../../services/api";

interface RankingPlayer {
  position: number;
  userId: number;
  name: string;
  ppm: number;
  accuracy: number;
}

interface RankingResponse {
  duration: number;
  ranking: RankingPlayer[];
}

export function Ranking() {
  const { token } = useAuth();

  const [duration, setDuration] = useState<number>(15);

  const [ranking, setRanking] = useState<RankingPlayer[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    const authToken = token;

    async function loadRanking() {
      try {
        setIsLoading(true);
        setError("");

        const response: RankingResponse = await getRanking(authToken, duration);

        setRanking(response.ranking);
      } catch (error) {
        console.error(error);

        setError("Não foi possível carregar o ranking.");
      } finally {
        setIsLoading(false);
      }
    }

    loadRanking();
  }, [token, duration]);

  function handleDurationChange(
    _event: React.MouseEvent<HTMLElement>,
    newDuration: number | null,
  ) {
    if (newDuration !== null) {
      setDuration(newDuration);
    }
  }

  function getDurationLabel() {
    if (duration === 15) {
      return "15 segundos";
    }

    if (duration === 30) {
      return "30 segundos";
    }

    return "1 minuto";
  }

  return (
    <Box
      sx={{
        maxWidth: 900,
        mx: "auto",
        px: 2,
        py: 6,
      }}
    >
      <Stack spacing={4}>
        {/* Cabeçalho */}
        <Box>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              mb: 1,
            }}
          >
            Ranking
          </Typography>

          <Typography color="text.secondary">
            Veja os melhores jogadores do TypeBattle.
          </Typography>
        </Box>

        {/* Seleção de duração */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Duração do teste
            </Typography>

            <ToggleButtonGroup
              value={duration}
              exclusive
              onChange={handleDurationChange}
              fullWidth
            >
              <ToggleButton value={15}>15s</ToggleButton>

              <ToggleButton value={30}>30s</ToggleButton>

              <ToggleButton value={60}>1min</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </Paper>

        {/* Ranking */}
        <Box>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              mb: 2,
            }}
          >
            Melhores jogadores — {getDurationLabel()}
          </Typography>

          {isLoading && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                py: 6,
              }}
            >
              <CircularProgress />
            </Box>
          )}

          {error && <Alert severity="error">{error}</Alert>}

          {!isLoading && !error && ranking.length === 0 && (
            <Paper
              elevation={0}
              sx={{
                p: 4,
                textAlign: "center",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography color="text.secondary">
                Ainda não existem resultados para essa duração.
              </Typography>
            </Paper>
          )}

          {!isLoading && !error && ranking.length > 0 && (
            <Stack spacing={1.5}>
              {ranking.map((player) => (
                <Paper
                  key={player.userId}
                  elevation={0}
                  sx={{
                    p: 2.5,
                    border: "1px solid",
                    borderColor: "divider",
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  {/* Posição */}
                  <Box
                    sx={{
                      width: 50,
                      textAlign: "center",
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                      }}
                    >
                      #{player.position}
                    </Typography>
                  </Box>

                  {/* Nome */}
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                      }}
                    >
                      {player.name}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                      Precisão: {player.accuracy}%
                    </Typography>
                  </Box>

                  {/* PPM */}
                  <Box
                    sx={{
                      textAlign: "right",
                    }}
                  >
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 700,
                        color: "primary.main",
                      }}
                    >
                      {player.ppm}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                      PPM
                    </Typography>
                  </Box>
                </Paper>
              ))}
            </Stack>
          )}
        </Box>
      </Stack>
    </Box>
  );
}
