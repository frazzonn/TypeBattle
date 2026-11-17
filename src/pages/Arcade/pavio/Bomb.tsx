import { Box } from "@mui/material";
import { keyframes } from "@mui/material/styles";

const MONO_FONT = "'JetBrains Mono', ui-monospace, monospace";

const shake = keyframes`
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  25% { transform: translate(-2px, 1px) rotate(-2deg); }
  75% { transform: translate(2px, -1px) rotate(2deg); }
`;
const spark = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.35); opacity: .75; }
`;
const boom = keyframes`
  0% { transform: scale(.4); opacity: 1; }
  70% { opacity: .9; }
  100% { transform: scale(1.6); opacity: 0; }
`;

interface BombProps {
  syllable: string | null;
  // 0 = calma, 1 = quase explodindo (treme mais rápido e o pavio fica curto).
  tension: number;
  exploded?: boolean;
  // Erro na última tentativa: a sílaba pisca em vermelho.
  error?: boolean;
  size?: number;
}

// Bomba com a sílaba no meio. Só CSS: leve até em computador fraco.
export function Bomb({ syllable, tension, exploded = false, error = false, size = 140 }: BombProps) {
  const t = Math.max(0, Math.min(1, tension));
  // Treme mais rápido conforme a tensão sobe; abaixo de 0,35 fica parada.
  const shakeSeconds = 0.5 - t * 0.38;
  // Pavio e faísca acompanham o tamanho da bomba.
  const scale = size / 200;
  const fuseLength = (18 + (1 - t) * 34) * scale;
  const sparkSize = Math.max(10, 18 * scale);
  const sparkColor = t > 0.75 ? "#ff5c7a" : "#fdba74";

  return (
    <Box
      aria-hidden="true"
      sx={{ position: "relative", width: size, height: size + 40 * scale, display: "grid", placeItems: "end center" }}
    >
      {/* Pavio */}
      <Box
        sx={{
          position: "absolute", left: "58%", bottom: size * 0.86, width: Math.max(2, 4 * scale), height: fuseLength,
          bgcolor: "#8a7356", borderRadius: 2, transformOrigin: "bottom center", transform: "rotate(28deg)",
          opacity: exploded ? 0 : 1, transition: "height 300ms ease",
        }}
      >
        <Box
          sx={{
            position: "absolute", top: -sparkSize / 2, left: -sparkSize / 2 + 1, width: sparkSize, height: sparkSize, borderRadius: "50%",
            background: `radial-gradient(circle, #fff6d8 0 25%, ${sparkColor} 45%, rgba(255,92,122,0) 70%)`,
            animation: `${spark} ${0.35 - t * 0.2}s ease-in-out infinite`,
            "@media (prefers-reduced-motion: reduce)": { animation: "none" },
          }}
        />
      </Box>

      {/* Corpo */}
      <Box
        sx={{
          position: "relative", width: size, height: size, borderRadius: "50%",
          background: "radial-gradient(circle at 34% 30%, #4a4f5e 0 8%, #262a33 30%, #12141a 72%)",
          boxShadow: `0 18px 40px rgba(0,0,0,.45), inset -10px -14px 30px rgba(0,0,0,.5), 0 0 ${20 + t * 40}px rgba(255,92,122,${t * 0.35})`,
          display: "grid", placeItems: "center",
          animation: t > 0.35 && !exploded ? `${shake} ${shakeSeconds}s ease-in-out infinite` : "none",
          opacity: exploded ? 0.25 : 1, transition: "opacity 200ms ease",
          "@media (prefers-reduced-motion: reduce)": { animation: "none" },
        }}
      >
        {/* Bocal onde o pavio entra */}
        <Box
          sx={{
            position: "absolute", top: -size * 0.06, left: "50%", transform: "translateX(-20%)",
            width: size * 0.22, height: size * 0.12, borderRadius: "6px", bgcolor: "#353a46",
            border: "1px solid #444a58",
          }}
        />
        <Box
          sx={{
            fontFamily: MONO_FONT, fontWeight: 800, fontSize: size * 0.24, letterSpacing: "0.06em",
            color: error ? "#ff5c7a" : "#fff", textTransform: "uppercase",
            textShadow: "0 2px 0 rgba(0,0,0,.4)", transition: "color 120ms ease",
          }}
        >
          {syllable ?? ""}
        </Box>
      </Box>

      {exploded && (
        <Box
          sx={{
            position: "absolute", inset: -20, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,246,216,.95) 0 15%, rgba(253,186,116,.8) 35%, rgba(255,92,122,.5) 55%, rgba(255,92,122,0) 70%)",
            animation: `${boom} 700ms ease-out forwards`,
            pointerEvents: "none",
          }}
        />
      )}
    </Box>
  );
}
