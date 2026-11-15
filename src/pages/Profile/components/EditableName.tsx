import { useState, type FormEvent } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import EditRoundedIcon from "@mui/icons-material/EditRounded";

import { useAuth } from "../../../contexts/useAuth";
import { updateMyName } from "../../../services/api";

const NAME_MAX = 50;

// Nome do jogador com um lápis para trocar.
export function EditableName() {
  const { user, token, updateName } = useAuth();

  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function startEditing() {
    setValue(user?.name ?? "");
    setError("");
    setEditing(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const name = value.trim();

    if (!name) {
      setError("Informe um nome.");
      return;
    }
    if (!token) return;
    if (name === user?.name) {
      setEditing(false);
      return;
    }

    try {
      setSaving(true);
      setError("");
      const response = await updateMyName(name, token);
      updateName(response.name);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível trocar o nome.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <Typography
          variant="h4"
          sx={{ fontWeight: 800, letterSpacing: "-1px", overflowWrap: "anywhere" }}
        >
          {user?.name || "Meu perfil"}
        </Typography>
        <Tooltip title="Trocar nome">
          <IconButton
            aria-label="Trocar nome"
            onClick={startEditing}
            size="small"
            sx={{ color: "text.secondary", "&:hover": { color: "primary.main" } }}
          >
            <EditRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 460 }}>
      <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start", flexWrap: "wrap" }}>
        <TextField
          autoFocus
          size="small"
          value={value}
          onChange={(event) => setValue(event.target.value.slice(0, NAME_MAX))}
          onKeyDown={(event) => event.key === "Escape" && setEditing(false)}
          helperText={`${value.length}/${NAME_MAX}`}
          slotProps={{ htmlInput: { "aria-label": "Novo nome" } }}
          sx={{ flex: "1 1 220px" }}
        />
        <Button
          type="submit"
          variant="contained"
          disabled={saving}
          sx={{ textTransform: "none", fontWeight: 700, minWidth: 84 }}
        >
          {saving ? <CircularProgress size={20} color="inherit" /> : "Salvar"}
        </Button>
        <Button
          onClick={() => setEditing(false)}
          disabled={saving}
          sx={{ textTransform: "none" }}
        >
          Cancelar
        </Button>
      </Box>
      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
}
