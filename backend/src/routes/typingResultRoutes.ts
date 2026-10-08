import { Router } from "express";

import {
  createTypingResult,
  getRanking,
  getTypingResults,
} from "../controllers/TypingResultController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const typingResultRoutes = Router();

// Salva um resultado
typingResultRoutes.post("/", authMiddleware, createTypingResult);

// Busca os resultados do usuário
typingResultRoutes.get("/", authMiddleware, getTypingResults);

// Busca o ranking por duração
typingResultRoutes.get("/ranking", authMiddleware, getRanking);

export { typingResultRoutes };
