import { Router } from "express";

import { login, me } from "../controllers/AuthController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { rateLimit } from "../middleware/rateLimit.js";

const authRoutes = Router();

// Dificulta tentativas de adivinhar senhas.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Muitas tentativas de login. Tente novamente em alguns minutos.",
});

// POST /api/auth/login
authRoutes.post("/login", loginLimiter, login);

// GET /api/auth/me
authRoutes.get("/me", authMiddleware, me);

export { authRoutes };
