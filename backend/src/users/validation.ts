export const NAME_MAX = 50;

// Mesmas regras do cadastro: 1 a 50 caracteres, sem espaços nas pontas.
export function validateName(raw: unknown): { name: string } | { error: string } {
  const name = typeof raw === "string" ? raw.trim().replace(/\s+/g, " ") : "";

  if (!name) return { error: "Informe um nome." };
  if (name.length > NAME_MAX) {
    return { error: `O nome deve ter no máximo ${NAME_MAX} caracteres.` };
  }

  return { name };
}
