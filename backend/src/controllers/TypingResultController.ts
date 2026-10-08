import type { Request, Response } from "express";

import { db } from "../prisma/db.js";

// Salva o resultado de um teste de digitação
export async function createTypingResult(request: Request, response: Response) {
  try {
    const { ppm, accuracy, errors, characters, duration } = request.body;

    // O usuário vem do JWT validado pelo middleware
    const userId = request.user?.userId;

    if (!userId) {
      return response.status(401).json({
        message: "Usuário não autenticado.",
      });
    }

    // Validação dos dados recebidos
    if (
      ppm === undefined ||
      accuracy === undefined ||
      errors === undefined ||
      characters === undefined ||
      duration === undefined
    ) {
      return response.status(400).json({
        message: "Todos os dados do resultado são obrigatórios.",
      });
    }

    // Cria o resultado vinculado ao usuário autenticado
    const result = await db.orm.public.TypingResult.create({
      userId,
      ppm,
      accuracy,
      errors,
      characters,
      duration,
    });

    return response.status(201).json({
      message: "Resultado salvo com sucesso.",
      result,
    });
  } catch (error) {
    console.error("ERRO AO SALVAR RESULTADO:", error);

    return response.status(500).json({
      message: "Erro ao salvar resultado.",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// Busca os resultados do usuário autenticado
export async function getTypingResults(request: Request, response: Response) {
  try {
    // O usuário vem do JWT validado pelo middleware
    const userId = request.user?.userId;

    if (!userId) {
      return response.status(401).json({
        message: "Usuário não autenticado.",
      });
    }

    // Busca todos os resultados e filtra pelo usuário
    const allResults = await db.orm.public.TypingResult.all();

    const results = allResults.filter((result) => result.userId === userId);

    return response.status(200).json({
      results,
    });
  } catch (error) {
    console.error("ERRO AO BUSCAR RESULTADOS:", error);

    return response.status(500).json({
      message: "Erro ao buscar resultados.",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// Busca o ranking dos jogadores por duração
export async function getRanking(request: Request, response: Response) {
  try {
    const duration = Number(request.query.duration);

    // Somente essas três durações são permitidas.
    if (![15, 30, 60].includes(duration)) {
      return response.status(400).json({
        message: "A duração deve ser 15, 30 ou 60 segundos.",
      });
    }

    // Busca todos os resultados registrados.
    const allResults = await db.orm.public.TypingResult.all();

    // Busca todos os usuários para relacionar o userId ao nome.
    const allUsers = await db.orm.public.User.all();

    // Mantém somente os resultados da duração escolhida.
    const durationResults = allResults.filter(
      (result) => result.duration === duration,
    );

    // Guarda o melhor resultado de cada usuário.
    const bestByUser = new Map<number, (typeof durationResults)[number]>();

    for (const result of durationResults) {
      const currentBest = bestByUser.get(result.userId);

      if (!currentBest || result.ppm > currentBest.ppm) {
        bestByUser.set(result.userId, result);
      }
    }

    // Monta o ranking relacionando resultado e usuário.
    const ranking = Array.from(bestByUser.values())
      .map((result) => {
        const user = allUsers.find((item) => item.id === result.userId);

        return {
          userId: result.userId,
          name: user?.name ?? "Usuário",
          ppm: result.ppm,
          accuracy: result.accuracy,
        };
      })
      // Maior PPM primeiro.
      .sort((a, b) => b.ppm - a.ppm)
      // Adiciona a posição do jogador.
      .map((player, index) => ({
        position: index + 1,
        ...player,
      }));

    return response.status(200).json({
      duration,
      ranking,
    });
  } catch (error) {
    console.error("ERRO AO BUSCAR RANKING:", error);

    return response.status(500).json({
      message: "Erro ao buscar ranking.",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
