import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";

import { useAuth } from "../../contexts/AuthContext";
import { getTypingResults } from "../../services/api";
import PerformanceEvolution from "../../components/profile/PerformanceEvolution";

interface TypingResult {
  id: number;
  ppm: number;
  accuracy: number;
  errors: number;
  characters: number;
  duration: number;
  createdAt: string;
  userId: number;
}

const RESULTS_PER_PAGE = 10;
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;

const panelSx = {
  bgcolor: "background.paper",
  border: "1px solid",
  borderColor: "rgba(155, 109, 255, 0.18)",
  borderRadius: 3,
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
};

interface StatCardProps {
  label: string;
  value: string | number;
  description?: string;
  accent?: string;
}

function StatCard({
  label,
  value,
  description,
  accent = "#a78bfa",
}: StatCardProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        ...panelSx,
        position: "relative",
        overflow: "hidden",
        p: 2.5,
        minWidth: 0,
        transition: "transform 180ms ease, border-color 180ms ease",
        "&:hover": {
          transform: "translateY(-3px)",
          borderColor: accent,
        },
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: 3,
          bgcolor: accent,
        },
      }}
    >
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ fontWeight: 600, mb: 2 }}
      >
        {label}
      </Typography>

      <Typography
        variant="h4"
        sx={{
          fontWeight: 800,
          letterSpacing: "-1px",
          color: accent,
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </Typography>

      {description && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 1 }}
        >
          {description}
        </Typography>
      )}
    </Paper>
  );
}

