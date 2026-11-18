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
  // Visual da tag (classic, neon, gold, terminal...)
  style?: string;
  icon?: string | null;
}

export interface TagInput {
  name: string;
  color: string;
  style: string;
  icon: string | null;
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
  // Modo palavras: quantas palavras e quanto levou (ms).
  mode?: "time" | "words";
  wordCount?: number;
  durationMs?: number;
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
  // Modo palavras: quanto levou no melhor resultado.
  durationMs?: number | null;
}

export interface RankingResponse {
  mode?: "time" | "words";
  duration: number | null;
  wordCount?: number | null;
  language?: string;
  ranking: RankingEntry[];
}

export type ArcadeGame = "pavio" | "orbita" | "chase";

export interface ArcadeRankingEntry {
  position: number;
  userId: number;
  name: string;
  avatarUrl?: string | null;
  tags?: Tag[];
  // pavio: palavras · orbita: pontos · chase: milissegundos aguentados
  score: number;
  details: Record<string, number | string>;
}

export interface ArcadeRankingResponse {
  game: ArcadeGame;
  language: string;
  ranking: ArcadeRankingEntry[];
}

// Resultado de uma partida do Arcade (o servidor confere os números).
export type ArcadeResultData =
  | { game: "orbita"; score: number; letters: number; seconds: number; wave: number; bestCombo: number; killed: number; accuracy: number }
  | { game: "pavio"; words: string[]; seconds: number }
  | { game: "chase"; ms: number; characters: number; errors: number; accuracy: number; language: string };

export interface ArcadeRecord {
  played: number;
  best: { score: number; language: string; details: Record<string, number | string> } | null;
}

export interface UserRecords {
  words: {
    wordCount: number;
    played: number;
    best: { ppm: number; accuracy: number; durationMs: number | null; language: string } | null;
  }[];
  arcade: Record<ArcadeGame, ArcadeRecord>;
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

// Esqueci a senha: pede o código por email.
export async function forgotPassword(
  email: string,
): Promise<{ message: string; retryAfter: number }> {
  return handleResponse(await postJson("/auth/forgot-password", { email }));
}

// Troca a senha com o código do email e já devolve a sessão.
export async function resetPassword(data: {
  email: string;
  code: string;
  password: string;
}): Promise<AuthResponse> {
  return handleResponse<AuthResponse>(await postJson("/auth/reset-password", data));
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

// Busca o ranking do teste: modo tempo (por duração) ou palavras (por quantidade).
export async function getRanking(
  amount: number,
  language: string,
  mode: "time" | "words" = "time",
): Promise<RankingResponse> {
  const params = new URLSearchParams(
    mode === "words"
      ? { mode, wordCount: String(amount), language }
      : { duration: String(amount), language },
  );
  const response = await fetch(`${API_URL}/typing-results/ranking?${params}`);

  return handleResponse<RankingResponse>(response);
}

// Ranking de um jogo do Arcade (a perseguição é separada por idioma).
export async function getArcadeRanking(
  game: ArcadeGame,
  language?: string,
): Promise<ArcadeRankingResponse> {
  const params = new URLSearchParams({ game, ...(language ? { language } : {}) });
  const response = await fetch(`${API_URL}/arcade-results/ranking?${params}`);

  return handleResponse<ArcadeRankingResponse>(response);
}

// Salva uma partida do Arcade de quem está logado.
export async function saveArcadeResult(
  data: ArcadeResultData,
  token: string,
): Promise<{ message: string }> {
  const response = await fetch(`${API_URL}/arcade-results`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });

  return handleResponse<{ message: string }>(response);
}

// Recordes do modo palavras e do Arcade de um jogador.
export async function getUserRecords(
  userId: number,
  token?: string | null,
): Promise<UserRecords> {
  const response = await fetch(`${API_URL}/users/${userId}/records`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  return handleResponse<UserRecords>(response);
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
  data: TagInput,
  token: string,
): Promise<{ tag: AdminTag }> {
  return handleResponse(
    await adminRequest("/tags", token, { method: "POST", body: JSON.stringify(data) }),
  );
}

export async function updateAdminTag(
  tagId: number,
  data: Partial<TagInput>,
  token: string,
): Promise<{ tag: Tag }> {
  return handleResponse(
    await adminRequest(`/tags/${tagId}`, token, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
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
