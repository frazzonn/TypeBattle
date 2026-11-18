import { Router } from "express";

import { createArcadeResult, getArcadeRanking } from "../controllers/ArcadeController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { rateLimit } from "../middleware/rateLimit.js";

const arcadeRoutes = Router();

// Uma partida leva pelo menos alguns segundos; 30 por minuto já sobra.
const arcadeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: "Muitos resultados enviados. Tente novamente em instantes.",
});

// Salva uma partida (Pavio, Órbita ou Perseguição) de quem está logado.
arcadeRoutes.post("/", authMiddleware, arcadeLimiter, createArcadeResult);

// Ranking de um jogo: ?game=pavio|orbita|chase (&language=... na perseguição).
arcadeRoutes.get("/ranking", getArcadeRanking);

export { arcadeRoutes };
