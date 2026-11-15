import { Box, IconButton, Tooltip } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import type { SxProps, Theme } from "@mui/material";

import type { Tag } from "../services/api";

interface TagBadgeProps {
  tag: Tag;
  size?: "small" | "medium";
  onRemove?: () => void;
  removeLabel?: string;
}

// Selo colorido com o nome da tag (ex.: Dev, Adm).
export function TagBadge({ tag, size = "small", onRemove, removeLabel }: TagBadgeProps) {
  const small = size === "small";

  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.25,
        height: small ? 20 : 26,
        px: small ? 0.75 : 1,
        pr: onRemove ? 0.25 : undefined,
        borderRadius: 1,
        fontSize: small ? "0.68rem" : "0.8rem",
        fontWeight: 800,
        letterSpacing: "0.3px",
        lineHeight: 1,
        whiteSpace: "nowrap",
        color: tag.color,
        backgroundColor: `${tag.color}22`,
        border: `1px solid ${tag.color}55`,
      }}
    >
      {tag.name}
      {onRemove && (
        <Tooltip title={removeLabel ?? `Tirar ${tag.name}`}>
          <IconButton
            size="small"
            aria-label={removeLabel ?? `Tirar a tag ${tag.name}`}
            onClick={onRemove}
            sx={{ p: 0.1, color: "inherit", "&:hover": { backgroundColor: `${tag.color}33` } }}
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
