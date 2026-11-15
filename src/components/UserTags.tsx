import type { ReactNode } from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import { keyframes, type SxProps, type Theme } from "@mui/material/styles";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

import type { Tag } from "../services/api";
import { TAG_ICON_OPTIONS } from "./tagOptions";

// ---------- Animações ----------

const slide = keyframes`to { background-position: 300% 0; }`;
const sweep = keyframes`
  0%, 35% { transform: translateX(-120%); }
  75%, 100% { transform: translateX(120%); }
`;
const flame = keyframes`from { background-position: 0 0; } to { background-position: 0 100%; }`;
const holo = keyframes`
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
`;
const blink = keyframes`50% { opacity: 0; }`;

function pulse(color: string) {
  return keyframes`
    0%, 100% { box-shadow: 0 0 0 0 ${color}00; }
    50% { box-shadow: 0 0 10px 2px ${color}8c; }
  `;
}

// Faixa de luz que atravessa a tag (brilho e diamante).
function sweepLayer(seconds: number, strength: number) {
  return {
    "&::after": {
      content: '""',
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      background: `linear-gradient(105deg, transparent 32%, rgba(255,255,255,${strength}) 50%, transparent 68%)`,
      transform: "translateX(-120%)",
      animation: `${sweep} ${seconds}s ease-in-out infinite`,
    },
  };
}

// Visual de cada estilo; c é a cor escolhida no admin (#rrggbb).
function styleSx(style: string, c: string): Record<string, unknown> {
  switch (style) {
    case "solid":
      return { color: "#14111f", backgroundColor: c };
    case "outline":
      return { color: c, border: `1.5px solid ${c}` };
    case "gradient":
      return {
        color: "#fff",
        background: "linear-gradient(110deg, #7c4dff, #ec4899)",
        textShadow: "0 1px 2px rgba(0,0,0,0.25)",
      };
    case "neon":
      return {
        color: "#e0fbff",
        backgroundColor: "rgba(34, 211, 238, 0.08)",
        border: "1px solid #22d3ee",
        boxShadow: "0 0 8px rgba(34,211,238,0.55), inset 0 0 6px rgba(34,211,238,0.25)",
        textShadow: "0 0 6px #22d3ee",
      };
    case "rainbow":
      return {
        color: "#fff",
        textShadow: "0 1px 2px rgba(0,0,0,0.35)",
        background:
          "linear-gradient(90deg, #f87171, #fbbf24, #34d399, #22d3ee, #a78bfa, #f472b6, #f87171)",
        backgroundSize: "300% 100%",
        animation: `${slide} 4s linear infinite`,
      };
    case "shimmer":
      return { color: "#14111f", backgroundColor: c, ...sweepLayer(2.6, 0.75) };
    case "gold":
      return {
        color: "#3b2700",
        background:
          "linear-gradient(135deg, #fff1b8 0%, #f6c445 28%, #b7791f 55%, #f6d365 78%, #fff1b8 100%)",
        border: "1px solid #f6d365",
        textShadow: "0 1px 0 rgba(255,255,255,0.45)",
      };
    case "diamond":
      return {
        color: "#1d2333",
        background:
          "linear-gradient(135deg, #ffffff 0%, #cfe8ff 25%, #9fb4d1 50%, #e8f4ff 75%, #b8c7dd 100%)",
        border: "1px solid #e6f2ff",
        ...sweepLayer(3.4, 0.9),
      };
    case "pulse":
      return {
        color: c,
        backgroundColor: `${c}29`,
        border: `1px solid ${c}`,
        animation: `${pulse(c)} 1.8s ease-in-out infinite`,
      };
    case "fire":
      return {
        color: "#fff7e6",
        textShadow: "0 1px 2px rgba(80,0,0,0.5)",
        background: "linear-gradient(0deg, #b91c1c, #f97316, #facc15, #f97316, #b91c1c)",
        backgroundSize: "100% 300%",
        animation: `${flame} 1.6s ease-in-out infinite alternate`,
      };
    case "holo":
      return {
        color: "#1a1033",
        background: "linear-gradient(120deg, #c4b5fd, #a5f3fc, #fbcfe8, #fde68a, #c4b5fd)",
        backgroundSize: "250% 250%",
        animation: `${holo} 5s ease-in-out infinite`,
        border: "1px solid rgba(255,255,255,0.6)",
      };
    case "terminal":
      return {
        color: "#4ade80",
        backgroundColor: "#05080a",
        border: "1px solid rgba(74, 222, 128, 0.45)",
        fontFamily: "'JetBrains Mono', ui-monospace, Consolas, monospace",
        letterSpacing: 0,
        textShadow: "0 0 6px rgba(74, 222, 128, 0.55)",
        // O cursor é um elemento logo depois do nome (antes do × de remover).
        "& .tag-cursor": {
          width: "0.5em",
          height: "1em",
          ml: "-1px",
          backgroundColor: "#4ade80",
          boxShadow: "0 0 6px rgba(74,222,128,0.6)",
          animation: `${blink} 1s steps(1) infinite`,
        },
      };
    default:
      // classic
      return { color: c, backgroundColor: `${c}22`, border: `1px solid ${c}55` };
  }
}

