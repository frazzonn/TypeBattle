// Estilos e ícones aceitos para as tags (o frontend desenha cada um).
export const TAG_STYLES = [
  "classic",
  "solid",
  "outline",
  "gradient",
  "neon",
  "rainbow",
  "shimmer",
  "gold",
  "diamond",
  "pulse",
  "fire",
  "holo",
  "terminal",
] as const;

export const TAG_ICONS = [
  "code",
  "bolt",
  "star",
  "shield",
  "heart",
  "fire",
  "trophy",
  "premium",
  "verified",
  "diamond",
  "keyboard",
] as const;

export function isTagStyle(value: unknown): value is (typeof TAG_STYLES)[number] {
  return typeof value === "string" && (TAG_STYLES as readonly string[]).includes(value);
}

export function isTagIcon(value: unknown): value is (typeof TAG_ICONS)[number] {
  return typeof value === "string" && (TAG_ICONS as readonly string[]).includes(value);
}
