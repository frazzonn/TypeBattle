import { Link } from "react-router-dom";
import { Box, Button, Container, Typography } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";

import { TypingTest } from "../TypingTest/TypingTest";

// Perseguição do Arcade: o mesmo teste de digitação, travado nesse modo.
export function Chase() {
  return (
    <>
      <Container maxWidth="lg" sx={{ pt: { xs: 3, md: 4 } }}>
        <Box sx={{ maxWidth: 1100, mx: "auto", display: "flex", alignItems: "center", gap: 1.5 }}>
          <Button
            component={Link}
            to="/arcade"
            startIcon={<ArrowBackRoundedIcon />}
            size="small"
            sx={{ color: "#a0a4ad", px: 0.5, minWidth: 0 }}
          >
            Arcade
          </Button>
          <Typography sx={{ color: "#5d6270" }}>/</Typography>
          <Typography sx={{ fontWeight: 700 }}>Perseguição</Typography>
        </Box>
      </Container>
      <TypingTest fixedMode="chase" />
    </>
  );
}
