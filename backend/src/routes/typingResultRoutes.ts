import { Router } from "express";

import {
  createTypingResult,
  getRanking,
  getTypingResults,
} from "../controllers/TypingResultController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const typingResultRoutes = Router();

// Salvar resultados exige autenticação.
typingResultRoutes.post("/", authMiddleware, createTypingResult);

// Consultar o histórico pessoal exige autenticação.
typingResultRoutes.get("/", authMiddleware, getTypingResults);

// Consultar o ranking é público.
typingResultRoutes.get("/ranking", getRanking);

export { typingResultRoutes };
