import { Router } from "express";

import { getEmbaralha, guessEmbaralha, revealEmbaralha } from "../controllers/EmbaralhaController.js";
import { rateLimit } from "../middleware/rateLimit.js";

const embaralhaRoutes = Router();

const guessLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: "Muitas palavras seguidas. Tente novamente em instantes.",
});

// Desafio diário, sem conta nem ranking.
embaralhaRoutes.get("/daily", getEmbaralha);
embaralhaRoutes.post("/daily/guess", guessLimiter, guessEmbaralha);
embaralhaRoutes.post("/daily/reveal", guessLimiter, revealEmbaralha);

export { embaralhaRoutes };
