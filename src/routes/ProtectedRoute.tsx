import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../contexts/useAuth";

export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();

  // A sessão salva já é lida na primeira renderização do AuthProvider.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
