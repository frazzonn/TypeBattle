export const NAME_MAX = 50;

// Email sempre em minúsculas: "Fulano@Gmail.com" e "fulano@gmail.com" são a mesma conta.
export function normalizeEmail(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().toLowerCase() : "";
}

// O bcrypt considera só os primeiros 72 bytes da senha.
export function passwordError(password: unknown): string | null {
  if (typeof password !== "string" || password.length < 6 || Buffer.byteLength(password) > 72) {
    return "A senha deve ter entre 6 e 72 caracteres.";
  }
  return null;
}

// Mesmas regras do cadastro: 1 a 50 caracteres, sem espaços nas pontas.
export function validateName(raw: unknown): { name: string } | { error: string } {
  const name = typeof raw === "string" ? raw.trim().replace(/\s+/g, " ") : "";

  if (!name) return { error: "Informe um nome." };
  if (name.length > NAME_MAX) {
    return { error: `O nome deve ter no máximo ${NAME_MAX} caracteres.` };
  }

  return { name };
}
