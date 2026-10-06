import { Box, Button, Container, Stack, Typography } from "@mui/material";
import { Link } from "react-router-dom";

export function Home() {
  return (
    <Container maxWidth="lg">
      <Box
        sx={{
          minHeight: "calc(100vh - 64px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <Stack
          sx={{
            alignItems: "center",
            gap: 3,
            maxWidth: "700px",
          }}
        >
          <Typography
            variant="h1"
            sx={{
              fontSize: {
                xs: "3rem",
                md: "5rem",
              },
            }}
          >
            TypeBattle
          </Typography>

          <Typography variant="h5" color="text.secondary">
            Teste sua velocidade. Supere seus limites. Vença seus amigos.
          </Typography>

          <Typography
            variant="body1"
            color="text.secondary"
            sx={{
              maxWidth: "550px",
            }}
          >
            Uma plataforma de digitação competitiva onde você poderá medir sua
            velocidade, precisão e competir contra outros jogadores.
          </Typography>

          <Button
            component={Link}
            to="/typing"
            variant="contained"
            size="large"
            sx={{
              px: 5,
              py: 1.5,
              fontSize: "1rem",
            }}
          >
            Começar a digitar
          </Button>
        </Stack>
      </Box>
    </Container>
  );
}
