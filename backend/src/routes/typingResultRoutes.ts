import { Router } from "express";

import {
  createTypingResult,
  getRanking,
  getTypingResults,
} from "../controllers/TypingResultController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { rateLimit } from "../middleware/rateLimit.js";

const typingResultRoutes = Router();

// Um teste dura no mínimo 15 segundos, então 30 por minuto já sobra.
const resultLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: "Muitos resultados enviados. Tente novamente em instantes.",
});

// Salva um resultado
typingResultRoutes.post("/", authMiddleware, resultLimiter, createTypingResult);

// Busca os resultados do usuário
typingResultRoutes.get("/", authMiddleware, getTypingResults);

// Busca o ranking por duração
typingResultRoutes.get("/ranking", getRanking);

export { typingResultRoutes };
