import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

import { sendEmail } from "../email/sendEmail.js";
import { db } from "../prisma/db.js";

// O código vale 15 minutos, aceita 5 tentativas e só pode ser reenviado
// depois de 60 segundos.
const CODE_TTL_MINUTES = 15;
export const RESEND_COOLDOWN_SECONDS = 60;
export const MAX_ATTEMPTS = 5;

// Datas do Prisma são Temporal.Instant (o polyfill é carregado em db.ts).
// Aqui só precisamos dos milissegundos.
interface InstantLike {
  epochMilliseconds: number;
}

const { Temporal } = globalThis as unknown as {
  Temporal: { Instant: { fromEpochMilliseconds(ms: number): InstantLike } };
};

function instantFromNow(ms = 0): InstantLike {
  return Temporal.Instant.fromEpochMilliseconds(Date.now() + ms);
}

function hashCode(code: string): string {
  const secret = process.env.JWT_SECRET ?? "typebattle";
  return createHmac("sha256", secret).update(code).digest("hex");
}

export function codeMatches(code: string, storedHash: string | null): boolean {
  if (!storedHash || !/^\d{6}$/.test(code)) return false;

  const expected = Buffer.from(storedHash, "hex");
  const received = Buffer.from(hashCode(code), "hex");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

// Segundos que faltam para poder reenviar (0 = já pode).
export function secondsUntilResend(sentAt: InstantLike | null | undefined): number {
  if (!sentAt) return 0;

  const elapsedMs = Date.now() - sentAt.epochMilliseconds;
  return Math.max(0, Math.ceil(RESEND_COOLDOWN_SECONDS - elapsedMs / 1000));
}

export function isExpired(expiresAt: InstantLike | null | undefined): boolean {
  return !expiresAt || Date.now() >= expiresAt.epochMilliseconds;
}

// Gera um código novo, salva o hash e manda o email.
export async function issueVerificationCode(user: {
  id: number;
  name: string;
  email: string;
}): Promise<void> {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.orm.public.User.where({ id: user.id }).update({
    verificationCodeHash: hashCode(code),
    verificationExpiresAt: instantFromNow(CODE_TTL_MINUTES * 60_000),
    verificationSentAt: instantFromNow(),
    verificationAttempts: 0,
  });

  const firstName = user.name.trim().split(/\s+/)[0] || "jogador";

  // Link que abre a tela de verificação já com o código preenchido.
  const params = new URLSearchParams({ email: user.email, code });
  const confirmUrl = `${getAppUrl()}/verificar?${params}`;

  await sendEmail({
    to: user.email,
    toName: user.name,
    subject: `${code} é o seu código do TypeBattle`,
    text:
      `Olá, ${firstName}!\n\n` +
      `Seu código de verificação do TypeBattle é: ${code}\n\n` +
      `Ou confirme direto por este link: ${confirmUrl}\n\n` +
      `Ele vale por ${CODE_TTL_MINUTES} minutos. Se não foi você que criou a conta, ignore este email.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:420px;margin:0 auto;padding:24px;color:#1f2330">
  <h2 style="margin:0 0 12px">Type<span style="color:#7c4dff">Battle</span></h2>
  <p>Olá, ${escapeHtml(firstName)}!</p>
  <p>Clique no botão para confirmar seu email:</p>
  <p style="margin:22px 0">
    <a href="${escapeHtml(confirmUrl)}" style="display:inline-block;background:#7c4dff;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:8px">Confirmar meu email</a>
  </p>
  <p style="margin:0 0 8px">Ou copie o código:</p>
  <div style="display:inline-block;font-family:'Courier New',monospace;font-size:30px;font-weight:700;letter-spacing:6px;color:#7c4dff;background:#f3efff;border:1px dashed #b9a3ff;border-radius:8px;padding:10px 18px;user-select:all;-webkit-user-select:all">${code}</div>
  <p style="color:#6b7080;font-size:13px;margin-top:20px">Ele vale por ${CODE_TTL_MINUTES} minutos. Se não foi você que criou a conta, ignore este email.</p>
</div>`,
  });
}

// Endereço do site para o link do email: APP_URL, ou o primeiro FRONTEND_URL.
function getAppUrl(): string {
  const configured =
    process.env.APP_URL || (process.env.FRONTEND_URL ?? "").split(",")[0] || "";
  return (configured.trim() || "https://type-battle-wpqb.vercel.app").replace(/\/+$/, "");
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

// Libera a conta e apaga o código.
export async function markEmailVerified(userId: number): Promise<void> {
  await db.orm.public.User.where({ id: userId }).update({
    emailVerified: true,
    verificationCodeHash: null,
    verificationExpiresAt: null,
    verificationAttempts: 0,
  });
}