export function Profile() {
  const { user, token, logout } = useAuth();

  const [results, setResults] = useState<TypingResult[]>([]);
  const [visibleResults, setVisibleResults] = useState(RESULTS_PER_PAGE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Foto temporária: a persistência na conta será implementada depois.
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState("");

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    const authToken = token;

    async function loadResults() {
      try {
        setError("");
        const response = await getTypingResults(authToken);
        setResults(response.results);
      } catch (error) {
        console.error(error);
        setError("Não foi possível carregar o histórico de testes.");
      } finally {
        setIsLoading(false);
      }
    }

    loadResults();
  }, [token]);

  // Libera a URL temporária da imagem quando ela é substituída ou o componente desmonta.
  useEffect(() => {
    return () => {
      if (profilePhoto) {
        URL.revokeObjectURL(profilePhoto);
      }
    };
  }, [profilePhoto]);

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPhotoError("Selecione um arquivo de imagem válido.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_PHOTO_SIZE) {
      setPhotoError("A imagem deve ter no máximo 5 MB.");
      event.target.value = "";
      return;
    }

    const newPhotoUrl = URL.createObjectURL(file);

    setPhotoError("");
    setProfilePhoto(newPhotoUrl);

    // Permite escolher novamente o mesmo arquivo.
    event.target.value = "";
  }

  const sortedResults = [...results].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const displayedResults = sortedResults.slice(0, visibleResults);
  const hasMoreResults = visibleResults < results.length;

  function loadMoreResults() {
    setVisibleResults((current) =>
      Math.min(current + RESULTS_PER_PAGE, results.length),
    );
  }

  const bestPpm =
    results.length > 0 ? Math.max(...results.map((result) => result.ppm)) : 0;

  const averagePpm =
    results.length > 0
      ? Math.round(
          results.reduce((total, result) => total + result.ppm, 0) /
            results.length,
        )
      : 0;

  const averageAccuracy =
    results.length > 0
      ? Math.round(
          results.reduce((total, result) => total + result.accuracy, 0) /
            results.length,
        )
      : 0;

  const bestAccuracy =
    results.length > 0
      ? Math.max(...results.map((result) => result.accuracy))
      : 0;

  const totalTests = results.length;

  const totalCharacters = results.reduce(
    (total, result) => total + result.characters,
    0,
  );

  const totalTypingSeconds = results.reduce(
    (total, result) => total + result.duration,
    0,
  );

  function formatTypingTime(seconds: number) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) return `${hours}h ${minutes}min`;
    if (minutes > 0) return `${minutes}min ${remainingSeconds}s`;
    return `${remainingSeconds}s`;
  }

  function getDurationStats(duration: number) {
    const durationResults = results.filter(
      (result) => result.duration === duration,
    );

    if (durationResults.length === 0) {
      return { tests: 0, bestPpm: 0, averagePpm: 0 };
    }

    return {
      tests: durationResults.length,
      bestPpm: Math.max(...durationResults.map((result) => result.ppm)),
      averagePpm: Math.round(
        durationResults.reduce((total, result) => total + result.ppm, 0) /
          durationResults.length,
      ),
    };
  }

  const durationStats = [
    { label: "15 segundos", stats: getDurationStats(15) },
    { label: "30 segundos", stats: getDurationStats(30) },
    { label: "60 segundos", stats: getDurationStats(60) },
  ];

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 1180,
        mx: "auto",
        px: { xs: 2, sm: 3 },
        py: { xs: 3, md: 5 },
      }}
    >
      <Stack spacing={{ xs: 3, md: 4 }}>
        {/* Cabeçalho do perfil */}
        <Paper
          elevation={0}
          sx={{
            ...panelSx,
            position: "relative",
            overflow: "hidden",
            p: { xs: 2.5, sm: 4 },
            background:
              "linear-gradient(125deg, rgba(126, 87, 194, 0.20), rgba(126, 87, 194, 0.04) 55%, transparent)",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              width: 220,
              height: 220,
              borderRadius: "50%",
              bgcolor: "rgba(167, 139, 250, 0.07)",
              filter: "blur(2px)",
              top: -125,
              right: -50,
              pointerEvents: "none",
            }}
          />

          <Box
            sx={{
              position: "relative",
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "flex-start", sm: "center" },
              gap: 2,
            }}
          >
            <Avatar
              src={profilePhoto || undefined}
              alt={`Foto de perfil de ${user?.name || "jogador"}`}
              sx={{
                width: { xs: 82, sm: 104 },
                height: { xs: 82, sm: 104 },
                fontSize: { xs: 32, sm: 42 },
                fontWeight: 800,
                bgcolor: "primary.main",
                color: "#fff",
                border: "3px solid rgba(167, 139, 250, 0.55)",
                boxShadow: "0 0 28px rgba(126, 87, 194, 0.25)",
              }}
            >
              {user?.name?.charAt(0).toUpperCase() || "?"}
            </Avatar>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="overline"
                sx={{
                  color: "primary.main",
                  fontWeight: 800,
                  letterSpacing: 2,
                }}
              >
                TYPEBATTLE / JOGADOR
              </Typography>

              <Typography
                variant="h4"
                sx={{
                  fontWeight: 800,
                  letterSpacing: "-1px",
                  overflowWrap: "anywhere",
                }}
              >
                {user?.name || "Meu perfil"}
              </Typography>

              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                {user?.email || "E-mail não disponível"}
              </Typography>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 1 }}
              >
                ID do jogador: {user?.id ?? "—"}
              </Typography>

              <Box sx={{ mt: 2 }}>
                <Button
                  component="label"
                  variant="outlined"
                  size="small"
                  startIcon={<PhotoCameraOutlinedIcon />}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 700,
                  }}
                >
                  Alterar foto
                  <input
                    hidden
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                  />
                </Button>

                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 0.75 }}
                >
                  Imagem de até 5 MB.
                </Typography>

                {photoError && (
                  <Alert severity="error" sx={{ mt: 1 }}>
                    {photoError}
                  </Alert>
                )}
              </Box>
            </Box>

            <Button
              variant="outlined"
              color="error"
              onClick={logout}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 700,
                px: 2.5,
                alignSelf: { xs: "stretch", sm: "center" },
              }}
            >
              Sair da conta
            </Button>
          </Box>
        </Paper>

        {isLoading && (
          <Paper elevation={0} sx={{ ...panelSx, py: 6, textAlign: "center" }}>
            <CircularProgress color="secondary" />
            <Typography color="text.secondary" sx={{ mt: 2 }}>
              Carregando suas estatísticas...
            </Typography>
          </Paper>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {!isLoading && !error && results.length === 0 && (
          <Paper
            elevation={0}
            sx={{
              ...panelSx,
              p: { xs: 3, sm: 5 },
              textAlign: "center",
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
              Sua jornada começa aqui
            </Typography>
            <Typography color="text.secondary">
              Você ainda não realizou nenhum teste. Jogue sua primeira rodada
              para começar a acompanhar seu desempenho.
            </Typography>
          </Paper>
        )}

        {!isLoading && !error && results.length > 0 && (
          <>
            {/* Estatísticas principais */}
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
                  value={bestPpm}
                  description="Seu recorde de velocidade"
                  accent="#a78bfa"
                />
                <StatCard
                  label="Precisão média"
                  value={`${averageAccuracy}%`}
                  description="Média entre seus testes"
                  accent="#5eead4"
                />
                <StatCard
                  label="Testes realizados"
                  value={totalTests}
                  description="Total de rodadas concluídas"
                  accent="#93c5fd"
                />
                <StatCard
                  label="Tempo digitando"
                  value={formatTypingTime(totalTypingSeconds)}
                  description="Tempo acumulado dos testes"
                  accent="#f0abfc"
                />
              </Box>
            </Box>

            {/* Estatísticas complementares */}
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
                <StatCard
                  label="PPM médio"
                  value={averagePpm}
                  accent="#a78bfa"
                />
                <StatCard
                  label="Melhor precisão"
                  value={`${bestAccuracy}%`}
                  accent="#5eead4"
                />
                <StatCard
                  label="Caracteres digitados"
                  value={totalCharacters.toLocaleString("pt-BR")}
                  accent="#93c5fd"
                />
              </Box>
            </Box>

            {/* Desempenho por duração */}
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
                Desempenho por duração
              </Typography>
              <Typography
                color="text.secondary"
                variant="body2"
                sx={{ mb: 2.5 }}
              >
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

            {/* Gráficos de evolução */}
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 2.5 }}>
                Evolução de desempenho
              </Typography>
              <PerformanceEvolution results={results} />
            </Box>
          </>
        )}

        {/* Histórico de testes */}
        <Box>
          {!isLoading && !error && results.length > 0 && (
            <>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 2.5 }}>
                Histórico de testes
              </Typography>

              <TableContainer
                component={Paper}
                elevation={0}
                sx={{
                  ...panelSx,
                  overflowX: "auto",
                  "& .MuiTableCell-root": {
                    borderColor: "divider",
                    whiteSpace: "nowrap",
                    px: { xs: 1.5, sm: 2 },
                    py: 1.8,
                  },
                  "& .MuiTableHead-root .MuiTableCell-root": {
                    bgcolor: "rgba(126, 87, 194, 0.12)",
                    color: "text.secondary",
                    fontWeight: 800,
                    fontSize: 12,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  },
                  "& .MuiTableBody-root .MuiTableRow-root:hover": {
                    bgcolor: "action.hover",
                  },
                  "& .MuiTableBody-root .MuiTableRow-root:last-child td": {
                    borderBottom: 0,
                  },
                }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Data</TableCell>
                      <TableCell>PPM</TableCell>
                      <TableCell>Precisão</TableCell>
                      <TableCell>Erros</TableCell>
                      <TableCell>Caracteres</TableCell>
                      <TableCell>Tempo</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {displayedResults.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell>
                          {new Date(result.createdAt).toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell>
                          <Typography
                            component="span"
                            sx={{ fontWeight: 800, color: "primary.main" }}
                          >
                            {result.ppm}
                          </Typography>
                        </TableCell>
                        <TableCell>{result.accuracy}%</TableCell>
                        <TableCell>{result.errors}</TableCell>
                        <TableCell>
                          {result.characters.toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell>{result.duration}s</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {results.length > RESULTS_PER_PAGE && (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    alignItems: { xs: "stretch", sm: "center" },
                    gap: 2,
                    mt: 2,
                  }}
                >
                  {hasMoreResults && (
                    <Button
                      variant="contained"
                      onClick={loadMoreResults}
                      sx={{
                        borderRadius: 2,
                        textTransform: "none",
                        fontWeight: 700,
                      }}
                    >
                      Carregar mais
                    </Button>
                  )}

                  {visibleResults > RESULTS_PER_PAGE && (
                    <Button
                      variant="outlined"
                      onClick={() => setVisibleResults(RESULTS_PER_PAGE)}
                      sx={{
                        borderRadius: 2,
                        textTransform: "none",
                      }}
                    >
                      Mostrar menos
                    </Button>
                  )}
                </Box>
              )}
            </>
          )}

          {!isLoading && !error && results.length === 0 && (
            <Paper
              elevation={0}
              sx={{
                ...panelSx,
                p: 3,
                textAlign: "center",
              }}
            >
              <Typography color="text.secondary">
                Seu histórico aparecerá aqui após o primeiro teste.
              </Typography>
            </Paper>
          )}
        </Box>
      </Stack>
    </Box>
  );
}
