import { useState } from "react";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from "@mui/material";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import KeyboardRoundedIcon from "@mui/icons-material/KeyboardRounded";
import SportsEsportsRoundedIcon from "@mui/icons-material/SportsEsportsRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";

import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import PersonAddAlt1RoundedIcon from "@mui/icons-material/PersonAddAlt1Rounded";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../contexts/AuthContext";

const purple = "#a78bfa";

const navigationItems = [
  {
    label: "Digitar",
    to: "/typing",
    icon: <KeyboardRoundedIcon />,
  },
  {
    label: "Battle",
    to: "/battle",
    icon: <SportsEsportsRoundedIcon />,
  },
  {
    label: "Ranking",
    to: "/ranking",
    icon: <EmojiEventsRoundedIcon />,
  },
];

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const handleMobileMenuClose = () => {
    setMobileMenuOpen(false);
  };
  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  function handleLogout() {
    closeMobileMenu();
    logout();
    navigate("/");
  }

  const isActive = (path: string) => location.pathname === path;
  const firstName = user?.name?.trim().split(/\s+/)[0] || "Usuário";
  const initial = firstName.charAt(0).toUpperCase();

  const navButtonSx = (active: boolean) => ({
    minHeight: 42,
    px: { sm: 1.2, md: 1.8 },
    gap: 0.8,
    borderRadius: 2.5,
    color: active ? "#e9ddff" : "#c4c7d1",
    backgroundColor: active ? "rgba(124, 77, 255, 0.18)" : "transparent",
    border: "1px solid",
    borderColor: active ? "rgba(167, 139, 250, 0.16)" : "transparent",
    fontWeight: active ? 700 : 500,
    textTransform: "none",
    whiteSpace: "nowrap",
    transition: "all 180ms ease",
    "& .MuiButton-startIcon": {
      color: active ? purple : "#a8adbd",
      mr: 0.2,
    },
    "&:hover": {
      color: "#fff",
      backgroundColor: "rgba(167, 139, 250, 0.12)",
      borderColor: "rgba(167, 139, 250, 0.22)",
    },
  });

  const mobileItemSx = (active: boolean) => ({
    mx: 1,
    mb: 0.5,
    borderRadius: 2,
    color: active ? "#e9ddff" : "#d4d4df",
    backgroundColor: active ? "rgba(124, 77, 255, 0.18)" : "transparent",
    "& .MuiListItemIcon-root": {
      minWidth: 42,
      color: active ? purple : "#a8adbd",
    },
    "&:hover": {
      backgroundColor: "rgba(167, 139, 250, 0.12)",
    },
  });

  function navigateFromMenu(path: string) {
    closeMobileMenu();
    navigate(path);
  }

  return (
    <>
      <AppBar
        position="static"
        elevation={0}
        sx={{
          backgroundColor: "#14161d",
          backgroundImage: "linear-gradient(110deg, #171923, #14161d 65%)",
          borderBottom: "1px solid rgba(167, 139, 250, 0.22)",
          boxShadow: "0 4px 24px rgba(0, 0, 0, 0.12)",
        }}
      >
        <Toolbar
          sx={{
            maxWidth: 1240,
            width: "100%",
            mx: "auto",
            px: { xs: 1.5, sm: 2.5, md: 3 },
            height: { xs: "60px", sm: "70px" },
            minHeight: { xs: "60px !important", sm: "70px !important" },
            maxHeight: { xs: "60px", sm: "70px" },
            boxSizing: "border-box",
            gap: { xs: 1, md: 3 },
            overflow: "visible",
          }}
        >
          {/* Logo */}
          <Box
            component={Link}
            to="/"
            aria-label="TypeBattle - página inicial"
            onClick={closeMobileMenu}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: { xs: 0.3, sm: 0.8 },
              flexGrow: 1,
              minWidth: 0,
              height: "100%",
              textDecoration: "none",
              overflow: "visible",
            }}
          >
            <Box
              component="img"
              src="/logo.png"
              alt=""
              sx={{
                width: 100,
                height: 100,
                maxWidth: "none",
                objectFit: "contain",
                flexShrink: 0,
                filter: "drop-shadow(0 0 7px rgba(167, 139, 250, 0.2))",
              }}
            />

            <Typography
              component="span"
              sx={{
                color: "#f5f3ff",
                fontSize: { xs: "1rem", sm: "1.2rem", md: "1.25rem" },
                fontWeight: 800,
                letterSpacing: "-0.6px",
                whiteSpace: "nowrap",
              }}
            >
              Type
              <Box component="span" sx={{ color: purple }}>
                Battle
              </Box>
            </Typography>
          </Box>
          {/* Mantenha aqui o restante do Toolbar original:
      navegação, conta e botão do menu mobile. */}

          {/* Navegação para tablet e desktop */}
          <Box
            component="nav"
            aria-label="Navegação principal"
            sx={{
              display: { xs: "none", md: "flex" },
              alignItems: "center",
              justifyContent: "center",
              gap: { md: 0.4, lg: 0.8 },
            }}
          >
            {navigationItems.map((item) => (
              <Button
                key={item.to}
                component={Link}
                to={item.to}
                startIcon={item.icon}
                aria-current={isActive(item.to) ? "page" : undefined}
                sx={navButtonSx(isActive(item.to))}
              >
                {item.label}
              </Button>
            ))}
          </Box>
          {/* Conta e ações no desktop */}
          <Box
            sx={{
              display: { xs: "none", md: "flex" },
              alignItems: "center",
              justifyContent: "flex-end",
              gap: { md: 1, lg: 1.5 },
              flexGrow: 1,
              minWidth: 0,
            }}
          >
            {isAuthenticated && user ? (
              <>
                <Box
                  sx={{
                    width: "1px",
                    height: 30,
                    backgroundColor: "rgba(255,255,255,0.12)",
                    mr: 0.5,
                  }}
                />

                <Button
                  component={Link}
                  to="/profile"
                  startIcon={
                    <Avatar
                      sx={{
                        width: 34,
                        height: 34,
                        fontSize: "0.9rem",
                        fontWeight: 700,
                        color: "#f3eaff",
                        backgroundColor: "#30204e",
                        border: `2px solid ${purple}`,
                      }}
                    >
                      {initial}
                    </Avatar>
                  }
                  sx={{
                    minWidth: 0,
                    px: 1,
                    color: "#f3f0ff",
                    textTransform: "none",
                    fontWeight: 600,
                    "& .MuiButton-startIcon": { mr: 0.8 },
                    "&:hover": {
                      backgroundColor: "rgba(167, 139, 250, 0.1)",
                    },
                  }}
                >
                  {firstName}
                </Button>

                <Button
                  onClick={handleLogout}
                  variant="outlined"
                  startIcon={<LogoutRoundedIcon />}
                  sx={{
                    px: 1.5,
                    minHeight: 40,
                    color: "#e5a0a8",
                    borderColor: "rgba(239, 100, 116, 0.35)",
                    borderRadius: 2.5,
                    textTransform: "none",
                    fontWeight: 600,
                    "&:hover": {
                      color: "#ffb4bc",
                      backgroundColor: "rgba(239, 68, 85, 0.1)",
                      borderColor: "#e87986",
                    },
                  }}
                >
                  Sair
                </Button>
              </>
            ) : (
              <>
                <Button
                  component={Link}
                  to="/login"
                  sx={{
                    color: "#d7d8e0",
                    textTransform: "none",
                    "&:hover": {
                      color: "#fff",
                      backgroundColor: "rgba(167, 139, 250, 0.1)",
                    },
                  }}
                >
                  Entrar
                </Button>

                <Button
                  component={Link}
                  to="/register"
                  variant="contained"
                  sx={{
                    px: 2,
                    borderRadius: 2.5,
                    backgroundColor: "#7c4dff",
                    textTransform: "none",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    "&:hover": { backgroundColor: "#906bff" },
                  }}
                >
                  Criar conta
                </Button>
              </>
            )}
          </Box>
          {/* Menu compacto para celulares */}
          <IconButton
            aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
            sx={{
              display: { xs: "inline-flex", md: "none" },
              color: "#e9ddff",
              border: "1px solid rgba(167, 139, 250, 0.25)",
              borderRadius: 2,
              width: 42,
              height: 42,
              "&:hover": {
                backgroundColor: "rgba(167, 139, 250, 0.12)",
              },
            }}
          >
            {mobileMenuOpen ? <CloseRoundedIcon /> : <MenuRoundedIcon />}
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Menu lateral em telas pequenas */}
      <Drawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={handleMobileMenuClose}
        slotProps={{
          paper: {
            sx: {
              width: { xs: "85%", sm: 320 },
              backgroundColor: "#181b21",
              backgroundImage: "linear-gradient(...)",
              color: "#fff",
              borderLeft: "1px solid #292d36",
            },
          },
        }}
      >
        <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            component="img"
            src="/logo.png"
            alt=""
            sx={{ width: 44, height: 44, objectFit: "contain" }}
          />

          <Box sx={{ flexGrow: 1 }}>
            <Typography sx={{ fontWeight: 800, fontSize: "1.1rem" }}>
              Type
              <Box component="span" sx={{ color: purple }}>
                Battle
              </Box>
            </Typography>
            <Typography sx={{ color: "#969bad", fontSize: "0.75rem" }}>
              Menu de navegação
            </Typography>
          </Box>

          <IconButton
            aria-label="Fechar menu"
            onClick={closeMobileMenu}
            sx={{ color: "#c4c7d1" }}
          >
            <CloseRoundedIcon />
          </IconButton>
        </Box>

        <Divider sx={{ borderColor: "rgba(255,255,255,0.09)", mb: 1.5 }} />

        <List sx={{ px: 1 }}>
          {navigationItems.map((item) => (
            <ListItemButton
              key={item.to}
              selected={isActive(item.to)}
              onClick={() => navigateFromMenu(item.to)}
              sx={mobileItemSx(isActive(item.to))}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText
                primary={item.label}
                slotProps={{
                  primary: {
                    sx: {
                      fontWeight: 700,
                    },
                  },
                }}
              />
              {isActive(item.to) && (
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    backgroundColor: purple,
                    boxShadow: `0 0 10px ${purple}`,
                  }}
                />
              )}
            </ListItemButton>
          ))}
        </List>

        <Divider
          sx={{
            borderColor: "rgba(255,255,255,0.09)",
            my: 1.5,
          }}
        />

        {isAuthenticated && user ? (
          <Box sx={{ px: 1 }}>
            <ListItemButton
              onClick={() => navigateFromMenu("/profile")}
              sx={mobileItemSx(isActive("/profile"))}
            >
              <ListItemIcon>
                <Avatar
                  sx={{
                    width: 30,
                    height: 30,
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    color: "#f3eaff",
                    backgroundColor: "#30204e",
                    border: `2px solid ${purple}`,
                  }}
                >
                  {initial}
                </Avatar>
              </ListItemIcon>
              <ListItemText
                primary={firstName}
                secondary="Meu perfil"
                slotProps={{
                  secondary: { sx: { color: "#969bad" } },
                }}
              />
            </ListItemButton>

            <ListItemButton
              onClick={handleLogout}
              sx={{
                ...mobileItemSx(false),
                color: "#e5a0a8",
                "& .MuiListItemIcon-root": { color: "#e87986" },
              }}
            >
              <ListItemIcon>
                <LogoutRoundedIcon />
              </ListItemIcon>
              <ListItemText primary="Sair da conta" />
            </ListItemButton>
          </Box>
        ) : (
          <List sx={{ px: 1 }}>
            <ListItemButton
              onClick={() => navigateFromMenu("/login")}
              sx={mobileItemSx(isActive("/login"))}
            >
              <ListItemIcon>
                <LoginRoundedIcon />
              </ListItemIcon>
              <ListItemText primary="Entrar" />
            </ListItemButton>

            <ListItemButton
              onClick={() => navigateFromMenu("/register")}
              sx={mobileItemSx(isActive("/register"))}
            >
              <ListItemIcon>
                <PersonAddAlt1RoundedIcon />
              </ListItemIcon>
              <ListItemText primary="Criar conta" />
            </ListItemButton>
          </List>
        )}

        <Box sx={{ mt: "auto", p: 2 }}>
          <Divider sx={{ borderColor: "rgba(255,255,255,0.09)", mb: 1.5 }} />
          <Typography
            sx={{
              color: "#777d91",
              fontSize: "0.75rem",
              textAlign: "center",
            }}
          >
            TypeBattle · Digite. Evolua. Vença.
          </Typography>
        </Box>
      </Drawer>
    </>
  );
}
