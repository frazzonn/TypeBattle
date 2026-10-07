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
