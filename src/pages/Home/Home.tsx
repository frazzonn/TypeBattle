import {
  Box,
  Button,
  Chip,
  Container,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { Link } from "react-router-dom";

import SpeedRoundedIcon from "@mui/icons-material/SpeedRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import KeyboardRoundedIcon from "@mui/icons-material/KeyboardRounded";
import TrackChangesRoundedIcon from "@mui/icons-material/TrackChangesRounded";

const features = [
  {
    icon: <SpeedRoundedIcon />,
    title: "Teste sua velocidade",
    description:
      "Descubra seu PPM, acompanhe sua precisão e evolua a cada rodada.",
    color: "#a78bfa",
    background: "rgba(167, 139, 250, 0.10)",
    to: "/typing",
    action: "Fazer um teste",
  },
  {
    icon: <GroupsRoundedIcon />,
    title: "Desafie seus amigos",
    description:
      "Entre em uma batalha e descubra quem consegue digitar mais rápido.",
    color: "#7dd3fc",
    background: "rgba(125, 211, 252, 0.10)",
    to: "/battle",
    action: "Ir para batalhas",
  },
  {
    icon: <EmojiEventsRoundedIcon />,
    title: "Suba no ranking",
    description:
      "Compare seus resultados e busque seu lugar entre os melhores.",
    color: "#fcd34d",
    background: "rgba(252, 211, 77, 0.10)",
    to: "/ranking",
    action: "Ver ranking",
  },
];

export function Home() {
  return (
    <Box
      sx={{
        minHeight: "calc(100vh - 64px)",
        background:
          "radial-gradient(ellipse at 50% 0%, rgba(124, 58, 237, 0.12) 0%, transparent 55%)",
        color: "#f4f4f5",
        pb: { xs: 6, md: 10 },
      }}
    >
      <Container maxWidth="lg">
        {/* Hero principal */}
        <Box
          sx={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            pt: { xs: 8, sm: 11, md: 14 },
            pb: { xs: 8, md: 12 },
            overflow: "hidden",
          }}
        >
          <Chip
            icon={<KeyboardRoundedIcon sx={{ fontSize: 17 }} />}
            label="SUA PRÓXIMA BATALHA COMEÇA AQUI"
            sx={{
              mb: 3,
              px: 1,
              height: 32,
              color: "#c4b5fd",
              backgroundColor: "rgba(167, 139, 250, 0.08)",
              border: "1px solid rgba(167, 139, 250, 0.22)",
              fontSize: "0.68rem",
              fontWeight: 800,
              letterSpacing: 1.1,
              "& .MuiChip-icon": {
                color: "#a78bfa",
              },
            }}
          />

          <Typography
            component="h1"
            sx={{
              fontSize: {
                xs: "3.5rem",
                sm: "5rem",
                md: "6.5rem",
              },
              lineHeight: 1,
              fontWeight: 900,
              letterSpacing: "-0.075em",
              color: "#ffffff",
            }}
          >
            Type
            <Box
              component="span"
              sx={{
                color: "#a78bfa",
              }}
            >
              Battle
            </Box>
            <Box
              component="span"
              sx={{
                color: "#a78bfa",
              }}
            >
              .
            </Box>
          </Typography>

          <Typography
            sx={{
              mt: 3,
              maxWidth: 650,
              fontSize: { xs: "1.15rem", sm: "1.4rem", md: "1.65rem" },
              fontWeight: 600,
              lineHeight: 1.45,
              color: "#e4e4e7",
            }}
          >
            Não basta digitar rápido.
            <Box component="span" sx={{ color: "#a78bfa" }}>
              {" "}
              É hora de provar.
            </Box>
          </Typography>

          <Typography
            sx={{
              mt: 2,
              maxWidth: 560,
              px: 1,
              color: "#9296a5",
              fontSize: { xs: "0.95rem", md: "1.05rem" },
              lineHeight: 1.8,
            }}
          >
            Teste sua velocidade, aperfeiçoe sua precisão e enfrente outros
            jogadores em desafios de digitação.
          </Typography>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            sx={{
              mt: 4,
              width: { xs: "100%", sm: "auto" },
              alignItems: "stretch",
            }}
          >
            <Button
              component={Link}
              to="/typing"
              variant="contained"
              size="large"
              endIcon={<ArrowForwardRoundedIcon />}
              sx={{
                px: 3.5,
                py: 1.6,
                borderRadius: 2.5,
                fontWeight: 800,
                fontSize: "0.95rem",
                textTransform: "none",
                color: "#171321",
                backgroundColor: "#a78bfa",
                boxShadow: "0 8px 30px rgba(167, 139, 250, 0.18)",
                "&:hover": {
                  backgroundColor: "#b9a3ff",
                  boxShadow: "0 10px 35px rgba(167, 139, 250, 0.28)",
                },
              }}
            >
              Começar a digitar
            </Button>

            <Button
              component={Link}
              to="/battle"
              variant="outlined"
              size="large"
              startIcon={<GroupsRoundedIcon />}
              sx={{
                px: 3,
                py: 1.6,
                borderRadius: 2.5,
                borderColor: "#353442",
                color: "#e4e4e7",
                fontWeight: 700,
                fontSize: "0.95rem",
                textTransform: "none",
                "&:hover": {
                  borderColor: "#a78bfa",
                  backgroundColor: "rgba(167, 139, 250, 0.06)",
                },
              }}
            >
              Jogar com amigos
            </Button>
          </Stack>

          {/* Indicador visual */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mt: 5,
              color: "#777b8b",
            }}
          >
            <TrackChangesRoundedIcon sx={{ fontSize: 17, color: "#a78bfa" }} />
            <Typography variant="caption" sx={{ letterSpacing: 0.3 }}>
              Velocidade • Precisão • Competição
            </Typography>
          </Box>
        </Box>

        {/* Funcionalidades */}
        <Box sx={{ maxWidth: 1000, mx: "auto" }}>
          <Box sx={{ mb: 3 }}>
            <Typography
              sx={{
                color: "#a78bfa",
                fontSize: "0.72rem",
                fontWeight: 800,
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              ESCOLHA SEU DESAFIO
            </Typography>

            <Typography
              component="h2"
              sx={{
                mt: 1,
                fontSize: { xs: "1.6rem", sm: "2rem" },
                fontWeight: 800,
                letterSpacing: "-0.04em",
                color: "#f4f4f5",
              }}
            >
              Como você vai jogar?
            </Typography>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(3, minmax(0, 1fr))",
              },
              gap: 2,
            }}
          >
            {features.map((feature) => (
              <Paper
                key={feature.title}
                component={Link}
                to={feature.to}
                elevation={0}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  minWidth: 0,
                  p: { xs: 2.5, md: 3 },
                  minHeight: 245,
                  borderRadius: 3,
                  textDecoration: "none",
                  color: "inherit",
                  backgroundColor: "#15161c",
                  backgroundImage: "none",
                  border: "1px solid #292a35",
                  transition:
                    "transform 180ms ease, border-color 180ms ease, background-color 180ms ease",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    borderColor: feature.color,
                    backgroundColor: "#191a22",
                  },
                  "&:focus-visible": {
                    outline: `2px solid ${feature.color}`,
                    outlineOffset: 3,
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 46,
                    height: 46,
                    borderRadius: 2.5,
                    color: feature.color,
                    backgroundColor: feature.background,
                    "& .MuiSvgIcon-root": {
                      fontSize: 25,
                    },
                  }}
                >
                  {feature.icon}
                </Box>

                <Typography
                  component="h3"
                  sx={{
                    mt: 2.5,
                    fontSize: "1.1rem",
                    fontWeight: 800,
                    color: "#f4f4f5",
                  }}
                >
                  {feature.title}
                </Typography>

                <Typography
                  sx={{
                    mt: 1,
                    fontSize: "0.9rem",
                    lineHeight: 1.75,
                    color: "#9296a5",
                  }}
                >
                  {feature.description}
                </Typography>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.75,
                    mt: "auto",
                    pt: 2.5,
                    color: feature.color,
                    fontSize: "0.85rem",
                    fontWeight: 800,
                  }}
                >
                  {feature.action}
                  <ArrowForwardRoundedIcon sx={{ fontSize: 18 }} />
                </Box>
              </Paper>
            ))}
          </Box>
        </Box>

        {/* Chamada final */}
        <Box
          sx={{
            maxWidth: 1000,
            mx: "auto",
            mt: { xs: 6, md: 8 },
            p: { xs: 3, sm: 4 },
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "flex-start", sm: "center" },
            justifyContent: "space-between",
            gap: 3,
            borderRadius: 3,
            border: "1px solid rgba(167, 139, 250, 0.2)",
            background:
              "linear-gradient(110deg, rgba(124, 58, 237, 0.12), rgba(21, 22, 28, 0.9) 65%)",
          }}
        >
          <Box>
            <Typography
              sx={{
                fontSize: { xs: "1.2rem", sm: "1.45rem" },
                fontWeight: 800,
                color: "#f4f4f5",
              }}
            >
              Cada tecla conta.
            </Typography>

            <Typography sx={{ mt: 0.75, color: "#9296a5", lineHeight: 1.7 }}>
              Entre no teste e descubra do que você é capaz.
            </Typography>
          </Box>

          <Button
            component={Link}
            to="/typing"
            variant="contained"
            endIcon={<ArrowForwardRoundedIcon />}
            sx={{
              flexShrink: 0,
              px: 2.5,
              py: 1.25,
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 800,
              color: "#171321",
              backgroundColor: "#a78bfa",
              "&:hover": {
                backgroundColor: "#b9a3ff",
              },
            }}
          >
            Fazer meu teste
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
