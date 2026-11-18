import jwt from "jsonwebtoken";
import type { Request, Response } from "express";

import { db } from "../prisma/db.js";
import { getTagsForUsers, isAdminEmail } from "../tags/userTags.js";
import { loadBattleData } from "./BattleResultController.js";
import { parseMissedKeys } from "./TypingResultController.js";

// Token opcional: o perfil é público, mas o admin também vê contas banidas.
function requesterIsAdmin(request: Request): boolean {
  const [type, token] = (request.headers.authorization ?? "").split(" ");
  const secret = process.env["JWT_SECRET"];
  if (type !== "Bearer" || !token || !secret) return false;

  try {
    const { email } = jwt.verify(token, secret) as { email?: string };
    return isAdminEmail(email);
  } catch {
    return false;
  }
}

// Perfil público: nome, foto, tags, testes e battle de qualquer jogador.
export async function getPublicProfile(request: Request, response: Response) {
  try {
    const id = Number(request.params.userId);
    if (!Number.isInteger(id) || id <= 0) {
      return response.status(400).json({ message: "Jogador inválido." });
    }

    const user = await db.orm.public.User.select(
      "id",
      "name",
      "avatarUrl",
      "createdAt",
      "banned",
      "emailVerified",
    ).first({ id });

    // Conta banida ou sem email confirmado não aparece para os outros.
    if (!user || ((user.banned || !user.emailVerified) && !requesterIsAdmin(request))) {
      return response.status(404).json({ message: "Jogador não encontrado." });
    }

    const [tagsByUser, results, battle] = await Promise.all([
      getTagsForUsers([id]),
      db.orm.public.TypingResult.where({ userId: id, mode: "time" })
        .orderBy([(result) => result.createdAt.asc(), (result) => result.id.asc()])
        .all(),
      loadBattleData(id),
    ]);

    return response.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl ?? null,
        createdAt: user.createdAt,
        tags: tagsByUser.get(id) ?? [],
      },
      results: results.map((result) => ({
        ...result,
        missedKeys: parseMissedKeys(result.missedKeys),
      })),
      battle,
    });
  } catch (error) {
    console.error("ERRO AO BUSCAR PERFIL:", error);
    return response.status(500).json({ message: "Erro ao buscar o perfil." });
  }
}
