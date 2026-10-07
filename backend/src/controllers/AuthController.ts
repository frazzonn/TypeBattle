import bcrypt from "bcrypt";
import type { Request, Response } from "express";

import { db } from "../prisma/db.js";

// Realiza o login do usuário
export async function login(request: Request, response: Response) {
  try {
    const { email, password } = request.body;

    // Validação básica
    if (!email || !password) {
      return response.status(400).json({
        message: "Email e senha são obrigatórios.",
      });
    }

    // Procura o usuário pelo email
    const user = await db.orm.public.User.first({
      email,
    });

    if (!user) {
      return response.status(401).json({
        message: "Email ou senha inválidos.",
      });
    }

    // Compara a senha informada com o hash salvo
    const passwordIsValid = await bcrypt.compare(password, user.password);

    if (!passwordIsValid) {
      return response.status(401).json({
        message: "Email ou senha inválidos.",
      });
    }

    // Login válido
    return response.status(200).json({
      message: "Login realizado com sucesso.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("ERRO AO FAZER LOGIN:", error);

    return response.status(500).json({
      message: "Erro ao realizar login.",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
