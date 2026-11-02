import { Box, Typography } from "@mui/material";

interface MissedKeysProps {
  // Letra esperada -> quantas vezes errou nela.
  missedKeys: Record<string, number>;
  limit?: number;
  emptyText?: string;
}

function keyLabel(key: string) {
  return key === " " ? "espaço" : key;
}

// As letras em que a pessoa mais erra, como teclas com a contagem.
export function MissedKeys({
  missedKeys,
  limit = 6,
  emptyText = "Nenhum erro. Perfeito!",
}: MissedKeysProps) {
  const keys = Object.entries(missedKeys)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  if (keys.length === 0) {
    return (
      <Typography sx={{ color: "#a0a4ad", fontSize: 14 }}>
        {emptyText}
      </Typography>
    );
  }

  const highest = keys[0][1];

  return (
    <Box
      component="ul"
      sx={{
        listStyle: "none",
        m: 0,
        p: 0,
        display: "flex",
        flexWrap: "wrap",
        gap: 1.25,
      }}
    >
      {keys.map(([key, count]) => (
        <Box
          component="li"
          key={key}
          aria-label={`${keyLabel(key)}: ${count} ${count === 1 ? "erro" : "erros"}`}
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0.75,
            minWidth: key === " " ? 88 : 52,
          }}
        >
          <Box
            sx={{
              width: "100%",
              height: 48,
              px: 1.25,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "10px",
              border: "1px solid #3a3f4c",
              borderBottomWidth: 3,
              backgroundColor: "#20232b",
              color: "#ffffff",
              fontWeight: 800,
              fontSize: key === " " ? 14 : 20,
              fontFamily: "monospace",
            }}
          >
            {keyLabel(key)}
          </Box>
          {/* Barra proporcional ao maior número de erros. */}
          <Box
            sx={{
              width: "100%",
              height: 4,
              borderRadius: 2,
              backgroundColor: "#292d36",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                width: `${(count / highest) * 100}%`,
                height: "100%",
                borderRadius: 2,
                backgroundColor: "#ff5c75",
              }}
            />
          </Box>
          <Typography sx={{ color: "#a0a4ad", fontSize: 13, fontWeight: 700 }}>
            {count}×
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
