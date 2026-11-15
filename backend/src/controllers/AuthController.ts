import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { Request, Response } from "express";

import {
  codeMatches,
  isExpired,
  issuePasswordResetCode,
  issueVerificationCode,
  markEmailVerified,
  MAX_ATTEMPTS,
  RESEND_COOLDOWN_SECONDS,
  savePasswordAndClearCode,
  secondsUntilResend,
} from "../auth/verification.js";
import { db } from "../prisma/db.js";
import {
  getTagsForUsers,
  isAdminEmail,
  type PublicTag,
} from "../tags/userTags.js";
import { normalizeEmail, passwordError } from "../users/validation.js";

interface SessionUser {
  id: number;
  name: string;
  email: string;
  avatarUrl: string | null | undefined;
}

// Dados do usuário que o frontend guarda da sessão.
async function buildSessionUser(user: SessionUser) {
  // Tags são só enfeite: se falharem, o usuário entra sem elas.
  const tagsByUser = await getTagsForUsers([user.id]).catch((error: unknown) => {
    console.error("ERRO AO BUSCAR TAGS DA SESSÃO:", error);
    return new Map<number, PublicTag[]>();
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
    isAdmin: isAdminEmail(user.email),
    tags: tagsByUser.get(user.id) ?? [],
  };
}

// Token novo + dados do usuário (login e verificação do email).
async function buildSession(user: SessionUser) {
  const jwtSecret = process.env["JWT_SECRET"];
  if (!jwtSecret) throw new Error("JWT_SECRET não configurado.");

  const token = jwt.sign({ userId: user.id, email: user.email }, jwtSecret, {
    expiresIn: "7d",
  });

  return { token, user: await buildSessionUser(user) };
}

// Realiza o login do usuário.
export async function login(request: Request, response: Response) {
  try {
    const { email, password } = request.body ?? {};

    if (
      !email ||
      !password ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return response.status(400).json({
        message: "Email e senha são obrigatórios.",
      });
    }

    const user = await db.orm.public.User.first({ email: normalizeEmail(email) });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return response.status(401).json({
        message: "Email ou senha inválidos.",
      });
    }

    if (user.banned) {
      return response.status(403).json({
        code: "ACCOUNT_BANNED",
        message: "Esta conta foi suspensa.",
      });
    }

    // Conta sem email confirmado: manda um código novo (se já pode) e pede a verificação.
    if (!user.emailVerified) {
      if (secondsUntilResend(user.verificationSentAt) === 0) {
        await issueVerificationCode(user).catch((error: unknown) =>
          console.error("ERRO AO ENVIAR CÓDIGO:", error),
        );
      }

      return response.status(403).json({
        code: "EMAIL_NOT_VERIFIED",
        message: "Confirme seu email para entrar.",
        email: user.email,
      });
    }

    const session = await buildSession(user);

    return response.status(200).json({
      message: "Login realizado com sucesso.",
      ...session,
    });
  } catch (error) {
    console.error("ERRO AO FAZER LOGIN:", error);

    return response.status(500).json({
      message: "Erro ao realizar login.",
    });
  }
}

// Confere o código do email; se estiver certo, libera a conta e já entra.
export async function verifyEmail(request: Request, response: Response) {
  try {
    const email = normalizeEmail(request.body?.email);
    const code =
      typeof request.body?.code === "string" ? request.body.code.replace(/\D/g, "") : "";

    const password = request.body?.password;

    if (!email || code.length !== 6) {
      return response.status(400).json({ message: "Informe o código de 6 dígitos." });
    }

    if (typeof password !== "string" || !password) {
      return response.status(400).json({ message: "Informe sua senha." });
    }

    const user = await db.orm.public.User.first({ email });
    const invalid = { message: "Código inválido ou expirado." };

    if (!user) return response.status(400).json(invalid);

    if (user.banned) {
      return response.status(403).json({
        code: "ACCOUNT_BANNED",
        message: "Esta conta foi suspensa.",
      });
    }

    if (user.emailVerified) {
      return response.status(400).json({ message: "Este email já foi confirmado. Faça login." });
    }

    if (user.verificationAttempts >= MAX_ATTEMPTS) {
      return response.status(429).json({
        message: "Muitas tentativas. Peça um código novo.",
      });
    }

    if (isExpired(user.verificationExpiresAt)) {
      return response.status(400).json({ message: "O código expirou. Peça um código novo." });
    }

    const passwordOk = await bcrypt.compare(password, user.password);

    // Código ou senha errados gastam uma tentativa.
    if (!passwordOk || !codeMatches(code, user.verificationCodeHash)) {
      await db.orm.public.User.where({ id: user.id }).update({
        verificationAttempts: user.verificationAttempts + 1,
      });
      return response.status(400).json(
        passwordOk ? invalid : { message: "Senha diferente da usada no cadastro." },
      );
    }

    await markEmailVerified(user.id);
    const session = await buildSession(user);

    return response.status(200).json({
      message: "Email confirmado!",
      ...session,
    });
  } catch (error) {
    console.error("ERRO AO VERIFICAR EMAIL:", error);
    return response.status(500).json({ message: "Erro ao verificar o email." });
  }
}

