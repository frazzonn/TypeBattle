import { AppBar, Box, Button, Toolbar, Typography } from "@mui/material";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../../contexts/AuthContext";

export function Header() {
  const navigate = useNavigate();

  const { user, isAuthenticated, logout } = useAuth();

  function handleLogout() {
    logout();

    // Volta para a página inicial após sair
    navigate("/");
  }

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        backgroundColor: "background.paper",
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <Toolbar
        sx={{
          maxWidth: "1200px",
          width: "100%",
          margin: "0 auto",
          px: { xs: 2, md: 3 },
          minHeight: "64px !important",
          height: "64px",
          overflow: "visible",
        }}
      >
        {/* Logo do TypeBattle */}
        <Box
          component={Link}
          to="/"
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 1,
            flexGrow: 1,
            textDecoration: "none",
            height: 64,
          }}
        >
          <Box
            component="img"
            src="/logo.png"
            alt="Logo TypeBattle"
            sx={{
              width: 90,
              height: 90,
              objectFit: "contain",
              flexShrink: 0,
            }}
          />

          <Typography
            variant="h6"
            sx={{
              color: "text.primary",
              fontWeight: 700,
              whiteSpace: "nowrap",
              lineHeight: 1,
            }}
          >
            Type
            <Box component="span" sx={{ color: "#a78bfa" }}>
              battle
            </Box>
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          {/* Links disponíveis para todos */}
          <Button component={Link} to="/typing" color="inherit">
            Digitar
          </Button>

          <Button color="inherit" component={Link} to="/battle">
            Battle
          </Button>

          <Button component={Link} to="/ranking" color="inherit">
            Ranking
          </Button>

          {isAuthenticated && user ? (
            <>
              {/* Área do usuário logado */}
              <Button
                component={Link}
                to="/profile"
                color="inherit"
                sx={{
                  display: {
                    xs: "none",
                    sm: "inline-flex",
                  },
                }}
              >
                {user.name}
              </Button>

              <Button onClick={handleLogout} variant="outlined" color="inherit">
                Sair
              </Button>
            </>
          ) : (
            <>
              {/* Área do visitante */}
              <Button component={Link} to="/login" color="inherit">
                Entrar
              </Button>

              <Button
                component={Link}
                to="/register"
                variant="contained"
                color="primary"
              >
                Criar conta
              </Button>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
