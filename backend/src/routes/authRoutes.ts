import { Router } from "express";

import {
  login,
  me,
  resendVerification,
  verifyEmail,
} from "../controllers/AuthController.js";
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

// Confirmação do email com o código de 6 dígitos.
const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Muitas tentativas. Tente novamente em alguns minutos.",
});

authRoutes.post("/verify-email", verifyLimiter, verifyEmail);
authRoutes.post("/resend-verification", verifyLimiter, resendVerification);

// GET /api/auth/me
authRoutes.get("/me", authMiddleware, me);

export { authRoutes };
