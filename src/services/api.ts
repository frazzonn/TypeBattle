const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3000/api"
).replace(/\/$/, "");

interface RegisterData {
  name: string;
  email: string;
  password: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface User {
  id: number;
  name: string;
  email: string;
}

interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

interface TypingResultData {
  ppm: number;
  accuracy: number;
  errors: number;
  characters: number;
  duration: number;
}

// Formato de um resultado salvo no histórico.
export interface TypingResult {
  id: number;
  userId: number;
  ppm: number;
  accuracy: number;
  errors: number;
  characters: number;
  duration: number;
  createdAt: string;
}

// Formato das respostas usadas pelo perfil e pelo ranking.
interface TypingResultsResponse {
  results: TypingResult[];
}

export interface RankingEntry {
  userId: number;
  name: string;
  ppm: number;
  accuracy: number;
  position: number;
}

export interface RankingResponse {
  duration: number;
  ranking: RankingEntry[];
}

// Converte a resposta da API e trata erros HTTP.
async function handleResponse<T>(response: Response): Promise<T> {
  const result: unknown = await response.json();

  if (!response.ok) {
    const message =
      typeof result === "object" &&
      result !== null &&
      "message" in result &&
      typeof result.message === "string"
        ? result.message
        : "Erro ao comunicar com o servidor.";

    throw new Error(message);
  }

  return result as T;
}

// Cadastra um novo usuário.
export async function registerUser(data: RegisterData) {
  const response = await fetch(`${API_URL}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return handleResponse<User>(response);
}

// Realiza o login e retorna o token de autenticação.
export async function loginUser(data: LoginData): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return handleResponse<AuthResponse>(response);
}

// Salva o resultado do teste de digitação.
export async function saveTypingResult(data: TypingResultData, token: string) {
  const response = await fetch(`${API_URL}/typing-results`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  return handleResponse<{ message: string }>(response);
}

// Busca o histórico do usuário autenticado.
export async function getTypingResults(
  token: string,
): Promise<TypingResultsResponse> {
  const response = await fetch(`${API_URL}/typing-results`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse<TypingResultsResponse>(response);
}

// Busca o ranking para a duração selecionada.
export async function getRanking(
  token: string,
  duration: number,
): Promise<RankingResponse> {
  const response = await fetch(
    `${API_URL}/typing-results/ranking?duration=${duration}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return handleResponse<RankingResponse>(response);
}
