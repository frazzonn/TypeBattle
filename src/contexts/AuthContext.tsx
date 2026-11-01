import { useEffect, useState, type ReactNode } from "react";

import { ApiError, getCurrentUser, loginUser } from "../services/api";
import { AuthContext, type User } from "./authContextData";

interface AuthProviderProps {
  children: ReactNode;
}

interface StoredSession {
  token: string;
  user: User;
}

const TOKEN_KEY = "typebattle_token";
const USER_KEY = "typebattle_user";

// Lê o campo exp do JWT sem validar a assinatura (isso é papel do backend).
function isTokenExpired(token: string): boolean {
  try {
    const payload = token.split(".")[1];
    if (!payload) return true;

    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const { exp } = JSON.parse(json) as { exp?: number };

    return typeof exp === "number" && exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

function clearStoredSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// Recupera a sessão salva no navegador, descartando dados inválidos ou expirados.
function readStoredSession(): StoredSession | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY);

    if (!token || !savedUser) return null;

    if (isTokenExpired(token)) {
      clearStoredSession();
      return null;
    }

    return { token, user: JSON.parse(savedUser) as User };
  } catch {
    clearStoredSession();
    return null;
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Lida uma única vez, já na primeira renderização.
  const [storedSession] = useState(readStoredSession);
  const [user, setUser] = useState<User | null>(storedSession?.user ?? null);
  const [token, setToken] = useState<string | null>(
    storedSession?.token ?? null,
  );

  // Confere a sessão salva no backend e atualiza nome/foto em segundo plano.
  useEffect(() => {
    if (!storedSession) return;

    let isActive = true;

    getCurrentUser(storedSession.token)
      .then((response) => {
        // Versões antigas do backend não retornam o nome no /me.
        if (!isActive || typeof response.user?.name !== "string") return;

        setUser(response.user);
        localStorage.setItem(USER_KEY, JSON.stringify(response.user));
      })
      .catch((error: unknown) => {
        // Só encerra a sessão se o backend recusar o token;
        // falhas de rede mantêm o usuário logado.
        if (!isActive || !(error instanceof ApiError)) return;
        if (error.status !== 401) return;

        setUser(null);
        setToken(null);
        clearStoredSession();
      });

    return () => {
      isActive = false;
    };
  }, [storedSession]);

  async function login(email: string, password: string) {
    const response = await loginUser({
      email,
      password,
    });

    setToken(response.token);
    setUser(response.user);

    // Persiste a sessão no navegador.
    localStorage.setItem(TOKEN_KEY, response.token);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
  }

  function updateAvatar(avatarUrl: string | null) {
    setUser((currentUser) => {
      if (!currentUser) return currentUser;

      const updatedUser = {
        ...currentUser,
        avatarUrl,
      };

      // Mantém a foto atualizada ao recarregar a página.
      localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));

      return updatedUser;
    });
  }

  function logout() {
    setUser(null);
    setToken(null);

    // Remove os dados da sessão.
    clearStoredSession();
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token),
        login,
        logout,
        updateAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
