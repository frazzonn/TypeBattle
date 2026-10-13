import { Router } from "express";

import {
  avatarUpload,
  createUser,
  uploadAvatar,
  removeAvatar,
} from "../controllers/UserController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const userRoutes = Router();

// Cadastro de usuário
userRoutes.post("/", createUser);

// Upload da foto: exige autenticação e recebe o arquivo no campo "avatar".
userRoutes.post(
  "/avatar",
  authMiddleware,
  avatarUpload.single("avatar"),
  uploadAvatar,
);

// Remove a foto do usuário autenticado.
userRoutes.delete("/avatar", authMiddleware, removeAvatar);

export { userRoutes };
