import { Router } from "express";

import {
  avatarUpload,
  createUser,
  handleAvatarUploadError,
  uploadAvatar,
  removeAvatar,
} from "../controllers/UserController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { rateLimit } from "../middleware/rateLimit.js";

const userRoutes = Router();

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: "Muitos cadastros feitos a partir desta rede. Tente mais tarde.",
});

const avatarLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Muitas alterações de foto. Tente novamente em alguns minutos.",
});

// Cadastro de usuário
userRoutes.post("/", registerLimiter, createUser);

// Upload da foto: exige autenticação e recebe o arquivo no campo "avatar".
userRoutes.post(
  "/avatar",
  authMiddleware,
  avatarLimiter,
  avatarUpload.single("avatar"),
  uploadAvatar,
  handleAvatarUploadError,
);

// Remove a foto do usuário autenticado.
userRoutes.delete("/avatar", authMiddleware, removeAvatar);

export { userRoutes };
