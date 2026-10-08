import { useEffect, useState } from "react";

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

import { useAuth } from "../../contexts/AuthContext";
import { getTypingResults } from "../../services/api";

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

export function Profile() {
  const { user, token, logout } = useAuth();

  const [results, setResults] = useState<TypingResult[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState("");

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

  // Melhor PPM registrado pelo usuário.
  const bestPpm =
    results.length > 0 ? Math.max(...results.map((result) => result.ppm)) : 0;

  // Média de PPM de todos os testes.
  const averagePpm =
    results.length > 0
      ? Math.round(
          results.reduce((total, result) => total + result.ppm, 0) /
            results.length,
        )
      : 0;

  // Média de precisão dos testes.
  const averageAccuracy =
    results.length > 0
      ? Math.round(
          results.reduce((total, result) => total + result.accuracy, 0) /
            results.length,
        )
      : 0;

  // Melhor precisão registrada.
  const bestAccuracy =
    results.length > 0
      ? Math.max(...results.map((result) => result.accuracy))
      : 0;

  // Quantidade total de testes.
  const totalTests = results.length;

  // Soma todos os caracteres digitados.
  const totalCharacters = results.reduce(
    (total, result) => total + result.characters,
    0,
  );

  // Soma a duração de todos os testes em segundos.
  const totalTypingSeconds = results.reduce(
    (total, result) => total + result.duration,
    0,
  );

  // Converte segundos para uma representação amigável.
  function formatTypingTime(seconds: number) {
    const hours = Math.floor(seconds / 3600);

    const minutes = Math.floor((seconds % 3600) / 60);

    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }

    if (minutes > 0) {
      return `${minutes}min ${remainingSeconds}s`;
    }

    return `${remainingSeconds}s`;
  }

  const totalTypingTime = formatTypingTime(totalTypingSeconds);

  // Calcula estatísticas para uma duração específica.
  function getDurationStats(duration: number) {
    const durationResults = results.filter(
      (result) => result.duration === duration,
    );

    if (durationResults.length === 0) {
      return {
        tests: 0,
        bestPpm: 0,
        averagePpm: 0,
      };
    }

    const bestPpm = Math.max(...durationResults.map((result) => result.ppm));

    const averagePpm = Math.round(
      durationResults.reduce((total, result) => total + result.ppm, 0) /
        durationResults.length,
    );

    return {
      tests: durationResults.length,
      bestPpm,
      averagePpm,
    };
  }

  const stats15 = getDurationStats(15);
  const stats30 = getDurationStats(30);
  const stats60 = getDurationStats(60);

  return (
    <Box
      sx={{
        maxWidth: 1100,
        mx: "auto",
        px: 2,
        py: 6,
      }}
    >
      <Stack spacing={4}>
        {/* Informações do usuário */}
        <Paper
          elevation={0}
          sx={{
            p: 4,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Stack spacing={2}>
            <Avatar
              sx={{
                width: 100,
                height: 100,
                fontSize: 36,
                bgcolor: "primary.main",
              }}
            >
              {user?.name?.charAt(0).toUpperCase()}
            </Avatar>

            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Meu Perfil
            </Typography>

            <Typography>
              <strong>Nome:</strong> {user?.name}
            </Typography>

            <Typography>
              <strong>E-mail:</strong> {user?.email}
            </Typography>

            <Typography>
              <strong>ID:</strong> {user?.id}
            </Typography>

            <Button
              variant="outlined"
              color="error"
              onClick={logout}
              sx={{
                alignSelf: "flex-start",
              }}
            >
              Sair da conta
            </Button>
          </Stack>
        </Paper>

        {/* Resumo do desempenho */}
        {!isLoading && !error && results.length > 0 && (
          <Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                mb: 2,
              }}
            >
              Meu desempenho
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, 1fr)",
                  md: "repeat(4, 1fr)",
                },
                gap: 2,
              }}
            >
              {/* Melhor PPM */}
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  textAlign: "center",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 700,
                    color: "primary.main",
                  }}
                >
                  {bestPpm}
                </Typography>

                <Typography
                  color="text.secondary"
                  sx={{
                    fontWeight: 600,
                  }}
                >
                  Melhor PPM
                </Typography>
              </Paper>

              {/* Precisão média */}
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  textAlign: "center",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 700,
                    color: "secondary.main",
                  }}
                >
                  {averageAccuracy}%
                </Typography>

                <Typography
                  color="text.secondary"
                  sx={{
                    fontWeight: 600,
                  }}
                >
                  Precisão média
                </Typography>
              </Paper>

              {/* Total de testes */}
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  textAlign: "center",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 700,
                  }}
                >
                  {totalTests}
                </Typography>

                <Typography
                  color="text.secondary"
                  sx={{
                    fontWeight: 600,
                  }}
                >
                  Testes realizados
                </Typography>
              </Paper>

              {/* Tempo total */}
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  textAlign: "center",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 700,
                  }}
                >
                  {totalTypingTime}
                </Typography>

                <Typography
                  color="text.secondary"
                  sx={{
                    fontWeight: 600,
                  }}
                >
                  Tempo digitando
                </Typography>
              </Paper>
            </Box>
          </Box>
        )}

        {/* Estatísticas adicionais */}
        {!isLoading && !error && results.length > 0 && (
          <Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                mb: 2,
              }}
            >
              Estatísticas
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(3, 1fr)",
                },
                gap: 2,
              }}
            >
              {/* PPM médio */}
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography
                  color="text.secondary"
                  sx={{
                    fontWeight: 600,
                    mb: 1,
                  }}
                >
                  PPM médio
                </Typography>

                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 700,
                  }}
                >
                  {averagePpm}
                </Typography>
              </Paper>

              {/* Melhor precisão */}
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography
                  color="text.secondary"
                  sx={{
                    fontWeight: 600,
                    mb: 1,
                  }}
                >
                  Melhor precisão
                </Typography>

                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 700,
                  }}
                >
                  {bestAccuracy}%
                </Typography>
              </Paper>

              {/* Caracteres */}
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography
                  color="text.secondary"
                  sx={{
                    fontWeight: 600,
                    mb: 1,
                  }}
                >
                  Caracteres digitados
                </Typography>

                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 700,
                  }}
                >
                  {totalCharacters}
                </Typography>
              </Paper>
            </Box>
          </Box>
        )}

        {/* Desempenho por duração */}
        {!isLoading && !error && results.length > 0 && (
          <Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                mb: 2,
              }}
            >
              Desempenho por duração
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "repeat(3, 1fr)",
                },
                gap: 2,
              }}
            >
              {[
                {
                  label: "15 segundos",
                  stats: stats15,
                },
                {
                  label: "30 segundos",
                  stats: stats30,
                },
                {
                  label: "1 minuto",
                  stats: stats60,
                },
              ].map((item) => (
                <Paper
                  key={item.label}
                  elevation={0}
                  sx={{
                    p: 3,
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      mb: 2,
                    }}
                  >
                    {item.label}
                  </Typography>

                  <Stack spacing={1}>
                    <Typography>
                      <strong>Melhor PPM:</strong>{" "}
                      {item.stats.tests > 0 ? item.stats.bestPpm : "-"}
                    </Typography>

                    <Typography>
                      <strong>PPM médio:</strong>{" "}
                      {item.stats.tests > 0 ? item.stats.averagePpm : "-"}
                    </Typography>

                    <Typography>
                      <strong>Testes:</strong> {item.stats.tests}
                    </Typography>
                  </Stack>
                </Paper>
              ))}
            </Box>
          </Box>
        )}

        {/* Histórico de testes */}
        <Box>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              mb: 2,
            }}
          >
            Histórico de testes
          </Typography>

          {isLoading && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                py: 5,
              }}
            >
              <CircularProgress />
            </Box>
          )}

          {error && <Alert severity="error">{error}</Alert>}

          {!isLoading && !error && results.length === 0 && (
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
                Você ainda não realizou nenhum teste.
              </Typography>
            </Paper>
          )}

          {!isLoading && !error && results.length > 0 && (
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Table>
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
                  {results.map((result) => (
                    <TableRow key={result.id}>
                      <TableCell>
                        {new Date(result.createdAt).toLocaleString("pt-BR")}
                      </TableCell>

                      <TableCell>{result.ppm}</TableCell>

                      <TableCell>{result.accuracy}%</TableCell>

                      <TableCell>{result.errors}</TableCell>

                      <TableCell>{result.characters}</TableCell>

                      <TableCell>{result.duration}s</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Stack>
    </Box>
  );
}
