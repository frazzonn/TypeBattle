import { useMemo, useState } from "react";
import {
  Box,
  Button,
  ButtonGroup,
  Card,
  CardContent,
  Stack,
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

const CHART_WIDTH = 800;
const CHART_HEIGHT = 280;

const PADDING_LEFT = 55;
const PADDING_RIGHT = 25;
const PADDING_TOP = 25;
const PADDING_BOTTOM = 45;

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function createPoints(
  values: number[],
  minValue: number,
  maxValue: number,
): ChartPoint[] {
  if (values.length === 0) {
    return [];
  }

  const chartWidth = CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT;

  const chartHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

  const range = Math.max(maxValue - minValue, 1);

  return values.map((value, index) => {
    const x =
      values.length === 1
        ? PADDING_LEFT + chartWidth / 2
        : PADDING_LEFT + (index / (values.length - 1)) * chartWidth;

    const y =
      PADDING_TOP + chartHeight - ((value - minValue) / range) * chartHeight;

    return {
      x,
      y,
      value,
    };
  });
}

function createLinePath(points: ChartPoint[]) {
  if (points.length === 0) {
    return "";
  }

  return points
    .map((point, index) => {
      return `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`;
    })
    .join(" ");
}

interface ChartProps {
  title: string;
  values: number[];
  labels: string[];
  minValue: number;
  maxValue: number;
  suffix: string;
}

function Chart({
  title,
  values,
  labels,
  minValue,
  maxValue,
  suffix,
}: ChartProps) {
  const points = createPoints(values, minValue, maxValue);

  const linePath = createLinePath(points);

  const chartHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

  const gridValues = [
    maxValue,
    minValue + (maxValue - minValue) * 0.75,
    minValue + (maxValue - minValue) * 0.5,
    minValue + (maxValue - minValue) * 0.25,
    minValue,
  ];

  if (values.length === 0) {
    return (
      <Box>
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 700,
            mb: 2,
          }}
        >
          {title}
        </Typography>

        <Box
          sx={{
            height: 280,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography color="text.secondary">
            Ainda não existem dados suficientes.
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Typography
        variant="subtitle1"
        sx={{
          fontWeight: 700,
          mb: 2,
        }}
      >
        {title}
      </Typography>

      <Box
        sx={{
          width: "100%",
          overflowX: "auto",
        }}
      >
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          width="100%"
          height="280"
          role="img"
          aria-label={title}
        >
          {/* Linhas horizontais do gráfico */}
          {gridValues.map((value, index) => {
            const y =
              PADDING_TOP + (index / (gridValues.length - 1)) * chartHeight;

            return (
              <g key={index}>
                <line
                  x1={PADDING_LEFT}
                  y1={y}
                  x2={CHART_WIDTH - PADDING_RIGHT}
                  y2={y}
                  stroke="rgba(255,255,255,0.10)"
                  strokeWidth="1"
                />

                <text
                  x={PADDING_LEFT - 10}
                  y={y + 4}
                  textAnchor="end"
                  fill="#a0a4ad"
                  fontSize="11"
                >
                  {Math.round(value)}
                  {suffix}
                </text>
              </g>
            );
          })}

          {/* Linha principal */}
          <path
            d={linePath}
            fill="none"
            stroke="#7c4dff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Pontos dos testes */}
          {points.map((point, index) => (
            <g key={index}>
              <circle cx={point.x} cy={point.y} r="5" fill="#7c4dff" />

              <circle cx={point.x} cy={point.y} r="2" fill="#ffffff" />

              <text
                x={point.x}
                y={point.y - 12}
                textAnchor="middle"
                fill="#ffffff"
                fontSize="11"
                fontWeight="700"
              >
                {point.value}
                {suffix}
              </text>

              <text
                x={point.x}
                y={CHART_HEIGHT - 18}
                textAnchor="middle"
                fill="#a0a4ad"
                fontSize="10"
              >
                {labels[index]}
              </text>
            </g>
          ))}
        </svg>
      </Box>
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

    if (durationFilter === "all") {
      return sorted;
    }

    return sorted.filter((result) => result.duration === durationFilter);
  }, [results, durationFilter]);

  const ppmValues = filteredResults.map((result) => result.ppm);

  const accuracyValues = filteredResults.map((result) => result.accuracy);

  const labels = filteredResults.map((result) => formatDate(result.createdAt));

  const ppmMin =
    ppmValues.length > 0 ? Math.max(0, Math.min(...ppmValues) - 10) : 0;

  const ppmMax = ppmValues.length > 0 ? Math.max(...ppmValues) + 10 : 100;

  const accuracyMin =
    accuracyValues.length > 0
      ? Math.max(0, Math.min(...accuracyValues) - 10)
      : 0;

  const accuracyMax =
    accuracyValues.length > 0
      ? Math.min(100, Math.max(...accuracyValues) + 10)
      : 100;

  return (
    <Card sx={{ mt: 3 }}>
      <CardContent>
        {/* Cabeçalho da seção */}
        <Box
          sx={{
            mb: 3,
          }}
        >
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
            }}
          >
            Evolução de desempenho
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 0.5,
            }}
          >
            Acompanhe sua evolução ao longo dos testes.
          </Typography>
        </Box>

        {/* Filtros */}
        <Box
          sx={{
            mb: 4,
            overflowX: "auto",
          }}
        >
          <ButtonGroup variant="outlined" size="small">
            <Button
              variant={durationFilter === "all" ? "contained" : "outlined"}
              onClick={() => setDurationFilter("all")}
            >
              Todos
            </Button>

            <Button
              variant={durationFilter === 15 ? "contained" : "outlined"}
              onClick={() => setDurationFilter(15)}
            >
              15s
            </Button>

            <Button
              variant={durationFilter === 30 ? "contained" : "outlined"}
              onClick={() => setDurationFilter(30)}
            >
              30s
            </Button>

            <Button
              variant={durationFilter === 60 ? "contained" : "outlined"}
              onClick={() => setDurationFilter(60)}
            >
              60s
            </Button>
          </ButtonGroup>
        </Box>

        {/* Gráficos */}
        <Stack spacing={5}>
          <Chart
            title="Evolução do PPM"
            values={ppmValues}
            labels={labels}
            minValue={ppmMin}
            maxValue={ppmMax}
            suffix=""
          />

          <Chart
            title="Evolução da precisão"
            values={accuracyValues}
            labels={labels}
            minValue={accuracyMin}
            maxValue={accuracyMax}
            suffix="%"
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
