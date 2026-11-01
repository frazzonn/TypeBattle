// Tokens visuais da Battle, alinhados ao tema do site.
export const colors = {
  background: "#0f1115",
  paper: "#181b21",
  primary: "#7c4dff",
  accent: "#a78bfa",
  accentSoft: "#ddd6fe",
  cyan: "#67e8f9",
  gold: "#fde047",
  textSecondary: "#a0a4ad",
  textMuted: "#d4d6dc",
  border: "rgba(255,255,255,0.06)",
  borderStrong: "rgba(255,255,255,0.12)",
};

export const monoFont =
  'ui-monospace, "Cascadia Code", "SF Mono", Consolas, "Liberation Mono", monospace';

export const cardSx = {
  borderRadius: "16px",
  bgcolor: colors.paper,
  border: `1px solid ${colors.border}`,
};

export const labelSx = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "1px",
  color: colors.textSecondary,
};

export const primaryButtonSx = {
  height: 52,
  borderRadius: "10px",
  fontWeight: 800,
  fontSize: 16,
  textTransform: "none",
  bgcolor: colors.primary,
  boxShadow: "none",
  "&:hover": { bgcolor: "#8f66ff", boxShadow: "none" },
  "&.Mui-disabled": { bgcolor: "#3a2f63", color: "#b9a7f5" },
};

export const ghostButtonSx = {
  height: 44,
  px: 2,
  borderRadius: "10px",
  fontWeight: 600,
  textTransform: "none",
  color: colors.textSecondary,
  borderColor: colors.borderStrong,
  "&:hover": { borderColor: colors.textSecondary, bgcolor: "transparent" },
};
