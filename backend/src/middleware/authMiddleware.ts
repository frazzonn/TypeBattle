import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";

import { db } from "../prisma/db.js";

interface AuthPayload {
  userId: number;
  email: string;
}

// Situação da conta (existe? banida?), lembrada por alguns segundos para não
// consultar o banco a cada requisição. O admin limpa ao banir ou apagar.
const ACCOUNT_CACHE_MS = 30_000;
const accountCache = new Map<number, { exists: boolean; banned: boolean; at: number }>();

async function getAccountStatus(userId: number): Promise<{ exists: boolean; banned: boolean }> {
  const cached = accountCache.get(userId);
  if (cached && Date.now() - cached.at < ACCOUNT_CACHE_MS) return cached;
  const account = await db.orm.public.User.select("banned").first({ id: userId });
  const status = { exists: Boolean(account), banned: Boolean(account?.banned), at: Date.now() };
  accountCache.set(userId, status);
  if (accountCache.size > 5_000) {
    for (const [id, entry] of accountCache) if (Date.now() - entry.at >= ACCOUNT_CACHE_MS) accountCache.delete(id);
  }
  return status;
}

// Chamado quando o admin bane, desbane ou apaga uma conta.
export function forgetAccountStatus(userId: number) {
  accountCache.delete(userId);
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
    const account = await getAccountStatus(decoded.userId);

    if (!account.exists) {
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

// Login opcional: com um token válido de conta ativa, preenche request.user;
// sem token (ou com um inválido), segue como convidado.
export async function optionalAuthMiddleware(
  request: Request,
  _response: Response,
  next: NextFunction,
) {
  const [type, token] = (request.headers.authorization ?? "").split(" ");
  const jwtSecret = process.env["JWT_SECRET"];
  if (type !== "Bearer" || !token || !jwtSecret) return next();

  try {
    const decoded = jwt.verify(token, jwtSecret) as AuthPayload;
    const account = await getAccountStatus(decoded.userId);
    if (account.exists && !account.banned) request.user = decoded;
  } catch {
    // Token inválido ou expirado: joga como convidado.
  }
  next();
}
