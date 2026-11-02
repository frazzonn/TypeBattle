import { useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { Box, Typography } from "@mui/material";

import type { SecondSample } from "../../hooks/useTypingTest";

interface ResultChartProps {
  history: SecondSample[];
}

const WIDTH = 800;
const HEIGHT = 220;
const LEFT = 44;
const RIGHT = 16;
const TOP = 14;
const BOTTOM = 30;

const LINE_COLOR = "#a78bfa";
const ERROR_COLOR = "#ff5c75";

// Topo do eixo arredondado para um número redondo (ex.: 87 -> 100).
function niceMax(value: number) {
  const step = value <= 50 ? 10 : value <= 150 ? 25 : 50;
  return Math.max(step, Math.ceil(value / step) * step);
}

function formatSecond(second: number) {
  return Number.isInteger(second)
    ? `${second}s`
    : `${second.toFixed(1).replace(".", ",")}s`;
}

// PPM segundo a segundo, com um × nos segundos em que houve erro.
export function ResultChart({ history }: ResultChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (history.length < 2) return null;

  const lastSecond = history[history.length - 1].second;
  const maxPpm = niceMax(Math.max(...history.map((sample) => sample.ppm)));
  const chartWidth = WIDTH - LEFT - RIGHT;
  const chartHeight = HEIGHT - TOP - BOTTOM;
  const bottom = TOP + chartHeight;

  const xFor = (second: number) => LEFT + (second / lastSecond) * chartWidth;
  const yFor = (ppm: number) =>
    TOP + chartHeight - (ppm / maxPpm) * chartHeight;

  const points = history.map((sample) => ({
    ...sample,
    x: xFor(sample.second),
    y: yFor(sample.ppm),
  }));
  const line = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const area = `${line} L ${points[points.length - 1].x} ${bottom} L ${points[0].x} ${bottom} Z`;

  // Marcas do eixo do tempo sem amontoar.
  const tickStep = Math.max(1, Math.ceil(lastSecond / 8));
  const ticks = points.filter(
    (point) => Number.isInteger(point.second) && point.second % tickStep === 0,
  );

  const active = activeIndex === null ? null : points[activeIndex];

  // A linha vertical vai para o ponto mais perto do mouse.
  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;

    points.forEach((point, index) => {
      if (Math.abs(point.x - x) < Math.abs(points[nearest].x - x)) {
        nearest = index;
      }
    });

    setActiveIndex(nearest);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

    event.preventDefault();
    const step = event.key === "ArrowRight" ? 1 : -1;
    setActiveIndex((current) =>
      Math.min(points.length - 1, Math.max(0, (current ?? -1) + step)),
    );
  }

  return (
    <Box
      sx={{
        mt: 2.5,
        p: { xs: 1.5, sm: 2.5 },
        borderRadius: 3,
        border: "1px solid #292d36",
        backgroundColor: "#15171d",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          mb: 1,
          flexWrap: "wrap",
        }}
      >
        <Typography sx={{ color: "#ffffff", fontWeight: 700 }}>
          Velocidade durante o teste
        </Typography>

        {/* Legenda */}
        <Box
          sx={{
            display: "flex",
            gap: 2,
            color: "#a0a4ad",
            fontSize: 13,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Box
              sx={{
                width: 16,
                height: 2,
                borderRadius: 1,
                bgcolor: LINE_COLOR,
              }}
            />
            PPM
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Box
              component="span"
              sx={{ color: ERROR_COLOR, fontWeight: 800, lineHeight: 1 }}
            >
              ×
            </Box>
            Erros
          </Box>
        </Box>
      </Box>

      {/* No celular o gráfico mantém uma largura legível e rola de lado. */}
      <Box sx={{ overflowX: "auto" }}>
        <Box
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onBlur={() => setActiveIndex(null)}
          aria-label="Gráfico de velocidade. Use as setas para ver cada segundo."
          sx={{
            position: "relative",
            minWidth: { xs: 560, sm: 0 },
            borderRadius: 2,
            outline: "none",
            "&:focus-visible": { boxShadow: `0 0 0 2px ${LINE_COLOR}` },
          }}
        >
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            width="100%"
            role="img"
            aria-label={`PPM ao longo de ${formatSecond(lastSecond)}`}
            style={{ display: "block", touchAction: "pan-y" }}
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setActiveIndex(null)}
          >
            <defs>
              <linearGradient
                id="result-chart-fill"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={LINE_COLOR} stopOpacity="0.22" />
                <stop offset="100%" stopColor={LINE_COLOR} stopOpacity="0" />
              </linearGradient>
            </defs>

            {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
              const y = TOP + chartHeight * (1 - fraction);

              return (
                <g key={fraction}>
                  <line
                    x1={LEFT}
                    y1={y}
                    x2={WIDTH - RIGHT}
                    y2={y}
                    stroke="rgba(174,183,220,0.1)"
                    strokeDasharray={fraction === 0 ? undefined : "4 6"}
                  />
                  <text
                    x={LEFT - 8}
                    y={y + 4}
                    textAnchor="end"
                    fill="#7d8496"
                    fontSize="12"
                  >
                    {Math.round(maxPpm * fraction)}
                  </text>
                </g>
              );
            })}

            {ticks.map((point) => (
              <text
                key={point.second}
                x={point.x}
                y={HEIGHT - 8}
                textAnchor="middle"
                fill="#7d8496"
                fontSize="12"
              >
                {formatSecond(point.second)}
              </text>
            ))}

            <path d={area} fill="url(#result-chart-fill)" />
            <path
              d={line}
              fill="none"
              stroke={LINE_COLOR}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Erros: um × no ponto do segundo em que aconteceram. */}
            {points
              .filter((point) => point.errors > 0)
              .map((point) => (
                <g
                  key={`error-${point.second}`}
                  stroke={ERROR_COLOR}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <line
                    x1={point.x - 5}
                    y1={point.y - 5}
                    x2={point.x + 5}
                    y2={point.y + 5}
                  />
                  <line
                    x1={point.x - 5}
                    y1={point.y + 5}
                    x2={point.x + 5}
                    y2={point.y - 5}
                  />
                </g>
              ))}

            {active && (
              <g pointerEvents="none">
                <line
                  x1={active.x}
                  y1={TOP}
                  x2={active.x}
                  y2={bottom}
                  stroke="rgba(255,255,255,0.35)"
                  strokeWidth="1"
                />
                <circle
                  cx={active.x}
                  cy={active.y}
                  r="5"
                  fill={LINE_COLOR}
                  stroke="#15171d"
                  strokeWidth="2"
                />
              </g>
            )}
          </svg>

          {active && (
            <Box
              role="status"
              sx={{
                position: "absolute",
                top: 4,
                left: `${(active.x / WIDTH) * 100}%`,
                transform:
                  active.x > WIDTH * 0.7
                    ? "translateX(calc(-100% - 12px))"
                    : "translateX(12px)",
                px: 1.25,
                py: 0.75,
                borderRadius: 2,
                backgroundColor: "rgba(24, 27, 33, 0.96)",
                border: "1px solid #343844",
                pointerEvents: "none",
                whiteSpace: "nowrap",
              }}
            >
              <Typography
                sx={{ color: "#ffffff", fontWeight: 800, fontSize: 15 }}
              >
                {active.ppm} PPM
              </Typography>
              <Typography sx={{ color: "#a0a4ad", fontSize: 12 }}>
                {formatSecond(active.second)}
                {active.errors > 0 &&
                  ` · ${active.errors} ${active.errors === 1 ? "erro" : "erros"}`}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
