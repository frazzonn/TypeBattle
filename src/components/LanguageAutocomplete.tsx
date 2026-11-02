import {
  Autocomplete,
  Box,
  TextField,
  createFilterOptions,
} from "@mui/material";
import type { SxProps, Theme } from "@mui/material";

import type { LanguageInfo } from "../data/languages";
import { DEFAULT_LANGUAGE, LANGUAGE_OPTIONS } from "../utils/textGenerator";

interface LanguageAutocompleteProps {
  value: string;
  disabled?: boolean;
  onChange: (code: string) => void;
  // Mesmo uso de aria-labelledby: aponta para o rótulo visível do campo.
  labelId?: string;
  // Nome acessível quando não há rótulo visível.
  ariaLabel?: string;
  inputSx?: SxProps<Theme>;
  // Idiomas que aparecem na lista mas não podem ser escolhidos agora.
  isOptionDisabled?: (option: LanguageInfo) => boolean;
}

// Busca pelo nome no idioma e em português, ignorando acentos
// ("ingles" acha English, "alemao" acha Deutsch).
const filterOptions = createFilterOptions<LanguageInfo>({
  stringify: (option) => `${option.label} ${option.name}`,
});

export function LanguageAutocomplete({
  value,
  disabled = false,
  onChange,
  labelId,
  ariaLabel,
  inputSx,
  isOptionDisabled,
}: LanguageAutocompleteProps) {
  const selected =
    LANGUAGE_OPTIONS.find((option) => option.code === value) ??
    LANGUAGE_OPTIONS.find((option) => option.code === DEFAULT_LANGUAGE)!;

  return (
    <Autocomplete
      size="small"
      options={LANGUAGE_OPTIONS}
      value={selected}
      disabled={disabled}
      disableClearable
      openOnFocus
      autoHighlight
      filterOptions={filterOptions}
      getOptionLabel={(option) => option.label}
      getOptionDisabled={isOptionDisabled}
      isOptionEqualToValue={(option, current) => option.code === current.code}
      onChange={(_, option) => {
        if (option && option.code !== value) onChange(option.code);
      }}
      noOptionsText="Nenhum idioma encontrado"
      slotProps={{ listbox: { sx: { maxHeight: 320 } } }}
      renderOption={({ key, ...props }, option) => (
        <Box component="li" key={key} {...props} sx={{ gap: 1 }}>
          {option.label}
          {option.name !== option.label && (
            <Box
              component="span"
              sx={{ color: "text.secondary", fontSize: 13 }}
            >
              {option.name}
            </Box>
          )}
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder="Buscar idioma"
          slotProps={{
            ...params.slotProps,
            htmlInput: {
              ...params.slotProps.htmlInput,
              "aria-labelledby": labelId,
              "aria-label": labelId ? undefined : ariaLabel,
            },
          }}
          sx={inputSx}
        />
      )}
    />
  );
}
