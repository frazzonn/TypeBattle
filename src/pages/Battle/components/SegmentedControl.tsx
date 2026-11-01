import { Box, ButtonBase, Typography } from "@mui/material";

import { colors, labelSx } from "../styles";

interface SegmentedOption<T> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface SegmentedControlProps<T> {
  label: string;
  value: T;
  options: SegmentedOption<T>[];
  disabled?: boolean;
  onChange: (value: T) => void;
}

// Grupo de opções lado a lado; a selecionada fica preenchida.
export function SegmentedControl<T extends string | number>({
  label,
  value,
  options,
  disabled = false,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <Box
      role="radiogroup"
      aria-label={label}
      sx={{ display: "flex", flexDirection: "column", gap: 1 }}
    >
      <Typography sx={labelSx}>{label.toUpperCase()}</Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
          gap: 0.5,
          p: 0.5,
          borderRadius: "10px",
          bgcolor: colors.background,
        }}
      >
        {options.map((option) => {
          const selected = option.value === value;
          const isDisabled = disabled || option.disabled;

          return (
            <ButtonBase
              key={option.value}
              role="radio"
              aria-checked={selected}
              disabled={isDisabled}
              onClick={() => {
                if (!selected) onChange(option.value);
              }}
              sx={{
                height: 40,
                borderRadius: "8px",
                fontFamily: "inherit",
                fontSize: 14,
                fontWeight: 700,
                bgcolor: selected ? colors.primary : "transparent",
                color: selected ? "#ffffff" : colors.textSecondary,
                opacity: isDisabled && !selected ? 0.45 : 1,
                transition: "background-color 150ms ease, color 150ms ease",
                "&:hover": {
                  bgcolor: selected ? colors.primary : "rgba(124,77,255,0.12)",
                },
                "&.Mui-disabled": {
                  color: selected ? "#ffffff" : colors.textSecondary,
                },
                "&.Mui-focusVisible": {
                  outline: `2px solid ${colors.accent}`,
                  outlineOffset: 2,
                },
              }}
            >
              {option.label}
            </ButtonBase>
          );
        })}
      </Box>
    </Box>
  );
}
