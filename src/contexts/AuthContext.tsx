import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { loginUser } from "../services/api";

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

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Indica se estamos recuperando a sessão salva.
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem("typebattle_token");
    const savedUser = localStorage.getItem("typebattle_user");

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser) as User);
      } catch {
        // Remove os dados inválidos do localStorage.
        localStorage.removeItem("typebattle_token");
        localStorage.removeItem("typebattle_user");
      }
    }

    setIsLoading(false);
  }, []);

  async function login(email: string, password: string) {
    const response = await loginUser({
      email,
      password,
    });

    setToken(response.token);
    setUser(response.user);

    // Persiste a sessão no navegador.
    localStorage.setItem("typebattle_token", response.token);
    localStorage.setItem("typebattle_user", JSON.stringify(response.user));
  }

  function updateAvatar(avatarUrl: string | null) {
    setUser((currentUser) => {
      if (!currentUser) return currentUser;

      const updatedUser = {
        ...currentUser,
        avatarUrl,
      };

      // Mantém a foto atualizada ao recarregar a página.
      localStorage.setItem("typebattle_user", JSON.stringify(updatedUser));

      return updatedUser;
    });
  }

  function logout() {
    setUser(null);
    setToken(null);

    // Remove os dados da sessão.
    localStorage.removeItem("typebattle_token");
    localStorage.removeItem("typebattle_user");
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
