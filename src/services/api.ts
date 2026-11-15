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

export interface Tag {
  id: number;
  name: string;
  // Cor em hexadecimal (#rrggbb)
  color: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  avatarUrl?: string | null;
  isAdmin?: boolean;
  tags?: Tag[];
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
  avatarUrl?: string | null;
  tags?: Tag[];
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
// code: motivo vindo do backend (ex.: EMAIL_NOT_VERIFIED, ACCOUNT_BANNED).
export class ApiError extends Error {
  status: number;
  code?: string;
  retryAfter?: number;

  constructor(message: string, status: number, code?: string, retryAfter?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
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

    throw new ApiError(
      message,
      response.status,
      typeof result?.code === "string" ? result.code : undefined,
      typeof result?.retryAfter === "number" ? result.retryAfter : undefined,
    );
  }

  return result as T;
}

interface RegisterResponse extends User {
  needsVerification: boolean;
  emailSent: boolean;
}

// Cadastra um usuário (a conta só entra depois de confirmar o email).
export async function registerUser(data: RegisterData): Promise<RegisterResponse> {
  const response = await fetch(`${API_URL}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return handleResponse<RegisterResponse>(response);
}

function postJson(path: string, body: unknown, token?: string) {
  return fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

// Confirma o email com o código de 6 dígitos e já devolve a sessão.
export async function verifyEmail(data: {
  email: string;
  code: string;
  password: string;
}): Promise<AuthResponse> {
  return handleResponse<AuthResponse>(await postJson("/auth/verify-email", data));
}

// Pede outro código de verificação.
export async function resendVerification(
  email: string,
): Promise<{ message: string; retryAfter: number }> {
  return handleResponse(await postJson("/auth/resend-verification", { email }));
}

// Troca o nome do usuário autenticado.
export async function updateMyName(
  name: string,
  token: string,
): Promise<{ message: string; name: string }> {
  const response = await fetch(`${API_URL}/users/me/name`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name }),
  });

  return handleResponse(response);
}

export interface PublicProfile {
  user: {
    id: number;
    name: string;
    avatarUrl: string | null;
    createdAt: string;
    tags: Tag[];
  };
  results: TypingResult[];
  battle: BattleResultsResponse;
}

// Perfil público de qualquer jogador (o admin também vê contas banidas).
export async function getPublicProfile(
  userId: number,
  token?: string | null,
): Promise<PublicProfile> {
  const response = await fetch(`${API_URL}/users/${userId}/profile`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  return handleResponse<PublicProfile>(response);
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

// ---------- Admin ----------

export interface AdminTag extends Tag {
  // Quantos usuários têm a tag
  users: number;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  avatarUrl: string | null;
  banned: boolean;
  emailVerified: boolean;
  tags: Tag[];
}

export interface AdminUserInfo {
  id: number;
  email: string;
  emailVerified: boolean;
  banned: boolean;
  isAdmin: boolean;
}

function adminRequest(path: string, token: string, init: RequestInit = {}) {
  return fetch(`${API_URL}/admin${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function getAdminTags(token: string): Promise<{ tags: AdminTag[] }> {
  return handleResponse(await adminRequest("/tags", token));
}

export async function createAdminTag(
  data: { name: string; color: string },
  token: string,
): Promise<{ tag: AdminTag }> {
  return handleResponse(
    await adminRequest("/tags", token, { method: "POST", body: JSON.stringify(data) }),
  );
}

export async function deleteAdminTag(tagId: number, token: string): Promise<void> {
  const response = await adminRequest(`/tags/${tagId}`, token, { method: "DELETE" });
  if (response.status !== 204) await handleResponse(response);
}

export async function getAdminUsers(
  search: string,
  token: string,
): Promise<{ users: AdminUser[] }> {
  const params = new URLSearchParams({ search });
  return handleResponse(await adminRequest(`/users?${params}`, token));
}

export async function addUserTag(
  userId: number,
  tagId: number,
  token: string,
): Promise<{ tags: Tag[] }> {
  return handleResponse(
    await adminRequest(`/users/${userId}/tags`, token, {
      method: "POST",
      body: JSON.stringify({ tagId }),
    }),
  );
}

export async function removeUserTag(
  userId: number,
  tagId: number,
  token: string,
): Promise<{ tags: Tag[] }> {
  return handleResponse(
    await adminRequest(`/users/${userId}/tags/${tagId}`, token, { method: "DELETE" }),
  );
}

export async function getAdminUserInfo(
  userId: number,
  token: string,
): Promise<AdminUserInfo> {
  return handleResponse(await adminRequest(`/users/${userId}`, token));
}

export async function updateAdminUser(
  userId: number,
  data: { name?: string; banned?: boolean },
  token: string,
): Promise<{ user: { id: number; name: string; banned: boolean } }> {
  return handleResponse(
    await adminRequest(`/users/${userId}`, token, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  );
}

async function adminDelete(path: string, token: string): Promise<void> {
  const response = await adminRequest(path, token, { method: "DELETE" });
  if (response.status !== 204) await handleResponse(response);
}

export function deleteAdminUser(userId: number, token: string): Promise<void> {
  return adminDelete(`/users/${userId}`, token);
}

export function deleteAdminUserResults(userId: number, token: string): Promise<void> {
  return adminDelete(`/users/${userId}/results`, token);
}

export function deleteAdminTypingResult(
  userId: number,
  resultId: number,
  token: string,
): Promise<void> {
  return adminDelete(`/users/${userId}/typing-results/${resultId}`, token);
}
