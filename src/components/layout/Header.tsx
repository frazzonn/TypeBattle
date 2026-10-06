import { AppBar, Box, Button, Toolbar, Typography } from "@mui/material";
import { Link } from "react-router-dom";

export function Header() {
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
        }}
      >
        <Typography
          component={Link}
          to="/"
          variant="h6"
          sx={{
            color: "text.primary",
            textDecoration: "none",
            fontWeight: 700,
            flexGrow: 1,
          }}
        >
          TypeBattle
        </Typography>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Button component={Link} to="/typing" color="inherit">
            Digitar
          </Button>

          <Button component={Link} to="/ranking" color="inherit">
            Ranking
          </Button>

          <Button
            component={Link}
            to="/login"
            variant="contained"
            color="primary"
          >
            Entrar
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
