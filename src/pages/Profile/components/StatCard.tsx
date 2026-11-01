import { Paper, Typography } from "@mui/material";

import { panelSx } from "../styles";

interface StatCardProps {
  label: string;
  value: string | number;
  description?: string;
  accent?: string;
}

export function StatCard({
  label,
  value,
  description,
  accent = "#a78bfa",
}: StatCardProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        ...panelSx,
        position: "relative",
        overflow: "hidden",
        p: 2.5,
        minWidth: 0,
        transition: "transform 180ms ease, border-color 180ms ease",
        "&:hover": {
          transform: "translateY(-3px)",
          borderColor: accent,
        },
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: 3,
          bgcolor: accent,
        },
      }}
    >
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ fontWeight: 600, mb: 2 }}
      >
        {label}
      </Typography>

      <Typography
        variant="h4"
        sx={{
          fontWeight: 800,
          letterSpacing: "-1px",
          color: accent,
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </Typography>

      {description && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 1 }}
        >
          {description}
        </Typography>
      )}
    </Paper>
  );
}
