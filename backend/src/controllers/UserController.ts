import bcrypt from "bcrypt";
import type { Request, Response } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";

import { db } from "../prisma/db.js";

// Configura o recebimento da imagem em memória, com limite de 5 MB.
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

// Cria um novo usuário.
export async function createUser(request: Request, response: Response) {
  try {
    const { name, email, password } = request.body;

    if (!name || !email || !password) {
      return response.status(400).json({
        message: "Nome, email e senha são obrigatórios.",
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
      error: error instanceof Error ? error.message : String(error),
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

    // O endereço só será salvo quando a coluna avatarUrl existir no banco.
    await db.orm.public.User.where({ id: userId }).update({
      avatarUrl: result.secure_url,
    });

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
