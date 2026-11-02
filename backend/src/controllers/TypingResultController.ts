import type { Request, Response } from "express";

import { DEFAULT_LANGUAGE, isLanguageCode } from "../battle/textGenerator.js";
import { db } from "../prisma/db.js";

const ALLOWED_DURATIONS = [15, 30, 60];

// Acima disso o resultado não é plausível para um humano.
const MAX_PPM = 350;

// Quantidade máxima de jogadores retornada pelo ranking.
const RANKING_LIMIT = 100;

interface TypingResultInput {
  ppm: number;
  accuracy: number;
  errors: number;
  characters: number;
  duration: number;
  language: string;
  // JSON com a letra esperada e quantas vezes errou nela.
  missedKeys: string;
}

// Mais que isso não cabe num teste de 60 s.
const MAX_MISSED_KEYS = 100;

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

// Cada chave é um único caractere; a soma não pode passar do total de erros.
function validateMissedKeys(
  value: unknown,
  errors: number,
): Record<string, number> | null {
  if (value === undefined) return {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const entries = Object.entries(value);
  if (entries.length > MAX_MISSED_KEYS) return null;

  let total = 0;
  for (const [key, count] of entries) {
    if ([...key].length !== 1 || !isNonNegativeInteger(count)) return null;
    total += count;
  }

  return total <= errors ? Object.fromEntries(entries) : null;
}

// Lê o JSON salvo; dados antigos ou inválidos viram objeto vazio.
function parseMissedKeys(value: string): Record<string, number> {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, number>)
      : {};
  } catch {
    return {};
  }
}

// Confere tipos, limites e se os números batem entre si.
export function validateTypingResult(body: unknown): TypingResultInput | string {
  if (!body || typeof body !== "object") {
    return "Todos os dados do resultado são obrigatórios.";
  }

  const { ppm, accuracy, errors, characters, duration, language, missedKeys } =
    body as Record<string, unknown>;

  if (
    ppm === undefined ||
    accuracy === undefined ||
    errors === undefined ||
    characters === undefined ||
    duration === undefined
  ) {
    return "Todos os dados do resultado são obrigatórios.";
  }

  if (
    !isNonNegativeInteger(ppm) ||
    !isNonNegativeInteger(accuracy) ||
    !isNonNegativeInteger(errors) ||
    !isNonNegativeInteger(characters) ||
    !isNonNegativeInteger(duration)
  ) {
    return "Os dados do resultado devem ser números inteiros positivos.";
  }

  if (!ALLOWED_DURATIONS.includes(duration)) {
    return "A duração deve ser 15, 30 ou 60 segundos.";
  }

  // Clientes antigos não mandam o idioma: conta como português.
  if (language !== undefined && !isLanguageCode(language)) {
    return "Idioma inválido.";
  }

  if (ppm > MAX_PPM || accuracy > 100 || errors > characters) {
    return "Resultado inválido.";
  }

  // O frontend calcula PPM e precisão a partir dos caracteres digitados.
  const correct = characters - errors;
  const expectedPpm = Math.round(correct / 5 / (duration / 60));
  const expectedAccuracy =
    characters === 0 ? 100 : Math.round((correct / characters) * 100);

  if (
    Math.abs(ppm - expectedPpm) > 2 ||
    Math.abs(accuracy - expectedAccuracy) > 1
  ) {
    return "Resultado inválido.";
  }

  // Clientes antigos não mandam as teclas erradas.
  const validMissedKeys = validateMissedKeys(missedKeys, errors);
  if (!validMissedKeys) {
    return "Resultado inválido.";
  }

  return {
    ppm,
    accuracy,
    errors,
    characters,
    duration,
    language: language ?? DEFAULT_LANGUAGE,
    missedKeys: JSON.stringify(validMissedKeys),
  };
}

// Salva o resultado de um teste de digitação
export async function createTypingResult(request: Request, response: Response) {
  try {
    // O usuário vem do JWT validado pelo middleware
    const userId = request.user?.userId;

    if (!userId) {
      return response.status(401).json({
        message: "Usuário não autenticado.",
      });
    }

    const data = validateTypingResult(request.body);

    if (typeof data === "string") {
      return response.status(400).json({
        message: data,
      });
    }

    // Cria o resultado vinculado ao usuário autenticado
    const result = await db.orm.public.TypingResult.create({
      userId,
      ...data,
    });

    return response.status(201).json({
      message: "Resultado salvo com sucesso.",
      result,
    });
  } catch (error) {
    console.error("ERRO AO SALVAR RESULTADO:", error);

    return response.status(500).json({
      message: "Erro ao salvar resultado.",
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

    const results = await db.orm.public.TypingResult.where({ userId })
      .orderBy([(result) => result.createdAt.asc(), (result) => result.id.asc()])
      .all();

    return response.status(200).json({
      results: results.map((result) => ({
        ...result,
        missedKeys: parseMissedKeys(result.missedKeys),
      })),
    });
  } catch (error) {
    console.error("ERRO AO BUSCAR RESULTADOS:", error);

    return response.status(500).json({
      message: "Erro ao buscar resultados.",
    });
  }
}

// Busca o ranking dos jogadores por duração e idioma
export async function getRanking(request: Request, response: Response) {
  try {
    const duration = Number(request.query.duration);
    const language = request.query.language ?? DEFAULT_LANGUAGE;

    // Somente essas três durações são permitidas.
    if (!ALLOWED_DURATIONS.includes(duration)) {
      return response.status(400).json({
        message: "A duração deve ser 15, 30 ou 60 segundos.",
      });
    }

    if (!isLanguageCode(language)) {
      return response.status(400).json({
        message: "Idioma inválido.",
      });
    }

    // Melhor resultado de cada usuário (DISTINCT ON userId), calculado no banco.
    // Em caso de empate no PPM, vale o resultado mais antigo.
    const bestResults = await db.orm.public.TypingResult.where({ duration, language })
      .orderBy([
        (result) => result.userId.asc(),
        (result) => result.ppm.desc(),
        (result) => result.createdAt.asc(),
        (result) => result.id.asc(),
      ])
      .distinctOn("userId")
      .select("userId", "ppm", "accuracy")
      .all();

    const topResults = [...bestResults]
      // Maior PPM primeiro.
      .sort((a, b) => b.ppm - a.ppm)
      .slice(0, RANKING_LIMIT);

    // Busca só os nomes dos usuários que aparecem no ranking.
    const userIds = topResults.map((result) => result.userId);
    const users =
      userIds.length > 0
        ? await db.orm.public.User.where((user) => user.id.in(userIds))
            .select("id", "name")
            .all()
        : [];
    const namesById = new Map(users.map((user) => [user.id, user.name]));

    // Monta o ranking relacionando resultado e usuário.
    const ranking = topResults.map((result, index) => ({
      // Adiciona a posição do jogador.
      position: index + 1,
      userId: result.userId,
      name: namesById.get(result.userId) ?? "Usuário",
      ppm: result.ppm,
      accuracy: result.accuracy,
    }));

    return response.status(200).json({
      duration,
      language,
      ranking,
    });
  } catch (error) {
    console.error("ERRO AO BUSCAR RANKING:", error);

    return response.status(500).json({
      message: "Erro ao buscar ranking.",
    });
  }
}
