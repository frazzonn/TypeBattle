import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { Alert, Box, Button, Chip, CircularProgress, Stack, TextField, Typography } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

import { useAuth } from "../../contexts/useAuth";
import {
  getAdminCifra,
  resetAdminCifra,
  setAdminCifra,
  type AdminCifraDay,
  type AdminCifraMode,
} from "../../services/api";

const MONO_FONT = "'JetBrains Mono', ui-monospace, monospace";
const MUTED = "#a0a4ad";
const MODE_LABEL: Record<number, string> = { 1: "Diária", 2: "Dupla", 4: "Quarteto" };

const panelSx = {
  bgcolor: "#171923",
  border: "1px solid rgba(167, 139, 250, 0.16)",
  borderRadius: "14px",
};

function formatDay(date: string, today: string): string {
  const label = new Date(`${date}T12:00:00Z`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  });
  return date === today ? `Hoje · ${label}` : label;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

// Admin: palavras da Cifra diária dos próximos dias. Por padrão o sorteio é
// automático; aqui dá para escolher as palavras de um dia que ainda não chegou
// (ou de hoje, se ninguém jogou).
export function AdminCifra() {
  const { user, token } = useAuth();
  const isAdmin = Boolean(user?.isAdmin && token);
  const [today, setToday] = useState("");
  const [days, setDays] = useState<AdminCifraDay[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin || !token) return;
    let active = true;
    getAdminCifra(token, 21)
      .then((response) => {
        if (!active) return;
        setToday(response.today);
        setDays(response.days);
      })
      .catch((err: unknown) => active && setError(errorMessage(err, "Erro ao carregar os desafios.")));
    return () => {
      active = false;
    };
  }, [isAdmin, token]);

  if (!isAdmin || !token) return <Navigate to="/" replace />;

  function replaceMode(date: string, mode: AdminCifraMode) {
    setDays((current) =>
      current?.map((day) =>
        day.date === date
          ? { ...day, modes: day.modes.map((item) => (item.boards === mode.boards ? { ...item, ...mode } : item)) }
          : day,
      ) ?? null,
    );
  }

  return (
    <Box sx={{ width: "100%", maxWidth: 1100, mx: "auto", px: { xs: 2, md: 3 }, py: { xs: 3, md: 5 }, boxSizing: "border-box" }}>
      <Button component={Link} to="/admin" startIcon={<ArrowBackRoundedIcon />} size="small" sx={{ color: MUTED, px: 0.5 }}>
        Admin
      </Button>
      <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-1px", mt: 1 }}>
        Cifra diária
      </Typography>
      <Typography sx={{ color: MUTED, mb: 3, maxWidth: "70ch" }}>
        As palavras de cada dia são sorteadas sozinhas. Para escolher as suas, clique em editar e escreva as palavras
        de 5 letras (com ou sem acento). Um dia que já passou, ou o de hoje depois que alguém jogou, não muda mais.
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!days ? (
        <CircularProgress />
      ) : (
        <Stack spacing={2}>
          {days.map((day) => (
            <Box key={day.date} sx={{ ...panelSx, p: 2.5 }}>
              <Typography sx={{ fontWeight: 800, mb: 1.5, textTransform: "capitalize" }}>
                {formatDay(day.date, today)}
              </Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" }, gap: 1.5 }}>
                {day.modes.map((mode) => (
                  <ModeEditor
                    key={mode.boards}
                    date={day.date}
                    mode={mode}
                    locked={day.date < today || (day.date === today && mode.plays > 0)}
                    token={token}
                    onSaved={(saved) => replaceMode(day.date, saved)}
                  />
                ))}
              </Box>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}

interface ModeEditorProps {
  date: string;
  mode: AdminCifraMode;
  locked: boolean;
  token: string;
  onSaved: (mode: AdminCifraMode) => void;
}

function ModeEditor({ date, mode, locked, token, onSaved }: ModeEditorProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function open() {
    setValue(mode.words.join(" "));
    setError("");
    setEditing(true);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const words = value.split(/[\s,;]+/).filter(Boolean);
    setSaving(true);
    setError("");
    try {
      const saved = await setAdminCifra(date, mode.boards, words, token);
      onSaved({ ...mode, words: saved.words, custom: true });
      setEditing(false);
    } catch (err) {
      setError(errorMessage(err, "Não foi possível salvar."));
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    setSaving(true);
    setError("");
    try {
      const saved = await resetAdminCifra(date, mode.boards, token);
      onSaved({ ...mode, words: saved.words, custom: false });
      setEditing(false);
    } catch (err) {
      setError(errorMessage(err, "Não foi possível voltar ao automático."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box sx={{ bgcolor: "#12141a", borderRadius: "10px", p: 1.75, display: "flex", flexDirection: "column", gap: 1 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Typography sx={{ fontWeight: 700, flex: 1 }}>{MODE_LABEL[mode.boards]}</Typography>
        <Chip
          size="small"
          label={mode.custom ? "Escolhida" : "Automática"}
          sx={{
            height: 22,
            fontWeight: 700,
            bgcolor: mode.custom ? "rgba(124,77,255,0.22)" : "rgba(255,255,255,0.06)",
            color: mode.custom ? "#d6c8ff" : MUTED,
          }}
        />
        {mode.plays > 0 && (
          <Typography variant="caption" sx={{ color: MUTED }}>
            {mode.plays} {mode.plays === 1 ? "jogou" : "jogaram"}
          </Typography>
        )}
      </Stack>

      {editing ? (
        <Box component="form" onSubmit={save} sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <TextField
            size="small"
            autoFocus
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={mode.boards === 1 ? "termo" : "termo cabra ..."}
            helperText={`${mode.boards} palavra${mode.boards > 1 ? "s" : ""} de 5 letras, separadas por espaço`}
            slotProps={{ htmlInput: { style: { fontFamily: MONO_FONT, textTransform: "uppercase" } } }}
          />
          <Stack direction="row" spacing={1}>
            <Button type="submit" variant="contained" size="small" disabled={saving}>
              Salvar
            </Button>
            <Button size="small" onClick={() => setEditing(false)} disabled={saving} sx={{ color: MUTED }}>
              Cancelar
            </Button>
            {mode.custom && (
              <Button size="small" onClick={reset} disabled={saving} sx={{ ml: "auto !important", color: "#ff8aa0" }}>
                Voltar ao automático
              </Button>
            )}
          </Stack>
        </Box>
      ) : (
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1 }}>
          {mode.words.map((word) => (
            <Box
              key={word}
              sx={{
                px: 1,
                py: 0.25,
                borderRadius: "6px",
                fontFamily: MONO_FONT,
                fontWeight: 700,
                textTransform: "uppercase",
                bgcolor: "rgba(124,77,255,.14)",
                color: "#e4dcff",
              }}
            >
              {word}
            </Box>
          ))}
          <Box sx={{ flex: 1 }} />
          {locked ? (
            <LockOutlinedIcon sx={{ fontSize: 18, color: MUTED }} titleAccess="Não pode mais mudar" />
          ) : (
            <Button size="small" startIcon={<EditRoundedIcon />} onClick={open} sx={{ color: "#c9b6ff" }}>
              Editar
            </Button>
          )}
        </Stack>
      )}
      {error && (
        <Typography variant="body2" sx={{ color: "#ff8aa0" }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}
