import { Router } from "express";

import { getBattleResults } from "../controllers/BattleResultController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const battleResultRoutes = Router();

// Resumo e partidas recentes do usuário (vitórias, derrotas, PPM)
battleResultRoutes.get("/", authMiddleware, getBattleResults);

export { battleResultRoutes };
