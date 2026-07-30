"use client";

import React, { useState } from "react";
import { User, Bell, Lock, Globe, Moon, Shield, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useTrackContext } from "@/hooks/useTrackContext";
import { useAuth } from "@/hooks/useAuth";

export default function SettingsPage() {
  const router = useRouter();
  const { logout, isAuthenticated } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  // O botão existia sem onClick desde sempre — o usuário não conseguia
  // encerrar a sessão pela interface (varredura 2026-07-29).
  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      router.push("/login");
    } finally {
      setLoggingOut(false);
    }
  };

  useTrackContext({
    pageId: "settings",
    title: "Configurações",
    metadata: {
      contentSummary:
        "Configurações de perfil, notificações, segurança e preferências de interface.",
    },
  });

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <header className="mb-12">
        <h1 className="text-4xl font-bold text-white mb-2">Configurações</h1>
        <p className="text-gray-400">
          Gerencie sua conta, preferências e segurança.
        </p>
      </header>

      <div className="space-y-6">
        {[
          {
            title: "Perfil",
            desc: "Altere sua foto, nome e informações básicas.",
            icon: User,
          },
          {
            title: "Notificações",
            desc: "Escolha quais alertas você deseja receber.",
            icon: Bell,
          },
          {
            title: "Privacidade e Segurança",
            desc: "Gerencie sua senha e autenticação em duas etapas.",
            icon: Shield,
          },
          {
            title: "Preferências de Interface",
            desc: "Personalize o tema, fontes e idiomas da aplicação.",
            icon: Moon,
          },
          {
            title: "Conexões",
            desc: "Gerencie integrações com Google Drive e outras ferramentas.",
            icon: Globe,
          },
        ].map((setting, i) => (
          <motion.div
            key={setting.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center p-6 rounded-2xl bg-white/5 border border-white/10 opacity-60"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center mr-6">
              <setting.icon className="w-6 h-6 text-blue-500" />
            </div>
            <div className="flex-grow">
              <h3 className="text-lg font-bold text-white mb-1">
                {setting.title}
              </h3>
              <p className="text-sm text-gray-400">{setting.desc}</p>
            </div>
            {/* Estes painéis ainda não existem. Antes tinham hover e
                cursor-pointer, aparentando estar prontos. */}
            <div className="flex items-center gap-2 text-gray-600 shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-widest">
                Em breve
              </span>
              <Lock className="w-4 h-4" />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-12 pt-12 border-t border-white/5 flex justify-between items-center">
        <button
          onClick={handleLogout}
          disabled={loggingOut || !isAuthenticated}
          className="text-red-500 text-sm font-medium hover:underline disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loggingOut && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {loggingOut ? "Saindo..." : "Sair da Conta"}
        </button>
        <div className="text-xs text-gray-600">
          TheoSphere OS v2.0.4 - Silicon Valley Edition
        </div>
      </div>
    </div>
  );
}
