import { Box, Container, Divider, Link, Typography } from "@mui/material";
import GitHubIcon from "@mui/icons-material/GitHub";
import WorkOutlineRoundedIcon from "@mui/icons-material/WorkOutlineRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import KeyboardRoundedIcon from "@mui/icons-material/KeyboardRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";

const technologies = [
  "React",
  "TypeScript",
  "Vite",
  "Material UI",
  "Node.js",
  "Express",
  "Socket.IO",
  "PostgreSQL",
  "Prisma",
];

const socialLinks = [
  {
    label: "GitHub",
    href: "https://github.com/frazzonn",
    icon: <GitHubIcon fontSize="small" />,
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/gustavo-frazzon-56b6b62aa/",
    icon: <WorkOutlineRoundedIcon fontSize="small" />,
  },
  {
    label: "E-mail",
    href: "mailto:gustavofrazzon22@gmail.com",
    icon: <EmailRoundedIcon fontSize="small" />,
  },
];

export function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        mt: "auto",
        backgroundColor: "#101116",
        borderTop: "1px solid #292a35",
        color: "#f4f4f5",
      }}
    >
      <Container maxWidth="lg" sx={{ py: { xs: 2.5, md: 3 } }}>
        {/* Identidade e contatos */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1.2fr 1fr" },
            gap: { xs: 2.5, md: 4 },
          }}
        >
          <Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Box
                component="img"
                src="/logo.png"
                alt=""
                sx={{
                  width: 70,
                  height: 70,
                  maxWidth: "none",
                  objectFit: "contain",
                  flexShrink: 0,
                  filter: "drop-shadow(0 0 7px rgba(167, 139, 250, 0.2))",
                }}
              />
              <Typography
                variant="h6"
                sx={{ fontWeight: 800, letterSpacing: 0.3 }}
              >
                Type
                <Box component="span" sx={{ color: "#a78bfa" }}>
                  Battle
                </Box>
              </Typography>
            </Box>

            <Typography
              variant="body2"
              sx={{
                mt: 1,
                color: "#a1a1aa",
                maxWidth: 420,
                lineHeight: 1.7,
              }}
            >
              Treine sua velocidade de digitação, acompanhe seu desempenho e
              desafie seus amigos.
            </Typography>

            <Typography variant="body2" sx={{ mt: 1, color: "#a1a1aa" }}>
              Engenharia de Software — Univille
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700 }}>
              Contato e redes
            </Typography>

            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 1.5,
              }}
            >
              {socialLinks.map((social) => (
                <Link
                  key={social.label}
                  href={social.href}
                  target={
                    social.href.startsWith("mailto:") ? undefined : "_blank"
                  }
                  rel={
                    social.href.startsWith("mailto:")
                      ? undefined
                      : "noopener noreferrer"
                  }
                  underline="none"
                  aria-label={social.label}
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.7,
                    color: "#c4b5fd",
                    fontSize: "0.875rem",
                    transition: "color 0.2s ease",
                    "&:hover": { color: "#ffffff" },
                  }}
                >
                  {social.icon}
                  {social.label}

                  {!social.href.startsWith("mailto:") && (
                    <OpenInNewRoundedIcon sx={{ fontSize: 13 }} />
                  )}
                </Link>
              ))}
            </Box>
          </Box>
        </Box>

        {/* Tecnologias utilizadas */}
        <Box sx={{ mt: 2.5 }}>
          <Typography variant="subtitle2" sx={{ mb: 1.2, fontWeight: 700 }}>
            Tecnologias utilizadas
          </Typography>

          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 0.8,
            }}
          >
            {technologies.map((technology) => (
              <Box
                key={technology}
                sx={{
                  px: 1.2,
                  py: 0.45,
                  border: "1px solid #343541",
                  borderRadius: 1.5,
                  backgroundColor: "#191a22",
                  color: "#c4c4d0",
                  fontSize: "0.75rem",
                }}
              >
                {technology}
              </Box>
            ))}
          </Box>
        </Box>

        <Divider sx={{ mt: 2.5, mb: 1.5, borderColor: "#292a35" }} />

        {/* Créditos */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "flex-start", sm: "center" },
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Typography variant="caption" sx={{ color: "#858592" }}>
            © 2026 TypeBattle. Todos os direitos reservados.
          </Typography>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.6,
              color: "#858592",
            }}
          >
            <Typography variant="caption">Desenvolvido com</Typography>

            <FavoriteRoundedIcon sx={{ fontSize: 14, color: "#a78bfa" }} />

            <Typography variant="caption">por Gustavo Frazzon</Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
