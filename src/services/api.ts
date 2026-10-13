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
}

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

interface UploadAvatarResponse {
  message: string;
  avatarUrl: string;
}

interface RemoveAvatarResponse {
  message: string;
  avatarUrl: string | null;
}

// Trata as respostas da API e exibe a mensagem de erro do backend.
async function handleResponse<T>(response: Response): Promise<T> {
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof result?.message === "string"
        ? result.message
        : "Ocorreu um erro ao comunicar com o servidor.";

    throw new Error(message);
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

// Busca o ranking para uma duração específica.
export async function getRanking(duration: number): Promise<RankingResponse> {
  const response = await fetch(
    `${API_URL}/typing-results/ranking?duration=${duration}`,
  );

  return handleResponse<RankingResponse>(response);
}
