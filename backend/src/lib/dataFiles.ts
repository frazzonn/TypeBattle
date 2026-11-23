import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Arquivos de backend/data (dicionários e listas dos jogos). Funciona rodando
// de src/ (tsx) ou de dist/src/ (build), e a partir da pasta backend.
export function findDataFile(path: string): string {
  const here = fileURLToPath(new URL(".", import.meta.url));
  const candidates = [
    resolve(process.cwd(), "data", path),
    resolve(here, "../../data", path),
    resolve(here, "../../../data", path),
  ];
  const found = candidates.find((file) => existsSync(file));
  if (!found) throw new Error(`Arquivo de dados não encontrado: ${path}`);
  return found;
}

// \r?\n: o Git no Windows pode trocar as quebras de linha por CRLF.
export function readDataLines(path: string): string[] {
  return readFileSync(findDataFile(path), "utf8").split(/\r?\n/).filter(Boolean);
}

export function readDataJson<T>(path: string): T {
  return JSON.parse(readFileSync(findDataFile(path), "utf8")) as T;
}

// "Cabeça" -> "cabeca".
export function normalizeWord(value: unknown): string {
  return typeof value === "string"
    ? value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim()
    : "";
}
