import { useMemo, useState } from "react";
import {
  Box,
  Button,
  ButtonGroup,
  Card,
  CardContent,
  Typography,
} from "@mui/material";

interface TypingResult {
  id: number;
  ppm: number;
  accuracy: number;
  errors: number;
  characters: number;
  duration: number;
  createdAt: string;
}

interface PerformanceEvolutionProps {
  results: TypingResult[];
}

type DurationFilter = "all" | 15 | 30 | 60;

interface ChartPoint {
  x: number;
  y: number;
  value: number;
}

const WIDTH = 800;
const HEIGHT = 280;
const LEFT = 55;
const RIGHT = 25;
const TOP = 25;
const BOTTOM = 42;

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function pointsFor(values: number[], min: number, max: number): ChartPoint[] {
  const chartWidth = WIDTH - LEFT - RIGHT;
  const chartHeight = HEIGHT - TOP - BOTTOM;
  const range = Math.max(max - min, 1);

  return values.map((value, index) => ({
    x:
      values.length === 1
        ? LEFT + chartWidth / 2
        : LEFT + (index / (values.length - 1)) * chartWidth,
    y: TOP + chartHeight - ((value - min) / range) * chartHeight,
    value,
  }));
}

function linePath(points: ChartPoint[]) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

interface LineChartProps {
  title: string;
  subtitle: string;
  values: number[];
  labels: string[];
  suffix: string;
  color: string;
  min: number;
  max: number;
}

