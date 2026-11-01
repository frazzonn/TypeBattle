import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { ApiError, getCurrentUser, loginUser } from "../services/api";

interface User {
  id: number;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

interface AuthContextData {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateAvatar: (avatarUrl: string | null) => void;
}

interface AuthProviderProps {
  children: ReactNode;
}

const AuthContext = createContext<AuthContextData | undefined>(undefined);

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

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Indica se estamos recuperando a sessão salva.
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY);
    let isActive = true;

    if (savedToken && savedUser) {
      try {
        if (isTokenExpired(savedToken)) {
          throw new Error("Sessão expirada.");
        }

        setToken(savedToken);
        setUser(JSON.parse(savedUser) as User);

        // Confere a sessão no backend e atualiza nome/foto em segundo plano.
        getCurrentUser(savedToken)
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
      } catch {
        // Remove os dados inválidos ou expirados do localStorage.
        clearStoredSession();
      }
    }

    setIsLoading(false);

    return () => {
      isActive = false;
    };
  }, []);

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
        isLoading,
        login,
        logout,
        updateAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  }

  return context;
}
