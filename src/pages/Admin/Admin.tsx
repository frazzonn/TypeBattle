import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link as RouterLink, Navigate } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import SellRoundedIcon from "@mui/icons-material/SellRounded";

import { TAG_ICON_OPTIONS, TAG_STYLE_OPTIONS } from "../../components/tagOptions";
import { TagBadge } from "../../components/UserTags";
import { useAuth } from "../../contexts/useAuth";
import {
  addUserTag,
  createAdminTag,
  updateAdminTag,
  deleteAdminTag,
  getAdminTags,
  getAdminUsers,
  removeUserTag,
  type AdminTag,
  type AdminUser,
  type Tag,
} from "../../services/api";
import { panelSx } from "../Profile/styles";

// Cores prontas para escolher rápido; dá para usar qualquer outra.
const PRESET_COLORS = [
  "#a78bfa",
  "#60a5fa",
  "#34d399",
  "#fbbf24",
  "#f87171",
  "#f472b6",
  "#22d3ee",
  "#e5e7eb",
];

const TAG_NAME_MAX = 20;

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function StatusDot({ label, color }: { label: string; color: string }) {
  return (
    <Box
      component="span"
      sx={{
        ml: 0.75,
        px: 0.6,
        borderRadius: 0.75,
        fontSize: "0.68rem",
        fontWeight: 800,
        color,
        border: `1px solid ${color}66`,
        verticalAlign: "middle",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </Box>
  );
}

export function Admin() {
  const { user, token } = useAuth();

  const [tags, setTags] = useState<AdminTag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [newStyle, setNewStyle] = useState<string>("classic");
  const [newIcon, setNewIcon] = useState<string | null>(null);
  // Tag sendo editada (null = criando uma nova).
  const [editingId, setEditingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ anchor: HTMLElement; userId: number } | null>(
    null,
  );

  const isAdmin = Boolean(user?.isAdmin && token);

  useEffect(() => {
    if (!isAdmin || !token) return;
    let active = true;

    getAdminTags(token)
      .then((response) => active && setTags(response.tags))
      .catch((err: unknown) => active && setError(getErrorMessage(err, "Erro ao carregar tags.")))
      .finally(() => active && setTagsLoading(false));

    return () => {
      active = false;
    };
  }, [isAdmin, token]);

  // Busca com uma pequena espera para não chamar a API a cada letra.
  useEffect(() => {
    if (!isAdmin || !token) return;
    let active = true;

    const timer = window.setTimeout(() => {
      setUsersLoading(true);
      getAdminUsers(search.trim(), token)
        .then((response) => active && setUsers(response.users))
        .catch(
          (err: unknown) =>
            active && setError(getErrorMessage(err, "Erro ao carregar usuários.")),
        )
        .finally(() => active && setUsersLoading(false));
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [isAdmin, token, search]);

  const menuUser = useMemo(
    () => users.find((item) => item.id === menu?.userId) ?? null,
    [users, menu],
  );
  const menuTags = useMemo(
    () => tags.filter((tag) => !menuUser?.tags.some((owned) => owned.id === tag.id)),
    [tags, menuUser],
  );

  if (!isAdmin || !token) {
    return <Navigate to="/" replace />;
  }

  // Atualiza as tags de um usuário na lista e a contagem de cada tag.
  function applyUserTags(userId: number, nextTags: Tag[]) {
    const previous = users.find((item) => item.id === userId)?.tags ?? [];

    setUsers((current) =>
      current.map((item) => (item.id === userId ? { ...item, tags: nextTags } : item)),
    );
    setTags((current) =>
      current.map((tag) => {
        const had = previous.some((owned) => owned.id === tag.id);
        const has = nextTags.some((owned) => owned.id === tag.id);
        return had === has ? tag : { ...tag, users: tag.users + (has ? 1 : -1) };
      }),
    );
  }

  function resetForm() {
    setEditingId(null);
    setNewName("");
    setNewColor(PRESET_COLORS[0]);
    setNewStyle("classic");
    setNewIcon(null);
  }

  function startEditing(tag: AdminTag) {
    setEditingId(tag.id);
    setNewName(tag.name);
    setNewColor(tag.color);
    setNewStyle(tag.style ?? "classic");
    setNewIcon(tag.icon ?? null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSaveTag(event: FormEvent) {
    event.preventDefault();
    const name = newName.trim();
    if (!name || !token) return;

    const data = { name, color: newColor, style: newStyle, icon: newIcon };
    setCreating(true);
    setError(null);
    try {
      if (editingId !== null) {
        const { tag } = await updateAdminTag(editingId, data, token);
        setTags((current) =>
          current
            .map((item) => (item.id === tag.id ? { ...item, ...tag } : item))
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
        // Atualiza a tag também nos usuários da lista.
        setUsers((current) =>
          current.map((item) => ({
            ...item,
            tags: item.tags.map((owned) => (owned.id === tag.id ? tag : owned)),
          })),
        );
      } else {
        const { tag } = await createAdminTag(data, token);
        setTags((current) =>
          [...current, tag].sort((a, b) => a.name.localeCompare(b.name)),
        );
      }
      resetForm();
    } catch (err) {
      setError(getErrorMessage(err, "Erro ao salvar tag."));
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteTag(tag: AdminTag) {
    if (!token) return;
    const who = tag.users === 1 ? "1 usuário" : `${tag.users} usuários`;
    const message =
      tag.users > 0
        ? `Apagar a tag "${tag.name}"? Ela sai de ${who}.`
        : `Apagar a tag "${tag.name}"?`;
    if (!window.confirm(message)) return;

    setError(null);
    try {
      await deleteAdminTag(tag.id, token);
      setTags((current) => current.filter((item) => item.id !== tag.id));
      setUsers((current) =>
        current.map((item) => ({
          ...item,
          tags: item.tags.filter((owned) => owned.id !== tag.id),
        })),
      );
    } catch (err) {
      setError(getErrorMessage(err, "Erro ao apagar tag."));
    }
  }

  async function handleAddTag(userId: number, tagId: number) {
    setMenu(null);
    if (!token) return;

    setError(null);
    try {
      const response = await addUserTag(userId, tagId, token);
      applyUserTags(userId, response.tags);
    } catch (err) {
      setError(getErrorMessage(err, "Erro ao colocar tag."));
    }
  }

  async function handleRemoveTag(userId: number, tagId: number) {
    if (!token) return;

    setError(null);
    try {
      const response = await removeUserTag(userId, tagId, token);
      applyUserTags(userId, response.tags);
    } catch (err) {
      setError(getErrorMessage(err, "Erro ao tirar tag."));
    }
  }

  const previewName = newName.trim() || "Prévia";
  const previewTag: Tag = {
    id: 0,
    name: previewName,
    color: newColor,
    style: newStyle,
    icon: newIcon,
  };
  const styleUsesColor =
    TAG_STYLE_OPTIONS.find((option) => option.id === newStyle)?.usesColor ?? true;

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 1180,
        mx: "auto",
        px: { xs: 2, md: 3 },
        py: { xs: 3, md: 5 },
        boxSizing: "border-box",
      }}
    >
      <Typography
        variant="overline"
        sx={{ color: "primary.main", fontWeight: 800, letterSpacing: 2 }}
      >
        TYPEBATTLE / ADMIN
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-1px", flex: 1 }}>
          Tags dos usuários
        </Typography>
        <Button component={RouterLink} to="/admin/cifra" variant="outlined" sx={{ borderColor: "#343844", color: "#d5d7de" }}>
          Palavras da Cifra diária
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "380px 1fr" },
          gap: 2.5,
          alignItems: "start",
        }}
      >
        {/* Tags: criar e listar */}
        <Box sx={{ ...panelSx, p: 2.5 }}>
          <Typography sx={{ fontWeight: 800, mb: 2 }}>
            {editingId !== null ? "Editar tag" : "Criar tag"}
          </Typography>

          <Box component="form" onSubmit={handleSaveTag}>
            <TextField
              label="Nome"
              placeholder="Ex.: Dev, Adm, VIP"
              size="small"
              fullWidth
              value={newName}
              onChange={(event) => setNewName(event.target.value.slice(0, TAG_NAME_MAX))}
              helperText={`${newName.length}/${TAG_NAME_MAX}`}
            />

            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5, mb: 1 }}>
              Estilo
            </Typography>
            <Box
              role="radiogroup"
              aria-label="Estilo da tag"
              sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 0.75 }}
            >
              {TAG_STYLE_OPTIONS.map((option) => {
                const selected = newStyle === option.id;
                return (
                  <Box
                    key={option.id}
                    component="button"
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={option.label}
                    title={option.label}
                    onClick={() => setNewStyle(option.id)}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: 0,
                      height: 36,
                      px: 0.5,
                      cursor: "pointer",
                      borderRadius: 1.5,
                      backgroundColor: selected ? "rgba(167,139,250,0.14)" : "rgba(255,255,255,0.03)",
                      border: "1px solid",
                      borderColor: selected ? "primary.main" : "rgba(255,255,255,0.08)",
                      "&:hover": { borderColor: "rgba(167,139,250,0.5)" },
                      "&:focus-visible": { outline: "2px solid #a78bfa", outlineOffset: 2 },
                    }}
                  >
                    <TagBadge
                      tag={{ id: 0, name: option.label, color: newColor, style: option.id, icon: null }}
                    />
                  </Box>
                );
              })}
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5, mb: 1 }}>
              Cor {!styleUsesColor && "(este estilo tem cores próprias)"}
            </Typography>
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 0.875,
                alignItems: "center",
                opacity: styleUsesColor ? 1 : 0.35,
                pointerEvents: styleUsesColor ? "auto" : "none",
              }}
            >
              {PRESET_COLORS.map((color) => (
                <Box
                  key={color}
                  component="button"
                  type="button"
                  aria-label={`Cor ${color}`}
                  aria-pressed={newColor === color}
                  onClick={() => setNewColor(color)}
                  sx={{
                    width: 26,
                    height: 26,
                    p: 0,
                    borderRadius: "50%",
                    cursor: "pointer",
                    backgroundColor: color,
                    border: "2px solid",
                    borderColor: newColor === color ? "#fff" : "transparent",
                    outline: newColor === color ? `2px solid ${color}` : "none",
                    outlineOffset: 1,
                  }}
                />
              ))}
              <Tooltip title="Outra cor">
                <Box
                  component="input"
                  type="color"
                  aria-label="Escolher outra cor"
                  value={newColor}
                  onChange={(event) => setNewColor(event.target.value.toLowerCase())}
                  sx={{
                    width: 26,
                    height: 26,
                    p: 0,
                    border: "2px dashed rgba(255,255,255,0.45)",
                    borderRadius: "50%",
                    background: "none",
                    cursor: "pointer",
                    overflow: "hidden",
                    "&::-webkit-color-swatch-wrapper": { p: 0 },
                    "&::-webkit-color-swatch": { border: "none", borderRadius: "50%" },
                    "&::-moz-color-swatch": { border: "none", borderRadius: "50%" },
                  }}
                />
              </Tooltip>
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5, mb: 0.5 }}>
              Ícone
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.25 }}>
              <Tooltip title="Sem ícone">
                <IconButton
                  size="small"
                  aria-label="Sem ícone"
                  aria-pressed={newIcon === null}
                  onClick={() => setNewIcon(null)}
                  sx={{
                    color: newIcon === null ? "primary.main" : "text.secondary",
                    backgroundColor: newIcon === null ? "rgba(167,139,250,0.14)" : "transparent",
                  }}
                >
                  <BlockRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              {TAG_ICON_OPTIONS.map(({ id, label, icon: Icon }) => (
                <Tooltip key={id} title={label}>
                  <IconButton
                    size="small"
                    aria-label={`Ícone ${label}`}
                    aria-pressed={newIcon === id}
                    onClick={() => setNewIcon(id)}
                    sx={{
                      color: newIcon === id ? "primary.main" : "text.secondary",
                      backgroundColor: newIcon === id ? "rgba(167,139,250,0.14)" : "transparent",
                    }}
                  >
                    <Icon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ))}
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 1,
                mt: 2.5,
              }}
            >
              <TagBadge tag={previewTag} size="medium" />
              <Box sx={{ display: "flex", gap: 1 }}>
                {editingId !== null && (
                  <Button onClick={resetForm} disabled={creating} sx={{ textTransform: "none" }}>
                    Cancelar
                  </Button>
                )}
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={
                    creating ? <CircularProgress size={16} color="inherit" /> : editingId !== null ? null : <AddRoundedIcon />
                  }
                  disabled={!newName.trim() || creating}
                  sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}
                >
                  {editingId !== null ? "Salvar" : "Criar"}
                </Button>
              </Box>
            </Box>
          </Box>

          <Box sx={{ borderTop: "1px solid rgba(255,255,255,0.08)", mt: 2.5, pt: 2 }}>
            <Typography sx={{ fontWeight: 800, mb: 1.5 }}>
              Tags criadas {tags.length > 0 && `(${tags.length})`}
            </Typography>

            {tagsLoading ? (
              <CircularProgress size={22} />
            ) : tags.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Nenhuma tag ainda. Crie a primeira acima.
              </Typography>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                {tags.map((tag) => (
                  <Box
                    key={tag.id}
                    sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.25 }}
                  >
                    <TagBadge tag={tag} size="medium" />
                    <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                      {tag.users === 1 ? "1 usuário" : `${tag.users} usuários`}
                    </Typography>
                    <Tooltip title="Editar tag">
                      <IconButton
                        size="small"
                        aria-label={`Editar a tag ${tag.name}`}
                        onClick={() => startEditing(tag)}
                        sx={{ color: editingId === tag.id ? "primary.main" : "text.secondary" }}
                      >
                        <EditRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Apagar tag">
                      <IconButton
                        size="small"
                        aria-label={`Apagar a tag ${tag.name}`}
                        onClick={() => handleDeleteTag(tag)}
                        sx={{ color: "#e87986" }}
                      >
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Box>

        {/* Usuários: buscar e colocar/tirar tags */}
        <Box sx={{ ...panelSx, p: 2.5, minWidth: 0 }}>
          <TextField
            placeholder="Buscar por nome ou e-mail"
            size="small"
            fullWidth
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: usersLoading ? (
                  <InputAdornment position="end">
                    <CircularProgress size={16} />
                  </InputAdornment>
                ) : undefined,
              },
            }}
            sx={{ mb: 2 }}
          />

          {!usersLoading && users.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              Nenhum usuário encontrado.
            </Typography>
          )}

          <Box sx={{ display: "flex", flexDirection: "column" }}>
            {users.map((item) => (
              <Box
                key={item.id}
                sx={{
                  display: "flex",
                  alignItems: { xs: "flex-start", sm: "center" },
                  gap: 1.5,
                  py: 1.25,
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  "&:first-of-type": { borderTop: "none" },
                }}
              >
                <Avatar
                  src={item.avatarUrl ?? undefined}
                  alt={item.name}
                  sx={{
                    width: 38,
                    height: 38,
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    color: "#e9ddff",
                    backgroundColor: "rgba(167,139,250,0.15)",
                  }}
                >
                  {getInitials(item.name)}
                </Avatar>

                <Box
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    alignItems: { xs: "flex-start", sm: "center" },
                    gap: { xs: 0.75, sm: 1.5 },
                  }}
                >
                  <Box sx={{ minWidth: 0, flex: { sm: "0 0 220px" } }}>
                    <Typography
                      component={RouterLink}
                      to={`/jogador/${item.id}`}
                      sx={{
                        display: "inline",
                        fontWeight: 700,
                        overflowWrap: "anywhere",
                        color: "inherit",
                        textDecoration: "none",
                        "&:hover": { color: "primary.main", textDecoration: "underline" },
                      }}
                    >
                      {item.name}
                    </Typography>
                    {item.banned && <StatusDot label="banido" color="#f87171" />}
                    {!item.emailVerified && <StatusDot label="não confirmado" color="#fbbf24" />}
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", overflowWrap: "anywhere" }}
                    >
                      {item.email}
                    </Typography>
                  </Box>

                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, alignItems: "center", flex: 1 }}>
                    {item.tags.map((tag) => (
                      <TagBadge
                        key={tag.id}
                        tag={tag}
                        size="medium"
                        onRemove={() => handleRemoveTag(item.id, tag.id)}
                        removeLabel={`Tirar ${tag.name} de ${item.name}`}
                      />
                    ))}
                    <Button
                      size="small"
                      startIcon={<SellRoundedIcon sx={{ fontSize: "15px !important" }} />}
                      onClick={(event) => setMenu({ anchor: event.currentTarget, userId: item.id })}
                      disabled={tags.length === 0}
                      sx={{
                        minHeight: 26,
                        py: 0,
                        px: 1,
                        textTransform: "none",
                        fontWeight: 700,
                        fontSize: "0.78rem",
                        borderRadius: 1,
                        border: "1px dashed rgba(167,139,250,0.4)",
                      }}
                    >
                      Tag
                    </Button>
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      <Menu anchorEl={menu?.anchor} open={Boolean(menu)} onClose={() => setMenu(null)}>
        {menuTags.length === 0 ? (
          <MenuItem disabled>Já tem todas as tags</MenuItem>
        ) : (
          menuTags.map((tag) => (
            <MenuItem key={tag.id} onClick={() => menu && handleAddTag(menu.userId, tag.id)}>
              <TagBadge tag={tag} size="medium" />
            </MenuItem>
          ))
        )}
      </Menu>
    </Box>
  );
}
