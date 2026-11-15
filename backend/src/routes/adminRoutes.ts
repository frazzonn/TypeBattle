import { Router } from "express";

import {
  addUserTag,
  createTag,
  deleteTag,
  deleteUser,
  deleteUserResults,
  deleteUserTypingResult,
  getUserAdminInfo,
  listTags,
  listUsers,
  removeUserTag,
  updateTag,
  updateUser,
} from "../controllers/AdminController.js";
import { adminMiddleware } from "../middleware/adminMiddleware.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const adminRoutes = Router();

// Todas as rotas exigem login com o email de admin.
adminRoutes.use(authMiddleware, adminMiddleware);

adminRoutes.get("/tags", listTags);
adminRoutes.post("/tags", createTag);
adminRoutes.patch("/tags/:tagId", updateTag);
adminRoutes.delete("/tags/:tagId", deleteTag);

adminRoutes.get("/users", listUsers);
adminRoutes.post("/users/:userId/tags", addUserTag);
adminRoutes.delete("/users/:userId/tags/:tagId", removeUserTag);

adminRoutes.get("/users/:userId", getUserAdminInfo);
adminRoutes.patch("/users/:userId", updateUser);
adminRoutes.delete("/users/:userId", deleteUser);
adminRoutes.delete("/users/:userId/results", deleteUserResults);
adminRoutes.delete("/users/:userId/typing-results/:resultId", deleteUserTypingResult);

export { adminRoutes };