// Manda outro código. Não revela se o email existe.
export async function resendVerification(request: Request, response: Response) {
  try {
    const email = normalizeEmail(request.body?.email);
    const ok = {
      message: "Se a conta existir e ainda não estiver confirmada, enviamos um código novo.",
      retryAfter: 60,
    };

    if (!email) {
      return response.status(400).json({ message: "Informe o email." });
    }

    const user = await db.orm.public.User.first({ email });
    if (!user || user.emailVerified || user.banned) {
      return response.status(200).json(ok);
    }

    const wait = secondsUntilResend(user.verificationSentAt);
    if (wait > 0) {
      return response.status(429).json({
        message: `Aguarde ${wait} s para pedir outro código.`,
        retryAfter: wait,
      });
    }

    await issueVerificationCode(user);
    return response.status(200).json(ok);
  } catch (error) {
    console.error("ERRO AO REENVIAR CÓDIGO:", error);
    return response.status(500).json({ message: "Não foi possível enviar o código." });
  }
}

// Esqueci a senha: manda um código para o email. Não revela se a conta existe.
export async function forgotPassword(request: Request, response: Response) {
  try {
    const email = normalizeEmail(request.body?.email);
    const ok = {
      message: "Se existir uma conta com esse email, enviamos um código para trocar a senha.",
      retryAfter: RESEND_COOLDOWN_SECONDS,
    };

    if (!email) {
      return response.status(400).json({ message: "Informe o email." });
    }

    // Conta não confirmada não troca senha: basta se cadastrar de novo.
    const user = await db.orm.public.User.first({ email });
    if (!user || !user.emailVerified || user.banned) {
      return response.status(200).json(ok);
    }

    const wait = secondsUntilResend(user.verificationSentAt);
    if (wait > 0) {
      return response.status(429).json({
        message: `Aguarde ${wait} s para pedir outro código.`,
        retryAfter: wait,
      });
    }

    await issuePasswordResetCode(user);
    return response.status(200).json(ok);
  } catch (error) {
    console.error("ERRO AO PEDIR TROCA DE SENHA:", error);
    return response.status(500).json({ message: "Não foi possível enviar o código." });
  }
}

// Confere o código e salva a senha nova; já entra na conta.
export async function resetPassword(request: Request, response: Response) {
  try {
    const email = normalizeEmail(request.body?.email);
    const code =
      typeof request.body?.code === "string" ? request.body.code.replace(/\D/g, "") : "";
    const password = request.body?.password;

    if (!email || code.length !== 6) {
      return response.status(400).json({ message: "Informe o código de 6 dígitos." });
    }

    const invalidPassword = passwordError(password);
    if (invalidPassword) {
      return response.status(400).json({ message: invalidPassword });
    }

    const user = await db.orm.public.User.first({ email });
    const invalid = { message: "Código inválido ou expirado." };

    if (!user || !user.emailVerified) return response.status(400).json(invalid);

    if (user.banned) {
      return response.status(403).json({
        code: "ACCOUNT_BANNED",
        message: "Esta conta foi suspensa.",
      });
    }

    if (user.verificationAttempts >= MAX_ATTEMPTS) {
      return response.status(429).json({ message: "Muitas tentativas. Peça um código novo." });
    }

    if (isExpired(user.verificationExpiresAt)) {
      return response.status(400).json({ message: "O código expirou. Peça um código novo." });
    }

    if (!codeMatches(code, user.verificationCodeHash)) {
      await db.orm.public.User.where({ id: user.id }).update({
        verificationAttempts: user.verificationAttempts + 1,
      });
      return response.status(400).json(invalid);
    }

    await savePasswordAndClearCode(user.id, await bcrypt.hash(password as string, 10));
    const session = await buildSession(user);

    return response.status(200).json({
      message: "Senha trocada!",
      ...session,
    });
  } catch (error) {
    console.error("ERRO AO TROCAR SENHA:", error);
    return response.status(500).json({ message: "Erro ao trocar a senha." });
  }
}

// Retorna os dados atuais do usuário dono do token.
export async function me(request: Request, response: Response) {
  try {
    const userId = request.user?.userId;

    if (!userId) {
      return response.status(401).json({
        message: "Usuário não autenticado.",
      });
    }

    const user = await db.orm.public.User.select(
      "id",
      "name",
      "email",
      "avatarUrl",
    ).first({ id: userId });

    // A conta pode ter sido removida depois que o token foi emitido.
    if (!user) {
      return response.status(401).json({
        message: "Usuário não encontrado.",
      });
    }

    return response.status(200).json({
      message: "Token válido!",
      user: await buildSessionUser(user),
    });
  } catch (error) {
    console.error("ERRO AO BUSCAR USUÁRIO:", error);

    return response.status(500).json({
      message: "Erro ao buscar usuário.",
    });
  }
}
