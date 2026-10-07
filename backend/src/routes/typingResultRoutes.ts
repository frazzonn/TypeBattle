import { Router } from "express";

import {
  createTypingResult,
  getTypingResults,
} from "../controllers/TypingResultController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const typingResultRoutes = Router();

// Salva um resultado
typingResultRoutes.post("/", authMiddleware, createTypingResult);

// Busca os resultados do usuário
typingResultRoutes.get("/", authMiddleware, getTypingResults);

export { typingResultRoutes };
