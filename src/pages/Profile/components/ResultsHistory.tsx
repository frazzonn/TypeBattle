import { useState } from "react";
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

import type { TypingResult } from "../../../services/api";
import { panelSx } from "../styles";

const RESULTS_PER_PAGE = 10;

interface ResultsHistoryProps {
  results: TypingResult[];
}

// Tabela do histórico, do teste mais recente para o mais antigo.
export function ResultsHistory({ results }: ResultsHistoryProps) {
  const [visibleResults, setVisibleResults] = useState(RESULTS_PER_PAGE);

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

  return (
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
                <TableCell>{result.characters.toLocaleString("pt-BR")}</TableCell>
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
  );
}
