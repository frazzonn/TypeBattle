import { Router } from "express";

import { login } from "../controllers/AuthController.js";

const authRoutes = Router();

// POST /api/auth/login
authRoutes.post("/login", login);

export { authRoutes };