function LineChart({
  title,
  subtitle,
  values,
  labels,
  suffix,
  color,
  min,
  max,
}: LineChartProps) {
  const points = pointsFor(values, min, max);
  const path = linePath(points);
  const chartHeight = HEIGHT - TOP - BOTTOM;
  const bottom = HEIGHT - BOTTOM;
  const chartRight = WIDTH - RIGHT;
  const gradientId = `gradient-${title.replace(/[^a-zA-Z]/g, "")}`;
  const area =
    points.length > 1
      ? `${path} L ${points[points.length - 1].x} ${bottom} L ${points[0].x} ${bottom} Z`
      : "";

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      color={color}
      latest={
        values.at(-1) !== undefined ? `${values.at(-1)}${suffix}` : undefined
      }
    >
      {values.length === 0 ? (
        <EmptyChart />
      ) : (
        <Box sx={{ width: "100%", overflowX: "auto" }}>
          <Box sx={{ minWidth: values.length > 8 ? 520 : 0 }}>
            <svg
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              width="100%"
              role="img"
              aria-label={title}
              style={{ display: "block" }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={color} stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {Array.from({ length: 5 }, (_, index) => {
                const value = max - (index / 4) * (max - min);
                const y = TOP + (index / 4) * chartHeight;

                return (
                  <g key={index}>
                    <line
                      x1={LEFT}
                      y1={y}
                      x2={chartRight}
                      y2={y}
                      stroke="rgba(174,183,220,0.12)"
                      strokeDasharray="4 6"
                    />
                    <text
                      x={LEFT - 10}
                      y={y + 4}
                      textAnchor="end"
                      fill="#929bb9"
                      fontSize="12"
                    >
                      {Math.round(value)}
                      {suffix}
                    </text>
                  </g>
                );
              })}

              {points.length > 1 && (
                <path d={area} fill={`url(#${gradientId})`} />
              )}

              {points.length > 1 && (
                <path
                  d={path}
                  fill="none"
                  stroke={color}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {points.map((point, index) => (
                <g key={`${labels[index]}-${index}`}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="6"
                    fill={color}
                    opacity="0.2"
                  />
                  <circle cx={point.x} cy={point.y} r="3" fill={color}>
                    <title>
                      {`${point.value}${suffix} em ${labels[index]}`}
                    </title>
                  </circle>

                  {(values.length <= 8 ||
                    index === 0 ||
                    index === points.length - 1 ||
                    index % Math.ceil(values.length / 6) === 0) && (
                    <text
                      x={point.x}
                      y={HEIGHT - 14}
                      textAnchor="middle"
                      fill="#929bb9"
                      fontSize="11"
                    >
                      {labels[index]}
                    </text>
                  )}
                </g>
              ))}
            </svg>
          </Box>
        </Box>
      )}
    </ChartCard>
  );
}

interface BarChartProps {
  title: string;
  subtitle: string;
  values: number[];
  labels: string[];
  color: string;
}

function BarChart({ title, subtitle, values, labels, color }: BarChartProps) {
  const max = Math.max(...values, 1);
  const chartHeight = HEIGHT - TOP - BOTTOM;
  const chartWidth = WIDTH - LEFT - RIGHT;
  const slotWidth = chartWidth / Math.max(values.length, 1);
  const barWidth = Math.min(32, slotWidth * 0.58);

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      color={color}
      latest={values.length ? String(values[values.length - 1]) : undefined}
    >
      {values.length === 0 ? (
        <EmptyChart />
      ) : (
        <Box sx={{ width: "100%", overflowX: "auto" }}>
          <Box sx={{ minWidth: values.length > 8 ? 520 : 0 }}>
            <svg
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              width="100%"
              role="img"
              aria-label={title}
              style={{ display: "block" }}
            >
              {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
                const y = TOP + chartHeight * (1 - fraction);

                return (
                  <g key={fraction}>
                    <line
                      x1={LEFT}
                      y1={y}
                      x2={WIDTH - RIGHT}
                      y2={y}
                      stroke="rgba(174,183,220,0.12)"
                      strokeDasharray="4 6"
                    />
                    <text
                      x={LEFT - 10}
                      y={y + 4}
                      textAnchor="end"
                      fill="#929bb9"
                      fontSize="12"
                    >
                      {Math.round(max * fraction)}
                    </text>
                  </g>
                );
              })}

              {values.map((value, index) => {
                const barHeight = (value / max) * chartHeight;
                const x = LEFT + slotWidth * index + (slotWidth - barWidth) / 2;
                const y = TOP + chartHeight - barHeight;

                return (
                  <g key={`${labels[index]}-${index}`}>
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(barHeight, 2)}
                      rx="5"
                      fill={color}
                      opacity="0.85"
                    >
                      <title>{`${value} em ${labels[index]}`}</title>
                    </rect>

                    {(values.length <= 8 ||
                      index === 0 ||
                      index === values.length - 1 ||
                      index % Math.ceil(values.length / 6) === 0) && (
                      <text
                        x={x + barWidth / 2}
                        y={HEIGHT - 14}
                        textAnchor="middle"
                        fill="#929bb9"
                        fontSize="11"
                      >
                        {labels[index]}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </Box>
        </Box>
      )}
    </ChartCard>
  );
}

function ChartCard({
  title,
  subtitle,
  color,
  latest,
  children,
}: {
  title: string;
  subtitle: string;
  color: string;
  latest?: string;
  children: React.ReactNode;
}) {
  return (
    <Card
      elevation={0}
      sx={{
        height: "100%",
        minWidth: 0,
        bgcolor: "rgba(15,20,43,0.78)",
        backgroundImage: "none",
        border: "1px solid rgba(142,117,255,0.19)",
        borderRadius: 3,
        transition: "border-color 180ms ease",
        "&:hover": { borderColor: `${color}75` },
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5 }, "&:last-child": { pb: 2.5 } }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 2,
            mb: 2,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700, color: "#f0edff" }}>
              {title}
            </Typography>
            <Typography variant="caption" sx={{ color: "#929bb9" }}>
              {subtitle}
            </Typography>
          </Box>

          {latest !== undefined && (
            <Typography
              sx={{
                fontSize: "1.35rem",
                fontWeight: 800,
                color,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {latest}
            </Typography>
          )}
        </Box>

        {children}
      </CardContent>
    </Card>
  );
}

function EmptyChart() {
  return (
    <Box
      sx={{
        minHeight: 200,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 1,
        color: "#929bb9",
        textAlign: "center",
      }}
    >
      <Typography sx={{ fontSize: 30, color: "#a78bfa" }}>⌁</Typography>
      <Typography sx={{ fontWeight: 600 }}>Sem dados neste período</Typography>
      <Typography variant="body2">
        Complete um teste para começar seu histórico.
      </Typography>
    </Box>
  );
}

export default function PerformanceEvolution({
  results,
}: PerformanceEvolutionProps) {
  const [durationFilter, setDurationFilter] = useState<DurationFilter>("all");

  const filteredResults = useMemo(() => {
    const sorted = [...results].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    const filtered =
      durationFilter === "all"
        ? sorted
        : sorted.filter((result) => result.duration === durationFilter);

    return filtered.slice(-30);
  }, [results, durationFilter]);

  const ppm = filteredResults.map((result) => result.ppm);
  const accuracy = filteredResults.map((result) => result.accuracy);
  const errors = filteredResults.map((result) => result.errors);
  const characters = filteredResults.map((result) => result.characters);
  const labels = filteredResults.map((result) => formatDate(result.createdAt));

  const ppmMin =
    ppm.length > 0 ? Math.max(0, Math.floor(Math.min(...ppm) - 10)) : 0;
  const ppmMax = ppm.length > 0 ? Math.ceil(Math.max(...ppm) + 10) : 100;

  const accuracyMin =
    accuracy.length > 0
      ? Math.max(0, Math.floor(Math.min(...accuracy) - 5))
      : 0;
  const accuracyMax =
    accuracy.length > 0
      ? Math.min(100, Math.ceil(Math.max(...accuracy) + 5))
      : 100;

  const filterOptions: { label: string; value: DurationFilter }[] = [
    { label: "Todos", value: "all" },
    { label: "15s", value: 15 },
    { label: "30s", value: 30 },
    { label: "60s", value: 60 },
  ];

  return (
    <Card
      elevation={0}
      sx={{
        mt: 3,
        bgcolor: "transparent",
        backgroundImage: "none",
        border: "1px solid rgba(142,117,255,0.16)",
        borderRadius: 4,
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 3 }, "&:last-child": { pb: 3 } }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "flex-start", sm: "center" },
            justifyContent: "space-between",
            gap: 2,
            mb: 3,
          }}
        >
          <Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                letterSpacing: "-0.5px",
                color: "text.primary",
              }}
            >
              Evolução de desempenho
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Velocidade, precisão e consistência dos seus testes.
            </Typography>
          </Box>

          <Box sx={{ maxWidth: "100%", overflowX: "auto" }}>
            <ButtonGroup
              variant="outlined"
              size="small"
              sx={{
                "& .MuiButton-root": {
                  textTransform: "none",
                  minWidth: 48,
                  borderColor: "rgba(142,117,255,0.25)",
                  color: "text.secondary",
                  whiteSpace: "nowrap",
                },
                "& .MuiButton-root.MuiButton-contained": {
                  color: "#fff",
                  bgcolor: "#7047eb",
                  borderColor: "#7047eb",
                  "&:hover": { bgcolor: "#825eff" },
                },
              }}
            >
              {filterOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={
                    durationFilter === option.value ? "contained" : "outlined"
                  }
                  onClick={() => setDurationFilter(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </ButtonGroup>
          </Box>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(2, minmax(0, 1fr))",
            },
            gap: 2,
          }}
        >
          <LineChart
            title="Evolução do PPM"
            subtitle="Palavras por minuto"
            values={ppm}
            labels={labels}
            min={ppmMin}
            max={ppmMax}
            suffix=""
            color="#a78bfa"
          />

          <LineChart
            title="Evolução da precisão"
            subtitle="Percentual de acertos"
            values={accuracy}
            labels={labels}
            min={accuracyMin}
            max={accuracyMax}
            suffix="%"
            color="#38bdf8"
          />

          <BarChart
            title="Erros por teste"
            subtitle="Quantidade de erros em cada tentativa"
            values={errors}
            labels={labels}
            color="#fb7185"
          />

          <BarChart
            title="Caracteres digitados"
            subtitle="Volume de digitação em cada teste"
            values={characters}
            labels={labels}
            color="#a78bfa"
          />
        </Box>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 2 }}
        >
          Exibindo até os últimos 30 testes
        </Typography>
      </CardContent>
    </Card>
  );
}
