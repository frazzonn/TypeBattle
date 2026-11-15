import { useEffect, useState, type FormEvent } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Menu,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import DeleteForeverRoundedIcon from "@mui/icons-material/DeleteForeverRounded";
import LockOpenRoundedIcon from "@mui/icons-material/LockOpenRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import SellRoundedIcon from "@mui/icons-material/SellRounded";

import { TagBadge } from "../../components/UserTags";
import {
  addUserTag,
  deleteAdminUser,
  deleteAdminUserResults,
  getAdminTags,
  removeUserTag,
  updateAdminUser,
  type AdminTag,
  type AdminUserInfo,
  type Tag,
} from "../../services/api";
import { panelSx } from "../Profile/styles";

interface AdminUserControlsProps {
  userId: number;
  name: string;
  tags: Tag[];
  info: AdminUserInfo;
  token: string;
  onRenamed: (name: string) => void;
  onTagsChanged: (tags: Tag[]) => void;
  onBannedChanged: (banned: boolean) => void;
  onResultsCleared: () => void;
  onDeleted: () => void;
}

const buttonSx = { textTransform: "none", fontWeight: 700, borderRadius: 2 } as const;

function message(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

// Painel que só o admin vê no perfil de outro jogador.
export function AdminUserControls({
  userId,
  name,
  tags,
  info,
  token,
  onRenamed,
  onTagsChanged,
  onBannedChanged,
  onResultsCleared,
  onDeleted,
}: AdminUserControlsProps) {
  const [allTags, setAllTags] = useState<AdminTag[]>([]);
  const [tagMenu, setTagMenu] = useState<HTMLElement | null>(null);
  const [newName, setNewName] = useState(name);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  useEffect(() => {
    let active = true;
    getAdminTags(token)
      .then((response) => active && setAllTags(response.tags))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [token]);

  const missingTags = allTags.filter((tag) => !tags.some((owned) => owned.id === tag.id));

  async function run(key: string, action: () => Promise<void>, done: string) {
    setBusy(key);
    setError("");
    setSuccess("");
    try {
      await action();
      setSuccess(done);
    } catch (err) {
      setError(message(err, "Não foi possível concluir."));
    } finally {
      setBusy(null);
    }
  }

  function handleRename(event: FormEvent) {
    event.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed || trimmed === name) return;

    run(
      "rename",
      async () => {
        const response = await updateAdminUser(userId, { name: trimmed }, token);
        onRenamed(response.user.name);
      },
      "Nome alterado.",
    );
  }

  function handleAddTag(tagId: number) {
    setTagMenu(null);
    run(
      "tag",
      async () => onTagsChanged((await addUserTag(userId, tagId, token)).tags),
      "Tag colocada.",
    );
  }

  function handleRemoveTag(tagId: number) {
    run(
      "tag",
      async () => onTagsChanged((await removeUserTag(userId, tagId, token)).tags),
      "Tag removida.",
    );
  }

  function handleClearResults() {
    if (!window.confirm(`Apagar TODOS os resultados de ${name} (testes e battle)?`)) return;
    run(
      "clear",
      async () => {
        await deleteAdminUserResults(userId, token);
        onResultsCleared();
      },
      "Resultados apagados.",
    );
  }

  function handleToggleBan() {
    const banning = !info.banned;
    const question = banning
      ? `Banir ${name}? A conta não vai conseguir entrar e some do ranking.`
      : `Desbanir ${name}?`;
    if (!window.confirm(question)) return;

    run(
      "ban",
      async () => {
        await updateAdminUser(userId, { banned: banning }, token);
        onBannedChanged(banning);
      },
      banning ? "Conta banida." : "Conta liberada.",
    );
  }

  async function handleDelete() {
    setBusy("delete");
    setError("");
    try {
      await deleteAdminUser(userId, token);
      setDeleteOpen(false);
      onDeleted();
    } catch (err) {
      setError(message(err, "Não foi possível apagar a conta."));
      setDeleteOpen(false);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Paper
      elevation={0}
      sx={{
        ...panelSx,
        p: { xs: 2.5, sm: 3 },
        borderColor: "rgba(248, 113, 113, 0.28)",
        backgroundImage: "linear-gradient(135deg, rgba(248,113,113,0.05), transparent 45%)",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
        <AdminPanelSettingsRoundedIcon sx={{ color: "#f87171" }} />
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Controle do admin
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, overflowWrap: "anywhere" }}>
        {info.email}
        {" · "}
        {info.emailVerified ? "email confirmado" : "email não confirmado"}
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess("")} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: { xs: 2.5, md: 3 },
        }}
      >
        {/* Tags */}
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            TAGS
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, alignItems: "center", mt: 1 }}>
            {tags.map((tag) => (
              <TagBadge
                key={tag.id}
                tag={tag}
                size="medium"
                onRemove={() => handleRemoveTag(tag.id)}
              />
            ))}
            <Button
              size="small"
              startIcon={<SellRoundedIcon sx={{ fontSize: "15px !important" }} />}
              onClick={(event) => setTagMenu(event.currentTarget)}
              disabled={busy === "tag" || allTags.length === 0}
              sx={{
                ...buttonSx,
                minHeight: 26,
                py: 0,
                px: 1,
                fontSize: "0.78rem",
                borderRadius: 1,
                border: "1px dashed rgba(167,139,250,0.4)",
              }}
            >
              {allTags.length === 0 ? "Crie tags na aba Admin" : "Tag"}
            </Button>
          </Box>
          <Menu anchorEl={tagMenu} open={Boolean(tagMenu)} onClose={() => setTagMenu(null)}>
            {missingTags.length === 0 ? (
              <MenuItem disabled>Já tem todas as tags</MenuItem>
            ) : (
              missingTags.map((tag) => (
                <MenuItem key={tag.id} onClick={() => handleAddTag(tag.id)}>
                  <TagBadge tag={tag} size="medium" />
                </MenuItem>
              ))
            )}
          </Menu>
        </Box>

        {/* Nome */}
        <Box component="form" onSubmit={handleRename}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            NOME
          </Typography>
          <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
            <TextField
              size="small"
              fullWidth
              value={newName}
              onChange={(event) => setNewName(event.target.value.slice(0, 50))}
              slotProps={{ htmlInput: { "aria-label": "Novo nome do jogador" } }}
            />
            <Button
              type="submit"
              variant="outlined"
              disabled={busy === "rename" || !newName.trim() || newName.trim() === name}
              sx={{ ...buttonSx, flexShrink: 0 }}
            >
              {busy === "rename" ? <CircularProgress size={18} /> : "Salvar"}
            </Button>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 1.25,
          mt: 3,
          pt: 2.5,
          borderTop: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <Button
          variant="outlined"
          color="warning"
          startIcon={<RestartAltRoundedIcon />}
          onClick={handleClearResults}
          disabled={busy !== null}
          sx={buttonSx}
        >
          Zerar resultados
        </Button>

        <Button
          variant="outlined"
          color={info.banned ? "success" : "error"}
          startIcon={info.banned ? <LockOpenRoundedIcon /> : <BlockRoundedIcon />}
          onClick={handleToggleBan}
          disabled={busy !== null || (info.isAdmin && !info.banned)}
          sx={buttonSx}
        >
          {info.banned ? "Desbanir" : "Banir"}
        </Button>

        <Button
          variant="contained"
          color="error"
          startIcon={<DeleteForeverRoundedIcon />}
          onClick={() => {
            setDeleteConfirm("");
            setDeleteOpen(true);
          }}
          disabled={busy !== null || info.isAdmin}
          sx={{ ...buttonSx, ml: { sm: "auto" } }}
        >
          Apagar conta
        </Button>
      </Box>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Apagar a conta de {name}?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            A conta, a foto, os resultados e as tags somem de vez. Não dá para desfazer.
            Digite <strong>APAGAR</strong> para confirmar.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            size="small"
            value={deleteConfirm}
            onChange={(event) => setDeleteConfirm(event.target.value)}
            placeholder="APAGAR"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteOpen(false)} sx={buttonSx}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleteConfirm.trim().toUpperCase() !== "APAGAR" || busy === "delete"}
            sx={buttonSx}
          >
            {busy === "delete" ? <CircularProgress size={18} color="inherit" /> : "Apagar de vez"}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
