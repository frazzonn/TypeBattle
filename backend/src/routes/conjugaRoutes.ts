import { Router } from "express";

import { finishConjuga, guessConjuga, skipConjuga, startConjuga } from "../controllers/ConjugaController.js";
import { optionalAuthMiddleware } from "../middleware/authMiddleware.js";
import { rateLimit } from "../middleware/rateLimit.js";

const conjugaRoutes = Router();

// Quem digita rápido manda várias formas por segundo.
const guessLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  message: "Muitas palavras seguidas. Tente novamente em instantes.",
});
const runLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: "Muitas partidas seguidas. Tente novamente em instantes.",
});

// Logado, o resultado vai para o ranking do Arcade.
conjugaRoutes.post("/run", runLimiter, optionalAuthMiddleware, startConjuga);
conjugaRoutes.post("/run/:runId/guess", guessLimiter, guessConjuga);
conjugaRoutes.post("/run/:runId/skip", guessLimiter, skipConjuga);
conjugaRoutes.post("/run/:runId/finish", finishConjuga);

export { conjugaRoutes };