// ---------- Componentes ----------

interface TagBadgeProps {
  tag: Tag;
  size?: "small" | "medium";
  onRemove?: () => void;
  removeLabel?: string;
}

// Selo com o nome da tag, no estilo escolhido pelo admin.
export function TagBadge({ tag, size = "small", onRemove, removeLabel }: TagBadgeProps) {
  const small = size === "small";
  const style = tag.style ?? "classic";
  const IconComponent = TAG_ICON_OPTIONS.find((option) => option.id === tag.icon)?.icon;

  let prefix: ReactNode = null;
  if (style === "terminal") {
    prefix = (
      <Box component="span" sx={{ opacity: 0.75 }}>
        {"</>"}
      </Box>
    );
  }

  return (
    <Box
      component="span"
      sx={{
        position: "relative",
        overflow: "hidden",
        display: "inline-flex",
        alignItems: "center",
        gap: 0.4,
        height: small ? 20 : 26,
        px: small ? 0.75 : 1,
        pr: onRemove ? 0.25 : undefined,
        borderRadius: small ? "5px" : "6px",
        fontSize: small ? "0.68rem" : "0.8rem",
        fontWeight: 800,
        letterSpacing: "0.3px",
        lineHeight: 1,
        whiteSpace: "nowrap",
        verticalAlign: "middle",
        ...styleSx(style, tag.color),
        "@media (prefers-reduced-motion: reduce)": {
          animation: "none",
          "&::after, & .tag-cursor": { animation: "none" },
        },
      }}
    >
      {IconComponent && <IconComponent sx={{ fontSize: small ? 11 : 14 }} />}
      {prefix}
      {tag.name}
      {style === "terminal" && <Box component="span" className="tag-cursor" aria-hidden />}
      {onRemove && (
        <Tooltip title={removeLabel ?? `Tirar ${tag.name}`}>
          <IconButton
            size="small"
            aria-label={removeLabel ?? `Tirar a tag ${tag.name}`}
            onClick={onRemove}
            sx={{ p: 0.1, color: "inherit", "&:hover": { backgroundColor: "rgba(255,255,255,0.15)" } }}
          >
            <CloseRoundedIcon sx={{ fontSize: small ? 13 : 15 }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}

interface UserTagsProps {
  tags?: Tag[] | null;
  size?: "small" | "medium";
  sx?: SxProps<Theme>;
}

// Lista de tags de um usuário; não mostra nada se ele não tiver nenhuma.
export function UserTags({ tags, size, sx }: UserTagsProps) {
  if (!tags || tags.length === 0) return null;

  return (
    <Box
      component="span"
      sx={[
        { display: "inline-flex", flexWrap: "wrap", gap: 0.5, verticalAlign: "middle" },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {tags.map((tag) => (
        <TagBadge key={tag.id} tag={tag} size={size} />
      ))}
    </Box>
  );
}
