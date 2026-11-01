import bcrypt from "bcrypt";
import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";

import { db } from "../prisma/db.js";

// Recebe imagens em memória, com limite de 5 MB.
export const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_request, file, callback) => {
    if (!file.mimetype.startsWith("image/")) {
      return callback(new Error("Envie um arquivo de imagem válido."));
    }

    callback(null, true);
  },
});

// Converte erros do multer (arquivo grande, tipo inválido) em resposta JSON.
export function handleAvatarUploadError(
  error: unknown,
  _request: Request,
  response: Response,
  next: NextFunction,
) {
  if (error instanceof multer.MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "A imagem deve ter no máximo 5 MB."
        : "Não foi possível processar a imagem enviada.";

    return response.status(400).json({ message });
  }

  if (error instanceof Error) {
    return response.status(400).json({ message: error.message });
  }

  next(error);
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Extrai o public_id de uma URL do Cloudinary gerada por este backend.
function getAvatarPublicId(avatarUrl: string): string | null {
  const match = avatarUrl.match(/\/upload\/(?:v\d+\/)?(typebattle\/avatars\/[^.]+)/);
  return match?.[1] ?? null;
}

// Apaga a foto antiga sem interromper a requisição se falhar.
async function deleteStoredAvatar(avatarUrl: string | null | undefined) {
  if (!avatarUrl) return;

  const publicId = getAvatarPublicId(avatarUrl);
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  } catch (error) {
    console.error("ERRO AO APAGAR FOTO ANTIGA:", error);
  }
}

// Cria um novo usuário.
export async function createUser(request: Request, response: Response) {
  try {
    const { name: rawName, email: rawEmail, password } = request.body ?? {};
    const name = typeof rawName === "string" ? rawName.trim() : "";
    const email = typeof rawEmail === "string" ? rawEmail.trim() : "";

    if (!name || !email || !password || typeof password !== "string") {
      return response.status(400).json({
        message: "Nome, email e senha são obrigatórios.",
      });
    }

    if (name.length > 50) {
      return response.status(400).json({
        message: "O nome deve ter no máximo 50 caracteres.",
      });
    }

    if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
      return response.status(400).json({
        message: "Informe um email válido.",
      });
    }

    // O bcrypt considera só os primeiros 72 bytes da senha.
    if (password.length < 6 || Buffer.byteLength(password) > 72) {
      return response.status(400).json({
        message: "A senha deve ter entre 6 e 72 caracteres.",
      });
    }

    const existingUser = await db.orm.public.User.first({ email });

    if (existingUser) {
      return response.status(409).json({
        message: "Este email já está cadastrado.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await db.orm.public.User.create({
      name,
      email,
      password: passwordHash,
    });

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
    });
  }
}

// Envia a foto para o Cloudinary e salva o endereço no perfil.
export async function uploadAvatar(request: Request, response: Response) {
  try {
    const file = request.file;
    const userId = request.user?.userId;

    if (!userId) {
      return response.status(401).json({
        message: "Usuário não autenticado.",
      });
    }

    if (!file) {
      return response.status(400).json({
        message: "Selecione uma imagem de até 5 MB.",
      });
    }

    const result = await new Promise<{ secure_url: string }>(
      (resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: "typebattle/avatars",
              resource_type: "image",
            },
            (error, uploadedImage) => {
              if (error) {
                reject(error);
                return;
              }

              if (!uploadedImage) {
                reject(new Error("O Cloudinary não retornou a imagem."));
                return;
              }

              resolve({ secure_url: uploadedImage.secure_url });
            },
          )
          .end(file.buffer);
      },
    );

    const currentUser = await db.orm.public.User.select("avatarUrl").first({
      id: userId,
    });

    await db.orm.public.User.where({ id: userId }).update({
      avatarUrl: result.secure_url,
    });

    await deleteStoredAvatar(currentUser?.avatarUrl);

    return response.status(200).json({
      message: "Foto de perfil atualizada com sucesso.",
      avatarUrl: result.secure_url,
    });
  } catch (error) {
    console.error("ERRO AO ATUALIZAR FOTO:", error);

    return response.status(500).json({
      message: "Erro ao atualizar a foto de perfil.",
    });
  }
}

// Remove a foto do perfil e restaura o avatar padrão.
export async function removeAvatar(request: Request, response: Response) {
  try {
    const userId = request.user?.userId;

    if (!userId) {
      return response.status(401).json({
        message: "Usuário não autenticado.",
      });
    }

    const currentUser = await db.orm.public.User.select("avatarUrl").first({
      id: userId,
    });

    await db.orm.public.User.where({ id: userId }).update({
      avatarUrl: null,
    });

    await deleteStoredAvatar(currentUser?.avatarUrl);

    return response.status(200).json({
      message: "Foto de perfil removida com sucesso.",
      avatarUrl: null,
    });
  } catch (error) {
    console.error("ERRO AO REMOVER FOTO:", error);

    return response.status(500).json({
      message: "Erro ao remover a foto de perfil.",
    });
  }
}
