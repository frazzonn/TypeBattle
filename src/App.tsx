import { Box } from "@mui/material";

import { Header } from "./components/layout/Header";
import { Footer } from "./components/Footer/Footer";
import { AppRoutes } from "./routes/AppRoutes";

function App() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Header />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: "100vh",
        }}
      >
        <AppRoutes />
      </Box>

      <Footer />
    </Box>
  );
}

export default App;
