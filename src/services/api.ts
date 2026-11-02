const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000/api")
  .trim()
  .replace(/\/+$/, "");

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
  avatarUrl?: string | null;
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
  language: string;
  // Letra esperada -> quantas vezes errou nela.
  missedKeys?: Record<string, number>;
}

export interface TypingResult {
  id: number;
  userId: number;
  ppm: number;
  accuracy: number;
  errors: number;
  characters: number;
  duration: number;
  language?: string;
  missedKeys?: Record<string, number>;
  createdAt: string;
}

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
  language?: string;
  ranking: RankingEntry[];
}

export interface BattleResult {
  id: number;
  won: boolean;
  placement: number;
  players: number;
  ppm: number;
  accuracy: number;
  errors: number;
  duration: number;
  language: string;
  createdAt: string;
}

export interface BattleSummary {
  played: number;
  wins: number;
  losses: number;
  winRate: number;
  bestPpm: number;
  averagePpm: number;
}

export interface BattleResultsResponse {
  summary: BattleSummary;
  recent: BattleResult[];
}

interface UploadAvatarResponse {
  message: string;
  avatarUrl: string;
}

interface RemoveAvatarResponse {
  message: string;
  avatarUrl: string | null;
}

interface CurrentUserResponse {
  message: string;
  user: User;
}

// Erro da API com o status HTTP, para diferenciar 401 de falha de rede.
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// Trata as respostas da API e exibe a mensagem de erro do backend.
async function handleResponse<T>(response: Response): Promise<T> {
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof result?.message === "string"
        ? result.message
        : "Ocorreu um erro ao comunicar com o servidor.";

    throw new ApiError(message, response.status);
  }

  return result as T;
}

// Cadastra um usuário.
export async function registerUser(data: RegisterData): Promise<User> {
  const response = await fetch(`${API_URL}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return handleResponse<User>(response);
}

// Realiza o login.
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

// Busca os dados atuais do usuário dono do token.
export async function getCurrentUser(
  token: string,
): Promise<CurrentUserResponse> {
  const response = await fetch(`${API_URL}/auth/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse<CurrentUserResponse>(response);
}

// Envia a foto para o backend, que a armazena no Cloudinary.
export async function uploadAvatar(
  file: File,
  token: string,
): Promise<UploadAvatarResponse> {
  const formData = new FormData();
  formData.append("avatar", file);

  const response = await fetch(`${API_URL}/users/avatar`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  return handleResponse<UploadAvatarResponse>(response);
}

// Remove a foto de perfil do usuário autenticado.
export async function removeAvatar(
  token: string,
): Promise<RemoveAvatarResponse> {
  const response = await fetch(`${API_URL}/users/avatar`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse<RemoveAvatarResponse>(response);
}

// Salva o resultado de um teste de digitação.
export async function saveTypingResult(
  data: TypingResultData,
  token: string,
): Promise<{ message: string }> {
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

// Busca o histórico de testes do usuário autenticado.
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

// Busca o ranking para uma duração e um idioma.
export async function getRanking(
  duration: number,
  language: string,
): Promise<RankingResponse> {
  const params = new URLSearchParams({ duration: String(duration), language });
  const response = await fetch(`${API_URL}/typing-results/ranking?${params}`);

  return handleResponse<RankingResponse>(response);
}

// Resumo e partidas recentes da battle do usuário autenticado.
export async function getBattleResults(
  token: string,
): Promise<BattleResultsResponse> {
  const response = await fetch(`${API_URL}/battle-results`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse<BattleResultsResponse>(response);
}
