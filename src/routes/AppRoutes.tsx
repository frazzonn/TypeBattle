import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";

import { Home } from "../pages/Home/Home";
import { ProtectedRoute } from "./ProtectedRoute";

// A página inicial vem junto; as demais só são baixadas quando abertas.
const Login = lazy(() =>
  import("../pages/Login/Login").then((module) => ({ default: module.Login })),
);
const Register = lazy(() =>
  import("../pages/Register/Register").then((module) => ({
    default: module.Register,
  })),
);
const TypingTest = lazy(() =>
  import("../pages/TypingTest/TypingTest").then((module) => ({
    default: module.TypingTest,
  })),
);
const Profile = lazy(() =>
  import("../pages/Profile/Profile").then((module) => ({
    default: module.Profile,
  })),
);
const Ranking = lazy(() =>
  import("../pages/Ranking/Ranking").then((module) => ({
    default: module.Ranking,
  })),
);
const Battle = lazy(() =>
  import("../pages/Battle/Battle").then((module) => ({
    default: module.Battle,
  })),
);

function PageLoading() {
  return (
    <Box
      role="status"
      aria-label="Carregando página"
      sx={{ minHeight: "60vh", display: "grid", placeItems: "center" }}
    >
      <CircularProgress size={32} sx={{ color: "#a78bfa" }} />
    </Box>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        {/* Rotas públicas */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/typing" element={<TypingTest />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/battle" element={<Battle />} />

        {/* Rotas que exigem autenticação */}
        <Route element={<ProtectedRoute />}>
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
