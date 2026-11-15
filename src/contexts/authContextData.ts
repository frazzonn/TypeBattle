import { createContext } from "react";

import type { Tag } from "../services/api";

export interface User {
  id: number;
  name: string;
  email: string;
  avatarUrl?: string | null;
  // Só o email de admin recebe true (o backend confere de novo em cada rota).
  isAdmin?: boolean;
  tags?: Tag[];
}

export interface AuthContextData {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateAvatar: (avatarUrl: string | null) => void;
  updateName: (name: string) => void;
  // Usado depois de confirmar o email (o backend já devolve a sessão).
  startSession: (token: string, user: User) => void;
}

export const AuthContext = createContext<AuthContextData | undefined>(
  undefined,
);
