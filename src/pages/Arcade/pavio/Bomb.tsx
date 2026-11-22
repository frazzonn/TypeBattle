import { useId } from "react";
import { Box } from "@mui/material";
import { keyframes } from "@mui/material/styles";

const MONO_FONT = "'JetBrains Mono', ui-monospace, monospace";

// Bomba preta com contorno roxo e pavio trançado lilás. Desenhada em SVG
// (coordenadas de 0 a 1000, centro da bomba em 500,500) e animada só com CSS.

const CENTER = 500;
const RIM_RADIUS = 292;
const BODY_RADIUS = 275;
// Área do SVG: a bomba, o pavio e a chama.
const VIEW = { x: 180, y: 40, width: 640, height: 760 };

const RIM = "#a98bff";
const FUSE_OUTLINE = "#7c5fc7";
const FUSE_FILL = "#e9e1fb";
const FUSE_STRIPE = "#a98be6";
const ERROR = "#ff5c7a";

// ---------------------------------------------------------------- pavio

// Curva do pavio (Catmull-Rom pelos pontos), da bomba até a ponta.
const FUSE_POINTS: Array<[number, number]> = [
  [512, 276], [498, 226], [512, 166], [558, 120], [620, 108], [682, 148], [728, 204],
];

function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

const fuse = (() => {
  const points: Array<[number, number]> = [];
  const n = FUSE_POINTS.length;
  for (let i = 0; i < n - 1; i += 1) {
    const p0 = FUSE_POINTS[Math.max(i - 1, 0)];
    const p1 = FUSE_POINTS[i];
    const p2 = FUSE_POINTS[i + 1];
    const p3 = FUSE_POINTS[Math.min(i + 2, n - 1)];
    for (let k = 0; k < 16; k += 1) {
      const t = k / 16;
      points.push([catmullRom(p0[0], p1[0], p2[0], p3[0], t), catmullRom(p0[1], p1[1], p2[1], p3[1], t)]);
    }
  }
  points.push(FUSE_POINTS[n - 1]);
  const lengths = [0];
  for (let i = 1; i < points.length; i += 1) {
    const [ax, ay] = points[i - 1];
    const [bx, by] = points[i];
    lengths.push(lengths[i - 1] + Math.hypot(bx - ax, by - ay));
  }
  return { points, lengths, total: lengths[lengths.length - 1] };
})();

// Ponto e direção a "length" unidades do começo do pavio.
function pointAt(length: number) {
  const { points, lengths } = fuse;
  const target = Math.max(0, Math.min(fuse.total, length));
  let i = 1;
  while (i < lengths.length - 1 && lengths[i] < target) i += 1;
  const [ax, ay] = points[i - 1];
  const [bx, by] = points[i];
  const segment = lengths[i] - lengths[i - 1] || 1;
  const k = (target - lengths[i - 1]) / segment;
  const distance = Math.hypot(bx - ax, by - ay) || 1;
  return { x: ax + (bx - ax) * k, y: ay + (by - ay) * k, tx: (bx - ax) / distance, ty: (by - ay) / distance };
}

function fusePath(length: number): string {
  const { points, lengths } = fuse;
  const parts = [`M${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`];
  for (let i = 1; i < points.length && lengths[i] < length; i += 1) {
    parts.push(`L${points[i][0].toFixed(1)} ${points[i][1].toFixed(1)}`);
  }
  const end = pointAt(length);
  parts.push(`L${end.x.toFixed(1)} ${end.y.toFixed(1)}`);
  return parts.join(" ");
}

// Listras da trança, atravessando o pavio a cada 34 unidades.
function fuseStripes(length: number): string[] {
  const stripes: string[] = [];
  for (let s = 18; s < length - 24; s += 34) {
    const q = pointAt(s);
    const nx = -q.ty;
    const ny = q.tx;
    stripes.push(
      `M${(q.x - nx * 22 - q.tx * 9).toFixed(1)} ${(q.y - ny * 22 - q.ty * 9).toFixed(1)} ` +
        `L${(q.x + nx * 22 + q.tx * 9).toFixed(1)} ${(q.y + ny * 22 + q.ty * 9).toFixed(1)}`,
    );
  }
  return stripes;
}

