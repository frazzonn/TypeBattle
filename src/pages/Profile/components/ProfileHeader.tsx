import { useRef, useState } from "react";
import type { ChangeEvent, MouseEvent } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Divider,
  Menu,
  MenuItem,
  Paper,
  Typography,
} from "@mui/material";

import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";

import { useAuth } from "../../../contexts/useAuth";
import { uploadAvatar, removeAvatar } from "../../../services/api";
import { panelSx } from "../styles";

const MAX_PHOTO_SIZE = 5 * 1024 * 1024;

// Cartão do topo do perfil: foto, dados da conta e botão de sair.
export function ProfileHeader() {
  const { user, token, logout, updateAvatar } = useAuth();

  const [photoError, setPhotoError] = useState("");
  const [photoSuccess, setPhotoSuccess] = useState("");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const [photoMenuAnchor, setPhotoMenuAnchor] = useState<HTMLElement | null>(
    null,
  );

  const photoInputRef = useRef<HTMLInputElement>(null);
  const isPhotoMenuOpen = Boolean(photoMenuAnchor);

  function handleOpenPhotoMenu(event: MouseEvent<HTMLElement>) {
    if (isUploadingPhoto) return;

    setPhotoError("");
    setPhotoSuccess("");
    setPhotoMenuAnchor(event.currentTarget);
  }

  function handleClosePhotoMenu() {
    setPhotoMenuAnchor(null);
  }

  function handleChoosePhoto() {
    handleClosePhotoMenu();
    photoInputRef.current?.click();
  }

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    // Permite escolher o mesmo arquivo novamente.
    event.target.value = "";

    if (!file) return;

    setPhotoError("");
    setPhotoSuccess("");

    if (!file.type.startsWith("image/")) {
      setPhotoError("Selecione um arquivo de imagem válido.");
      return;
    }

    if (file.size > MAX_PHOTO_SIZE) {
      setPhotoError("A imagem deve ter no máximo 5 MB.");
      return;
    }

    if (!token) {
      setPhotoError("Sua sessão expirou. Entre novamente na sua conta.");
      return;
    }

    try {
      setIsUploadingPhoto(true);

      const response = await uploadAvatar(file, token);
      updateAvatar(response.avatarUrl);

      setPhotoSuccess("Foto de perfil atualizada com sucesso.");
    } catch (error) {
      console.error("Erro ao enviar foto de perfil:", error);

      setPhotoError(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar sua foto de perfil.",
      );
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  async function handleRemovePhoto() {
    handleClosePhotoMenu();
    setPhotoError("");
    setPhotoSuccess("");

    if (!token) {
      setPhotoError("Sua sessão expirou. Entre novamente na sua conta.");
      return;
    }

    try {
      setIsUploadingPhoto(true);

      await removeAvatar(token);

      // Limpa a foto e volta a mostrar o ícone de câmera.
      updateAvatar(null);

      setPhotoSuccess("Foto de perfil removida com sucesso.");
    } catch (error) {
      console.error("Erro ao remover foto de perfil:", error);

      setPhotoError(
        error instanceof Error
          ? error.message
          : "Não foi possível remover sua foto de perfil.",
      );
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  return (
    <Paper
      elevation={0}
      sx={{
        ...panelSx,
        position: "relative",
        overflow: "hidden",
        p: { xs: 2.5, sm: 4 },
        background:
          "linear-gradient(125deg, rgba(126, 87, 194, 0.20), rgba(126, 87, 194, 0.04) 55%, transparent)",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          width: 220,
          height: 220,
          borderRadius: "50%",
          bgcolor: "rgba(167, 139, 250, 0.07)",
          filter: "blur(2px)",
          top: -125,
          right: -50,
          pointerEvents: "none",
        }}
      />

      <Box
        sx={{
          position: "relative",
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2,
        }}
      >
        {/* O contêiner mantém o avatar fixo e posiciona o indicador. */}
        <Box
          sx={{
            position: "relative",
            flexShrink: 0,
            width: { xs: 82, sm: 104 },
            height: { xs: 82, sm: 104 },
          }}
        >
          <Avatar
            component="button"
            type="button"
            src={user?.avatarUrl || undefined}
            alt={`Foto de perfil de ${user?.name || "jogador"}`}
            onClick={handleOpenPhotoMenu}
            aria-label="Opções da foto de perfil"
            aria-haspopup="menu"
            aria-expanded={isPhotoMenuOpen ? "true" : undefined}
            sx={{
              // Evita que os estilos padrão do botão desloquem o avatar.
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%",
              minWidth: 0,
              p: 0,
              m: 0,
              appearance: "none",
              boxSizing: "border-box",
              fontFamily: "inherit",
              fontSize: { xs: 32, sm: 42 },
              fontWeight: 800,
              lineHeight: 1,
              bgcolor: "primary.main",
              color: "#fff",
              border: "3px solid rgba(167, 139, 250, 0.55)",
              boxShadow: "0 0 28px rgba(126, 87, 194, 0.25)",
              cursor: isUploadingPhoto ? "wait" : "pointer",
              overflow: "hidden",
              flexShrink: 0,

              "& .MuiAvatar-img": {
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center",
                borderRadius: "50%",
              },

              "&:hover": {
                filter: "brightness(1.1)",
              },

              "&:focus-visible": {
                outline: "2px solid",
                outlineColor: "primary.light",
                outlineOffset: 4,
              },
            }}
          >
            {!user?.avatarUrl && (
              <PhotoCameraOutlinedIcon
                sx={{
                  display: "block",
                  fontSize: { xs: 36, sm: 44 },
                  color: "#e9d5ff",
                  pointerEvents: "none",
                }}
              />
            )}
          </Avatar>

          {/* Indicador de câmera sobreposto, sem ocupar espaço extra. */}
          <Box
            sx={{
              position: "absolute",
              right: 2,
              bottom: 2,
              width: 30,
              height: 30,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "#7e57c2",
              color: "#fff",
              border: "2px solid",
              borderColor: "background.paper",
              boxSizing: "border-box",
              pointerEvents: "none",
              zIndex: 1,
            }}
          >
            <PhotoCameraOutlinedIcon sx={{ fontSize: 16 }} />
          </Box>

          {isUploadingPhoto && (
            <CircularProgress
              size={32}
              sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                color: "#fff",
                zIndex: 2,
                pointerEvents: "none",
              }}
            />
          )}

          <input
            ref={photoInputRef}
            hidden
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            disabled={isUploadingPhoto}
          />

          <Menu
            anchorEl={photoMenuAnchor}
            open={isPhotoMenuOpen}
            onClose={handleClosePhotoMenu}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "left",
            }}
            transformOrigin={{
              vertical: "top",
              horizontal: "left",
            }}
            slotProps={{
              paper: {
                sx: {
                  mt: 1,
                  minWidth: 190,
                  border: "1px solid",
                  borderColor: "rgba(155, 109, 255, 0.2)",
                  borderRadius: 2,
                  boxShadow: "0 8px 28px rgba(0, 0, 0, 0.25)",
                },
              },
            }}
          >
            <MenuItem onClick={handleChoosePhoto} disabled={isUploadingPhoto}>
              <PhotoCameraOutlinedIcon
                fontSize="small"
                sx={{ mr: 1.5, color: "text.secondary" }}
              />
              {user?.avatarUrl ? "Escolher outra foto" : "Adicionar foto"}
            </MenuItem>

            {user?.avatarUrl && (
              <>
                <Divider />
                <MenuItem
                  onClick={handleRemovePhoto}
                  disabled={isUploadingPhoto}
                  sx={{
                    color: "text.secondary",
                    fontSize: 14,
                    "&:hover": {
                      color: "error.main",
                    },
                  }}
                >
                  <Box
                    component="span"
                    sx={{
                      mr: 1.5,
                      fontSize: 18,
                      lineHeight: 1,
                    }}
                  >
                    🗑
                  </Box>
                  Remover foto
                </MenuItem>
              </>
            )}
          </Menu>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="overline"
            sx={{
              color: "primary.main",
              fontWeight: 800,
              letterSpacing: 2,
            }}
          >
            TYPEBATTLE / JOGADOR
          </Typography>

          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              letterSpacing: "-1px",
              overflowWrap: "anywhere",
            }}
          >
            {user?.name || "Meu perfil"}
          </Typography>

          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            {user?.email || "E-mail não disponível"}
          </Typography>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 1 }}
          >
            ID do jogador: {user?.id ?? "—"}
          </Typography>

          {photoError && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {photoError}
            </Alert>
          )}

          {photoSuccess && (
            <Alert severity="success" sx={{ mt: 1 }}>
              {photoSuccess}
            </Alert>
          )}
        </Box>

        <Button
          variant="outlined"
          color="error"
          onClick={logout}
          sx={{
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 700,
            px: 2.5,
            alignSelf: { xs: "stretch", sm: "center" },
          }}
        >
          Sair da conta
        </Button>
      </Box>
    </Paper>
  );
}
