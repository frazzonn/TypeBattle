import { useEffect, useState } from "react";

import {
  Alert,
  Avatar,
  Box,
  CircularProgress,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";

import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import MilitaryTechRoundedIcon from "@mui/icons-material/MilitaryTechRounded";
import SpeedRoundedIcon from "@mui/icons-material/SpeedRounded";
import TrackChangesRoundedIcon from "@mui/icons-material/TrackChangesRounded";

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

const PURPLE = "#a78bfa";
const PANEL_BACKGROUND = "#171923";
const BORDER_COLOR = "rgba(167, 139, 250, 0.16)";

export function Ranking() {
  const [duration, setDuration] = useState<number>(15);
  const [ranking, setRanking] = useState<RankingPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // O ranking é público e não depende de autenticação.
  useEffect(() => {
    let isActive = true;

    async function loadRanking() {
      try {
        setIsLoading(true);
        setError("");

        const response: RankingResponse = await getRanking(duration);

        if (isActive) {
          setRanking(response.ranking);
        }
      } catch (error) {
        console.error(error);

        if (isActive) {
          setError("Não foi possível carregar o ranking. Tente novamente.");
          setRanking([]);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadRanking();

    return () => {
      isActive = false;
    };
  }, [duration]);

  function handleDurationChange(
    _event: React.MouseEvent<HTMLElement>,
    newDuration: number | null,
  ) {
    if (newDuration !== null) {
      setDuration(newDuration);
    }
  }

  function getDurationLabel() {
    if (duration === 15) return "15 segundos";
    if (duration === 30) return "30 segundos";
    return "60 segundos";
  }

  function getInitials(name: string) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
  }

  const topThree = ranking
    .filter((player) => player.position >= 1 && player.position <= 3)
    .sort((a, b) => a.position - b.position);

  const remainingPlayers = ranking.filter((player) => player.position > 3);

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 1000,
        mx: "auto",
        px: { xs: 2, sm: 3 },
        py: { xs: 4, md: 6 },
        boxSizing: "border-box",
      }}
    >
      <Stack spacing={{ xs: 3, md: 4 }}>
        {/* Cabeçalho */}
        <Box>
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 1.5,
              mb: 1.5,
            }}
          >
            <Box
              sx={{
                width: 46,
                height: 46,
                display: "grid",
                placeItems: "center",
                borderRadius: 3,
                color: PURPLE,
                backgroundColor: "rgba(167, 139, 250, 0.12)",
                border: `1px solid ${BORDER_COLOR}`,
              }}
            >
              <EmojiEventsRoundedIcon sx={{ fontSize: 27 }} />
            </Box>

            <Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 800,
                  letterSpacing: "-0.8px",
                  color: "#f5f3ff",
                }}
              >
                Ranking
              </Typography>

              <Typography variant="body2" sx={{ color: "#969bad", mt: 0.25 }}>
                Os jogadores mais rápidos do TypeBattle.
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              height: 2,
              width: 72,
              borderRadius: 2,
              background: `linear-gradient(90deg, ${PURPLE}, transparent)`,
              mt: 2,
            }}
          />
        </Box>

        {/* Filtro de duração */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 2.5 },
            borderRadius: 3,
            backgroundColor: PANEL_BACKGROUND,
            border: `1px solid ${BORDER_COLOR}`,
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 2,
              alignItems: { xs: "stretch", sm: "center" },
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Typography sx={{ fontWeight: 700, color: "#f5f3ff", mb: 0.5 }}>
                Duração do teste
              </Typography>

              <Typography variant="body2" sx={{ color: "#969bad" }}>
                Compare os resultados de cada modalidade.
              </Typography>
            </Box>

            <ToggleButtonGroup
              value={duration}
              exclusive
              onChange={handleDurationChange}
              aria-label="Duração do teste"
              sx={{
                "& .MuiToggleButton-root": {
                  px: { xs: 1.5, sm: 2.5 },
                  py: 1,
                  color: "#b7bac8",
                  borderColor: "rgba(255,255,255,0.1)",
                  fontWeight: 700,
                  textTransform: "none",
                  "&:hover": {
                    backgroundColor: "rgba(167, 139, 250, 0.08)",
                  },
                  "&.Mui-selected": {
                    color: "#eee7ff",
                    backgroundColor: "rgba(124, 77, 255, 0.2)",
                    borderColor: "rgba(167, 139, 250, 0.5)",
                  },
                  "&.Mui-selected:hover": {
                    backgroundColor: "rgba(124, 77, 255, 0.28)",
                  },
                },
              }}
            >
              <ToggleButton value={15}>15s</ToggleButton>
              <ToggleButton value={30}>30s</ToggleButton>
              <ToggleButton value={60}>60s</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Paper>

        {/* Título da classificação */}
        <Box>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              color: "#f5f3ff",
              letterSpacing: "-0.4px",
            }}
          >
            Melhores jogadores
          </Typography>

          <Typography variant="body2" sx={{ color: "#969bad", mt: 0.5 }}>
            Resultados para testes de {getDurationLabel()}.
          </Typography>
        </Box>

        {/* Carregamento */}
        {isLoading && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              py: 8,
              gap: 2,
            }}
          >
            <CircularProgress size={34} sx={{ color: PURPLE }} />

            <Typography variant="body2" sx={{ color: "#969bad" }}>
              Carregando classificação...
            </Typography>
          </Box>
        )}

        {/* Erro */}
        {!isLoading && error && (
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {/* Ranking vazio */}
        {!isLoading && !error && ranking.length === 0 && (
          <Paper
            elevation={0}
            sx={{
              p: { xs: 4, sm: 6 },
              textAlign: "center",
              borderRadius: 3,
              backgroundColor: PANEL_BACKGROUND,
              border: `1px solid ${BORDER_COLOR}`,
            }}
          >
            <EmojiEventsRoundedIcon
              sx={{ fontSize: 48, color: "#686b7b", mb: 1.5 }}
            />

            <Typography
              variant="h6"
              sx={{ fontWeight: 700, color: "#f5f3ff", mb: 1 }}
            >
              Ainda não há resultados
            </Typography>

            <Typography variant="body2" sx={{ color: "#969bad" }}>
              Complete um teste de {getDurationLabel()} para começar a
              classificação.
            </Typography>
          </Paper>
        )}

        {/* Pódio */}
        {!isLoading && !error && topThree.length > 0 && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(3, minmax(0, 1fr))",
              },
              gap: 2,
              alignItems: "stretch",
            }}
          >
            {topThree.map((player) => {
              const isFirst = player.position === 1;
              const isSecond = player.position === 2;

              const medalColor = isFirst
                ? "#f5c451"
                : isSecond
                  ? "#c5cbd8"
                  : "#d99a68";

              return (
                <Paper
                  key={player.userId}
                  elevation={0}
                  sx={{
                    order: {
                      xs: player.position,
                      sm: isFirst ? 0 : isSecond ? -1 : 1,
                    },
                    position: "relative",
                    overflow: "hidden",
                    p: { xs: 2.5, sm: 2 },
                    borderRadius: 3,
                    textAlign: "center",
                    background: isFirst
                      ? "linear-gradient(155deg, rgba(124,77,255,0.2), #171923 70%)"
                      : PANEL_BACKGROUND,
                    border: `1px solid ${
                      isFirst ? "rgba(167,139,250,0.45)" : BORDER_COLOR
                    }`,
                    transition: "transform 160ms ease, border-color 160ms ease",
                    "&:hover": {
                      transform: "translateY(-3px)",
                      borderColor: "rgba(167,139,250,0.55)",
                    },
                  }}
                >
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 3,
                      backgroundColor: medalColor,
                      opacity: isFirst ? 1 : 0.75,
                    }}
                  />

                  <MilitaryTechRoundedIcon
                    sx={{ color: medalColor, fontSize: 30, mb: 1 }}
                  />

                  <Box
                    sx={{ display: "flex", justifyContent: "center", mb: 1.5 }}
                  >
                    <Avatar
                      sx={{
                        width: 58,
                        height: 58,
                        fontSize: "1.15rem",
                        fontWeight: 800,
                        color: "#f5f3ff",
                        backgroundColor: "rgba(167,139,250,0.18)",
                        border: `2px solid ${medalColor}`,
                      }}
                    >
                      {getInitials(player.name)}
                    </Avatar>
                  </Box>

                  <Typography
                    variant="body2"
                    sx={{ color: medalColor, fontWeight: 800, mb: 0.5 }}
                  >
                    {player.position}º LUGAR
                  </Typography>

                  <Typography
                    sx={{
                      color: "#f5f3ff",
                      fontWeight: 700,
                      fontSize: "1rem",
                      overflowWrap: "anywhere",
                      mb: 2,
                    }}
                  >
                    {player.name}
                  </Typography>

                  <Typography
                    sx={{
                      fontSize: { xs: "2rem", sm: "1.8rem" },
                      fontWeight: 800,
                      color: PURPLE,
                      lineHeight: 1.2,
                    }}
                  >
                    {player.ppm}
                  </Typography>

                  <Typography
                    variant="caption"
                    sx={{ color: "#969bad", fontWeight: 600 }}
                  >
                    PALAVRAS POR MINUTO
                  </Typography>

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 0.75,
                      mt: 2,
                      pt: 1.5,
                      borderTop: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <TrackChangesRoundedIcon
                      sx={{ color: "#969bad", fontSize: 17 }}
                    />

                    <Typography variant="body2" sx={{ color: "#c4c7d1" }}>
                      Precisão: {player.accuracy}%
                    </Typography>
                  </Box>
                </Paper>
              );
            })}
          </Box>
        )}

        {/* Demais posições */}
        {!isLoading && !error && remainingPlayers.length > 0 && (
          <Box>
            <Typography
              variant="subtitle1"
              sx={{ color: "#c4c7d1", fontWeight: 700, mb: 1.5 }}
            >
              Classificação geral
            </Typography>

            <Paper
              elevation={0}
              sx={{
                overflow: "hidden",
                borderRadius: 3,
                backgroundColor: PANEL_BACKGROUND,
                border: `1px solid ${BORDER_COLOR}`,
              }}
            >
              {remainingPlayers.map((player, index) => (
                <Box
                  key={player.userId}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: { xs: 1.5, sm: 2 },
                    px: { xs: 1.5, sm: 2.5 },
                    py: 2,
                    borderBottom:
                      index < remainingPlayers.length - 1
                        ? "1px solid rgba(255,255,255,0.06)"
                        : "none",
                    transition: "background-color 150ms ease",
                    "&:hover": {
                      backgroundColor: "rgba(167,139,250,0.05)",
                    },
                  }}
                >
                  <Box
                    sx={{
                      minWidth: 34,
                      color: "#969bad",
                      fontWeight: 800,
                      textAlign: "center",
                    }}
                  >
                    #{player.position}
                  </Box>

                  <Avatar
                    sx={{
                      width: 40,
                      height: 40,
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      color: "#e9ddff",
                      backgroundColor: "rgba(167,139,250,0.15)",
                    }}
                  >
                    {getInitials(player.name)}
                  </Avatar>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      sx={{
                        color: "#f5f3ff",
                        fontWeight: 700,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {player.name}
                    </Typography>

                    <Typography variant="body2" sx={{ color: "#969bad" }}>
                      Precisão: {player.accuracy}%
                    </Typography>
                  </Box>

                  <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 2,
                      }}
                    >
                      <SpeedRoundedIcon sx={{ fontSize: 17, color: PURPLE }} />

                      <Typography
                        sx={{
                          color: PURPLE,
                          fontSize: "1.15rem",
                          fontWeight: 800,
                        }}
                      >
                        {player.ppm}
                      </Typography>
                    </Box>

                    <Typography variant="caption" sx={{ color: "#969bad" }}>
                      PPM
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Paper>
          </Box>
        )}
      </Stack>
    </Box>
  );
}
