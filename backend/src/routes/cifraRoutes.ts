import { Router } from "express";

import {
  finishRunRequest,
  getDaily,
  getDailyRanking,
  guessDaily,
  guessRun,
  startDaily,
  startRun,
} from "../controllers/CifraController.js";
import { authMiddleware, optionalAuthMiddleware } from "../middleware/authMiddleware.js";
import { rateLimit } from "../middleware/rateLimit.js";

const cifraRoutes = Router();

// Palpites: no máximo 9 por desafio, mas o contra o relógio pede vários seguidos.
const guessLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: "Muitos palpites. Tente novamente em instantes.",
});

const runLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: "Muitas partidas seguidas. Tente novamente em instantes.",
});

// Diária: 1, 2 ou 4 palavras. Funciona sem conta; logado, o progresso e o
// tempo ficam no servidor e entram no ranking do dia.
cifraRoutes.get("/daily/:boards", optionalAuthMiddleware, getDaily);
cifraRoutes.post("/daily/:boards/start", authMiddleware, startDaily);
cifraRoutes.post("/daily/:boards/guess", guessLimiter, optionalAuthMiddleware, guessDaily);
cifraRoutes.get("/daily/:boards/ranking", getDailyRanking);

// Contra o relógio: logado, o resultado vai para o ranking do Arcade.
cifraRoutes.post("/run", runLimiter, optionalAuthMiddleware, startRun);
cifraRoutes.post("/run/:runId/guess", guessLimiter, guessRun);
cifraRoutes.post("/run/:runId/finish", finishRunRequest);

export { cifraRoutes };
