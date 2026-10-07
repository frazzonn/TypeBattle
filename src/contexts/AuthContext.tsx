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
}

interface AuthContextData {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

interface AuthProviderProps {
  children: ReactNode;
}

const AuthContext = createContext<AuthContextData | undefined>(undefined);

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Indica se ainda estamos recuperando a sessão
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem("typebattle_token");

    const savedUser = localStorage.getItem("typebattle_user");

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        // Remove dados inválidos do localStorage
        localStorage.removeItem("typebattle_token");
        localStorage.removeItem("typebattle_user");
      }
    }

    // Finaliza a recuperação da sessão
    setIsLoading(false);
  }, []);

  async function login(email: string, password: string) {
    const response = await loginUser({
      email,
      password,
    });

    setToken(response.token);
    setUser(response.user);

    // Persiste a sessão
    localStorage.setItem("typebattle_token", response.token);

    localStorage.setItem("typebattle_user", JSON.stringify(response.user));
  }

  function logout() {
    setUser(null);
    setToken(null);

    // Remove a sessão
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
