import { Router } from "express";

import {
  forgotPassword,
  login,
  me,
  resendVerification,
  resetPassword,
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

// Esqueci a senha: pede o código e depois troca a senha com ele.
authRoutes.post("/forgot-password", verifyLimiter, forgotPassword);
authRoutes.post("/reset-password", verifyLimiter, resetPassword);

// GET /api/auth/me
authRoutes.get("/me", authMiddleware, me);

export { authRoutes };
