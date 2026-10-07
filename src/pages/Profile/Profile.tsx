import {
  Avatar,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { Logout } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../contexts/AuthContext";

export function Profile() {
  const navigate = useNavigate();

  const { user, logout } = useAuth();

  function handleLogout() {
    logout();

    // Volta para a página inicial após sair
    navigate("/");
  }

  // Segurança: perfil só deve existir para usuários autenticados
  if (!user) {
    return null;
  }

  return (
    <Box
      sx={{
        minHeight: "calc(100vh - 64px)",
        display: "flex",
        justifyContent: "center",
        px: 2,
        py: 6,
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 700,
        }}
      >
        <Stack spacing={3}>
          {/* Título */}
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
              }}
            >
              Meu perfil
            </Typography>

            <Typography
              variant="body1"
              color="text.secondary"
              sx={{
                mt: 0.5,
              }}
            >
              Gerencie suas informações no TypeBattle.
            </Typography>
          </Box>

          {/* Card principal */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, sm: 4 },
              border: "1px solid",
              borderColor: "divider",
              backgroundColor: "background.paper",
            }}
          >
            <Stack spacing={3}>
              {/* Avatar e nome */}
              <Stack
                direction={{
                  xs: "column",
                  sm: "row",
                }}
                spacing={2}
                sx={{
                  alignItems: {
                    xs: "center",
                    sm: "flex-start",
                  },
                }}
              >
                <Avatar
                  sx={{
                    width: 72,
                    height: 72,
                    bgcolor: "primary.main",
                    fontSize: "1.8rem",
                    fontWeight: 700,
                  }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </Avatar>

                <Box
                  sx={{
                    textAlign: {
                      xs: "center",
                      sm: "left",
                    },
                  }}
                >
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 700,
                    }}
                  >
                    {user.name}
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    {user.email}
                  </Typography>
                </Box>
              </Stack>

              {/* Informações */}
              <Box
                sx={{
                  borderTop: "1px solid",
                  borderColor: "divider",
                  pt: 3,
                }}
              >
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      ID da conta
                    </Typography>

                    <Typography variant="body1">#{user.id}</Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Email
                    </Typography>

                    <Typography variant="body1">{user.email}</Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Status
                    </Typography>

                    <Box sx={{ mt: 0.5 }}>
                      <Chip label="Conta ativa" color="success" size="small" />
                    </Box>
                  </Box>
                </Stack>
              </Box>

              {/* Botão de logout */}
              <Box
                sx={{
                  borderTop: "1px solid",
                  borderColor: "divider",
                  pt: 3,
                }}
              >
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Logout />}
                  onClick={handleLogout}
                >
                  Sair da conta
                </Button>
              </Box>
            </Stack>
          </Paper>
        </Stack>
      </Box>
    </Box>
  );
}
