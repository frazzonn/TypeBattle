import { createContext } from "react";

export interface User {
  id: number;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export interface AuthContextData {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateAvatar: (avatarUrl: string | null) => void;
}

export const AuthContext = createContext<AuthContextData | undefined>(
  undefined,
);
