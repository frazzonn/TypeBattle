const API_URL = "http://localhost:3000/api";

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

export async function registerUser(data: RegisterData) {
  const response = await fetch(`${API_URL}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Erro ao cadastrar usuário.");
  }

  return result;
}

export async function loginUser(data: LoginData): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Erro ao realizar login.");
  }

  return result;
}

// Salva o resultado do teste de digitação
export async function saveTypingResult(data: TypingResultData, token: string) {
  const response = await fetch(`${API_URL}/typing-results`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Erro ao salvar resultado.");
  }

  return result;
}

// Busca o histórico de testes do usuário autenticado
export async function getTypingResults(token: string) {
  const response = await fetch(`${API_URL}/typing-results`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Erro ao buscar resultados.");
  }

  return result;
}
export async function getRanking(token: string, duration: number) {
  const response = await fetch(
    `${API_URL}/typing-results/ranking?duration=${duration}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Erro ao buscar ranking.");
  }

  return result;
}
