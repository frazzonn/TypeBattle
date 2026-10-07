import { Route, Routes } from "react-router-dom";

import { Home } from "../pages/Home/Home";
import { Login } from "../pages/Login/Login";
import { Register } from "../pages/Register/Register";
import { TypingTest } from "../pages/TypingTest/TypingTest";
import { Profile } from "../pages/Profile/Profile";
import { Ranking } from "../pages/Ranking/Ranking";
import { Battle } from "../pages/Battle/Battle";
import { ProtectedRoute } from "./ProtectedRoute";

export function AppRoutes() {
  return (
    <Routes>
      {/* Rotas públicas */}
      <Route path="/" element={<Home />} />

      <Route path="/login" element={<Login />} />

      <Route path="/register" element={<Register />} />

      <Route path="/typing" element={<TypingTest />} />

      <Route path="/ranking" element={<Ranking />} />

      {/* Rotas protegidas */}
      <Route element={<ProtectedRoute />}>
        <Route path="/profile" element={<Profile />} />

        <Route path="/battle" element={<Battle />} />
      </Route>
    </Routes>
  );
}
