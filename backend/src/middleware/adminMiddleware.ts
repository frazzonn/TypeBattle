import type { NextFunction, Request, Response } from "express";

import { isAdminEmail } from "../tags/userTags.js";

// Usar depois do authMiddleware: só deixa passar o email de admin.
export function adminMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  if (!isAdminEmail(request.user?.email)) {
    return response.status(403).json({
      message: "Acesso restrito ao administrador.",
    });
  }

  next();
}
