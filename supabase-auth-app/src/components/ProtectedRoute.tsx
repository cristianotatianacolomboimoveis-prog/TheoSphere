import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white font-sans">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-sky-400" />
          <p className="text-sm font-semibold tracking-wider text-slate-400 uppercase animate-pulse">
            Carregando Sessão...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect non-authenticated users to home/login
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
