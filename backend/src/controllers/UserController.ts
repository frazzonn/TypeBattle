import bcrypt from "bcrypt";
import type { Request, Response } from "express";

import { db } from "../prisma/db.js";

// Cria um novo usuário
export async function createUser(request: Request, response: Response) {
  try {
    const { name, email, password } = request.body;

    // Validação básica dos campos
    if (!name || !email || !password) {
      return response.status(400).json({
        message: "Nome, email e senha são obrigatórios.",
      });
    }

    // Procura um usuário com o mesmo email
    const existingUser = await db.orm.public.User.first({
      email,
    });

    if (existingUser) {
      return response.status(409).json({
        message: "Este email já está cadastrado.",
      });
    }

    // Gera um hash seguro para a senha
    const passwordHash = await bcrypt.hash(password, 10);

    // Salva o usuário com o hash, nunca a senha original
    const user = await db.orm.public.User.create({
      name,
      email,
      password: passwordHash,
    });

    // Nunca retorna a senha ou o hash
    return response.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error("ERRO AO CRIAR USUÁRIO:", error);

    return response.status(500).json({
      message: "Erro ao criar usuário.",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
