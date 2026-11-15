import { Paper, Typography } from "@mui/material";

import type { TypingResult } from "../../../services/api";
import { MissedKeys } from "../../../components/typing/MissedKeys";
import { panelSx } from "../styles";

interface MissedKeysCardProps {
  results: TypingResult[];
  // Perfil de outro jogador: textos na terceira pessoa.
  isOther?: boolean;
}

// Soma as teclas erradas de todos os testes salvos.
function sumMissedKeys(results: TypingResult[]) {
  const totals: Record<string, number> = {};

  for (const result of results) {
    for (const [key, count] of Object.entries(result.missedKeys ?? {})) {
      totals[key] = (totals[key] ?? 0) + count;
    }
  }

  return totals;
}

export function MissedKeysCard({ results, isOther = false }: MissedKeysCardProps) {
  return (
    <Paper elevation={0} sx={{ ...panelSx, p: { xs: 2.5, sm: 3 } }}>
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
        {isOther ? "Teclas que mais erra" : "Teclas que você mais erra"}
      </Typography>
      <Typography color="text.secondary" variant="body2" sx={{ mb: 2.5 }}>
        {isOther
          ? "Somando todos os testes no modo tempo."
          : "Somando todos os seus testes no modo tempo."}
      </Typography>

      <MissedKeys
        missedKeys={sumMissedKeys(results)}
        limit={10}
        emptyText="Faça um teste para descobrir em quais teclas você mais erra."
      />
    </Paper>
  );
}