// ---------------------------------------------------------------- rachaduras e cacos

// Números fixos (sem Math.random) para o desenho não mudar a cada render.
function seeded(seed: number) {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

const CRACKS = (() => {
  const random = seeded(7);
  return Array.from({ length: 9 }, (_, i) => {
    let angle = (i / 9) * Math.PI * 2 + (random() - 0.5) * 0.4;
    let radius = 30;
    const parts = [`M${CENTER} ${CENTER}`];
    while (radius < BODY_RADIUS) {
      radius += 26 + random() * 16;
      angle += (random() - 0.5) * 0.32;
      parts.push(`L${(CENTER + Math.cos(angle) * radius).toFixed(1)} ${(CENTER + Math.sin(angle) * radius).toFixed(1)}`);
    }
    return parts.join(" ");
  });
})();

const SHARDS = (() => {
  const random = seeded(23);
  return Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2 + (random() - 0.5) * 0.5;
    const distance = 360 + random() * 260;
    const corners = 3 + Math.floor(random() * 2);
    const points = Array.from({ length: corners }, (_, j) => {
      const a = (j / corners) * Math.PI * 2 + (random() - 0.5) * 0.6;
      const r = 22 + random() * 26;
      return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`;
    }).join(" ");
    return {
      points,
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance + 120,
      spin: (random() - 0.5) * 540,
    };
  });
})();

// ---------------------------------------------------------------- animações

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.045); }
`;
const shake = keyframes`
  0%, 100% { transform: translate(0, 0); }
  25% { transform: translate(-6px, 4px); }
  75% { transform: translate(6px, -4px); }
`;
const flicker = keyframes`
  0%, 100% { transform: scale(1, 1); }
  30% { transform: scale(.9, 1.12); }
  60% { transform: scale(1.08, .92); }
`;
const rise = keyframes`
  0% { transform: translate(0, 0); opacity: 1; }
  100% { transform: translate(var(--dx), -90px); opacity: 0; }
`;
const flash = keyframes`
  0% { transform: scale(.3); opacity: 1; }
  60% { opacity: .85; }
  100% { transform: scale(1.5); opacity: 0; }
`;
const ring = keyframes`
  0% { transform: scale(1); opacity: .9; stroke-width: 36px; }
  100% { transform: scale(2.6); opacity: 0; stroke-width: 2px; }
`;
const fly = keyframes`
  0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
  75% { opacity: 1; }
  100% { transform: translate(var(--dx), var(--dy)) rotate(var(--spin)); opacity: 0; }
`;
const fadeBody = keyframes`
  0% { opacity: 1; }
  100% { opacity: 0; }
`;

const NO_MOTION = { "@media (prefers-reduced-motion: reduce)": { animation: "none" } };
// Transformações em volta de um ponto do desenho (e não da caixa do elemento).
const around = (x: number, y: number) => ({ transformBox: "view-box", transformOrigin: `${x}px ${y}px` });

// ---------------------------------------------------------------- componente

interface BombProps {
  syllable: string | null;
  // 0 = calma, 1 = quase explodindo (o pavio encurta, a bomba pulsa e fica roxa).
  tension: number;
  exploded?: boolean;
  // Erro na última tentativa: a sílaba pisca em vermelho.
  error?: boolean;
  size?: number;
}

export function Bomb({ syllable, tension, exploded = false, error = false, size = 140 }: BombProps) {
  const id = useId().replace(/:/g, "");
  const t = Math.max(0, Math.min(1, tension));

  // O pavio queima até sobrar um toquinho.
  const fuseLength = fuse.total * (1 - 0.85 * t);
  const tip = pointAt(fuseLength);
  // Roxo por dentro e rachaduras só no fim.
  const tint = Math.max(0, (t - 0.55) / 0.45) * 0.8;
  const crack = Math.max(0, (t - 0.82) / 0.18);
  const glow = 0.25 + 0.6 * t;
  const pulseSeconds = 1 - 0.7 * t;

  return (
    <Box
      aria-hidden="true"
      sx={{ position: "relative", width: size, height: (size * VIEW.height) / VIEW.width }}
    >
      <Box
        component="svg"
        viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.width} ${VIEW.height}`}
        sx={{ width: "100%", height: "100%", overflow: "visible", display: "block" }}
      >
        <defs>
          <radialGradient id={`${id}-body`} cx="545" cy="345" r="470" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#4b484e" />
            <stop offset=".3" stopColor="#2a292b" />
            <stop offset=".7" stopColor="#171617" />
            <stop offset="1" stopColor="#0b0b0c" />
          </radialGradient>
          <radialGradient id={`${id}-tint`} cx={CENTER} cy={CENTER} r={BODY_RADIUS + 10} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#d7a0ff" />
            <stop offset=".5" stopColor="#9650f5" />
            <stop offset="1" stopColor="#5f28c8" />
          </radialGradient>
          <radialGradient id={`${id}-flash`}>
            <stop offset="0" stopColor="#ffffff" />
            <stop offset=".22" stopColor="#e8cdff" stopOpacity=".95" />
            <stop offset=".5" stopColor="#aa5fff" stopOpacity=".75" />
            <stop offset=".82" stopColor="#5a23d2" stopOpacity=".4" />
            <stop offset="1" stopColor="#3c14a0" stopOpacity="0" />
          </radialGradient>
          <clipPath id={`${id}-clip`}>
            <circle cx={CENTER} cy={CENTER} r={BODY_RADIUS} />
          </clipPath>
        </defs>

        {/* Bomba: treme no fim e some na explosão */}
        <Box
          component="g"
          sx={{
            animation: exploded
              ? `${fadeBody} 250ms ease-out forwards`
              : t > 0.8
                ? `${shake} 0.12s linear infinite`
                : "none",
            ...NO_MOTION,
          }}
        >
          <Box
            component="g"
            sx={{
              ...around(CENTER, CENTER),
              animation: t > 0.3 && !exploded ? `${pulse} ${pulseSeconds}s ease-in-out infinite` : "none",
              ...NO_MOTION,
            }}
          >
            {/* Contorno roxo com brilho */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RIM_RADIUS}
              fill={RIM}
              style={{ filter: `drop-shadow(0 0 ${30 + 60 * t}px rgba(170,110,255,${glow}))` }}
            />
            <circle cx={CENTER} cy={CENTER} r={BODY_RADIUS} fill={`url(#${id}-body)`} />
            {tint > 0 && (
              <circle cx={CENTER} cy={CENTER} r={BODY_RADIUS} fill={`url(#${id}-tint)`} opacity={tint} />
            )}
            {crack > 0 && (
              <g clipPath={`url(#${id}-clip)`} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={crack}>
                {CRACKS.map((path) => (
                  <g key={path}>
                    <path d={path} stroke="rgba(150,80,255,.4)" strokeWidth={18} />
                    <path d={path} stroke="rgba(240,222,255,.95)" strokeWidth={6} />
                  </g>
                ))}
              </g>
            )}
            <circle cx={CENTER} cy={CENTER} r={BODY_RADIUS - 2} fill="none" stroke="rgba(0,0,0,.3)" strokeWidth={4} />

            {/* Sílaba */}
            <text
              x={CENTER}
              y={CENTER + 8}
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily={MONO_FONT}
              fontWeight={800}
              fontSize={150}
              letterSpacing={8}
              fill={error ? ERROR : "#ffffff"}
              style={{ textTransform: "uppercase", transition: "fill 120ms ease" }}
            >
              {syllable ?? ""}
            </text>
          </Box>

          {/* Pavio trançado, queimando da ponta para a bomba */}
          {!exploded && (
            <g fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d={fusePath(fuseLength)} stroke={FUSE_OUTLINE} strokeWidth={72} />
              <path d={fusePath(fuseLength)} stroke={FUSE_FILL} strokeWidth={48} />
              <path d={fusePath(fuseLength)} stroke="rgba(255,255,255,.55)" strokeWidth={16} />
              <g stroke={FUSE_STRIPE} strokeWidth={7} strokeLinecap="butt">
                {fuseStripes(fuseLength).map((d) => (
                  <path key={d} d={d} />
                ))}
              </g>
              {/* Ponta queimada */}
              <path d={`M${pointAt(fuseLength - 18).x} ${pointAt(fuseLength - 18).y} L${tip.x} ${tip.y}`} stroke="#3a2670" strokeWidth={72} />
              <path d={`M${pointAt(fuseLength - 18).x} ${pointAt(fuseLength - 18).y} L${tip.x} ${tip.y}`} stroke="#150d2b" strokeWidth={46} />
            </g>
          )}
        </Box>

        {/* Chama roxa e faíscas na ponta do pavio */}
        {!exploded && (
          <g transform={`translate(${tip.x} ${tip.y + 4})`}>
            <Box
              component="g"
              sx={{
                // Balança a partir da base da chama.
                transformBox: "fill-box",
                transformOrigin: "50% 100%",
                animation: `${flicker} ${0.28 - 0.12 * t}s ease-in-out infinite`,
                ...NO_MOTION,
              }}
            >
              <path d={flamePath(100, 36)} fill="rgba(122,53,232,.85)" style={{ filter: "drop-shadow(0 0 18px rgba(160,90,255,.9))" }} />
              <path d={flamePath(72, 25)} fill="rgba(185,131,255,.9)" />
              <path d={flamePath(44, 14)} fill="rgba(244,234,255,.95)" />
            </Box>
            {[-34, 10, 40].map((dx, i) => (
              <Box
                key={dx}
                component="circle"
                cx={0}
                cy={-10}
                r={5}
                fill="#e8d4ff"
                sx={{
                  "--dx": `${dx}px`,
                  animation: `${rise} ${0.7 + i * 0.15}s ease-out ${i * 0.2}s infinite`,
                  ...NO_MOTION,
                }}
              />
            ))}
          </g>
        )}

        {/* Explosão: clarão, ondas e cacos da bomba */}
        {exploded && (
          <g>
            <Box
              component="circle"
              cx={CENTER}
              cy={CENTER}
              r={420}
              fill={`url(#${id}-flash)`}
              sx={{ ...around(CENTER, CENTER), animation: `${flash} 800ms ease-out forwards` }}
            />
            {[0, 120, 240].map((delay) => (
              <Box
                key={delay}
                component="circle"
                cx={CENTER}
                cy={CENTER}
                r={RIM_RADIUS}
                fill="none"
                stroke="rgba(205,170,255,.9)"
                sx={{
                  ...around(CENTER, CENTER),
                  opacity: 0,
                  animation: `${ring} 900ms ease-out ${delay}ms forwards`,
                }}
              />
            ))}
            {SHARDS.map((shard) => (
              <g key={shard.points} transform={`translate(${CENTER} ${CENTER})`}>
                <Box
                  component="polygon"
                  points={shard.points}
                  fill="#161517"
                  stroke={RIM}
                  strokeWidth={4}
                  strokeLinejoin="round"
                  sx={{
                    "--dx": `${shard.dx}px`,
                    "--dy": `${shard.dy}px`,
                    "--spin": `${shard.spin}deg`,
                    transformBox: "fill-box",
                    transformOrigin: "center",
                    animation: `${fly} 1100ms cubic-bezier(.2,.7,.4,1) forwards`,
                  }}
                />
              </g>
            ))}
          </g>
        )}
      </Box>
    </Box>
  );
}

// Gota de chama apontando para cima, com a base em 0,0.
function flamePath(height: number, width: number): string {
  const h = height;
  const w = width;
  return (
    `M${-w} ${-h * 0.25} ` +
    `C${-w} ${-h * 0.6} ${0} ${-h * 0.7} 0 ${-h} ` +
    `C${w * 1.05} ${-h * 0.65} ${w} ${-h * 0.45} ${w} ${-h * 0.25} ` +
    `C${w} ${h * 0.02} ${-w} ${h * 0.02} ${-w} ${-h * 0.25} Z`
  );
}
