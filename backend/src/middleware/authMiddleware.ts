import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";

interface AuthPayload {
  userId: number;
  email: string;
}

// Verifica se a requisição possui um JWT válido
export function authMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const authorization = request.headers.authorization;

  // Verifica se o header Authorization foi enviado
  if (!authorization) {
    return response.status(401).json({
      message: "Token de autenticação não informado.",
    });
  }

  // O formato esperado é: Bearer TOKEN
  const [type, token] = authorization.split(" ");

  if (type !== "Bearer" || !token) {
    return response.status(401).json({
      message: "Formato do token inválido.",
    });
  }

  const jwtSecret = process.env["JWT_SECRET"];

  if (!jwtSecret) {
    return response.status(500).json({
      message: "Configuração de autenticação ausente.",
    });
  }

  try {
    // Valida e decodifica o token
    const decoded = jwt.verify(token, jwtSecret) as AuthPayload;

    // Guarda os dados do usuário na requisição
    request.user = decoded;

    next();
  } catch {
    return response.status(401).json({
      message: "Token inválido ou expirado.",
    });
  }
}
