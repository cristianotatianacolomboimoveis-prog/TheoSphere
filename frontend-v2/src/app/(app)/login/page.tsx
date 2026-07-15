"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuth } from "@/hooks/useAuth";

const AuthModal = dynamic(() => import("@/components/AuthModal"), {
  ssr: false,
});

/**
 * Rota dedicada de login (/login).
 * Abre o AuthModal diretamente — link compartilhável para testadores.
 * Se o usuário já estiver autenticado, redireciona para a home.
 */
export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/");
    }
  }, [loading, isAuthenticated, router]);

  return (
    <div className="w-full h-full min-h-screen bg-background">
      <AuthModal isOpen onClose={() => router.push("/")} />
    </div>
  );
}
