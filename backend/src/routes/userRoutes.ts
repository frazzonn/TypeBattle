import { Router } from "express";

import { createUser } from "../controllers/UserController.js";

const userRoutes = Router();

// POST /api/users
userRoutes.post("/", createUser);

export { userRoutes };
