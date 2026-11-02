import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import { useAuth } from "../../contexts/useAuth";
import { getTypingResults, type TypingResult } from "../../services/api";
import { BattleStats } from "./components/BattleStats";
import { MissedKeysCard } from "./components/MissedKeysCard";
import { ProfileHeader } from "./components/ProfileHeader";
import { ProfileOverview } from "./components/ProfileOverview";
import { ResultsHistory } from "./components/ResultsHistory";
import { panelSx } from "./styles";

export function Profile() {
  const { token } = useAuth();

  const [results, setResults] = useState<TypingResult[]>([]);
  // Sem token não há o que carregar (a rota já exige login).
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;

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

  const hasResults = !isLoading && !error && results.length > 0;
  const isEmpty = !isLoading && !error && results.length === 0;

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
        <ProfileHeader />

        {isLoading && (
          <Paper elevation={0} sx={{ ...panelSx, py: 6, textAlign: "center" }}>
            <CircularProgress color="secondary" />
            <Typography color="text.secondary" sx={{ mt: 2 }}>
              Carregando suas estatísticas...
            </Typography>
          </Paper>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {isEmpty && (
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

        {hasResults && <ProfileOverview results={results} />}

        {hasResults && <MissedKeysCard results={results} />}

        {token && <BattleStats token={token} />}

        <Box>
          {hasResults && <ResultsHistory results={results} />}

          {isEmpty && (
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
