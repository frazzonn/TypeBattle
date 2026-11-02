import type { Request, Response } from "express";

import { db } from "../prisma/db.js";

// Quantas partidas recentes o perfil mostra na lista.
const RECENT_LIMIT = 20;

// Resumo e partidas recentes da battle do usuário autenticado.
// Os resultados são gravados pelo servidor da battle ao fim de cada rodada.
export async function getBattleResults(request: Request, response: Response) {
  try {
    const userId = request.user?.userId;

    if (!userId) {
      return response.status(401).json({
        message: "Usuário não autenticado.",
      });
    }

    const results = await db.orm.public.BattleResult.where({ userId })
      .orderBy([
        (result) => result.createdAt.desc(),
        (result) => result.id.desc(),
      ])
      .select(
        "id",
        "won",
        "placement",
        "players",
        "ppm",
        "accuracy",
        "errors",
        "duration",
        "language",
        "createdAt",
      )
      .all();

    const wins = results.filter((result) => result.won).length;
    const totalPpm = results.reduce((sum, result) => sum + result.ppm, 0);

    return response.status(200).json({
      summary: {
        played: results.length,
        wins,
        losses: results.length - wins,
        winRate:
          results.length > 0 ? Math.round((wins / results.length) * 100) : 0,
        bestPpm: results.reduce((best, result) => Math.max(best, result.ppm), 0),
        averagePpm:
          results.length > 0 ? Math.round(totalPpm / results.length) : 0,
      },
      recent: results.slice(0, RECENT_LIMIT),
    });
  } catch (error) {
    console.error("ERRO AO BUSCAR RESULTADOS DA BATTLE:", error);

    return response.status(500).json({
      message: "Erro ao buscar resultados da battle.",
    });
  }
}
