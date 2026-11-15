import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";

import { db } from "../prisma/db.js";

interface AuthPayload {
  userId: number;
  email: string;
}

// Verifica se a requisição possui um JWT válido
export async function authMiddleware(
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

  let decoded: AuthPayload;
  try {
    // Valida e decodifica o token
    decoded = jwt.verify(token, jwtSecret) as AuthPayload;
  } catch {
    return response.status(401).json({
      message: "Token inválido ou expirado.",
    });
  }

  try {
    // A conta pode ter sido apagada ou banida depois que o token foi emitido.
    const account = await db.orm.public.User.select("banned").first({
      id: decoded.userId,
    });

    if (!account) {
      return response.status(401).json({ message: "Usuário não encontrado." });
    }

    if (account.banned) {
      return response.status(403).json({
        code: "ACCOUNT_BANNED",
        message: "Esta conta foi suspensa.",
      });
    }
  } catch (error) {
    console.error("ERRO AO CONFERIR CONTA:", error);
    return response.status(500).json({ message: "Erro ao conferir a conta." });
  }

  // Guarda os dados do usuário na requisição
  request.user = decoded;
  next();
}
