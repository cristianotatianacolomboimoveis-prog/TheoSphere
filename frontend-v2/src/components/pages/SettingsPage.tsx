"use client";

import React from "react";
import { User, Bell, Lock, Globe, Moon, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { useTrackContext } from "@/hooks/useTrackContext";

export default function SettingsPage() {
  useTrackContext({
    pageId: "settings",
    title: "Configurações",
    metadata: {
      contentSummary: "Configurações de perfil, notificações, segurança e preferências de interface.",
    }
  });

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <header className="mb-12">
        <h1 className="text-4xl font-bold text-white mb-2">Configurações</h1>
        <p className="text-gray-400">Gerencie sua conta, preferências e segurança.</p>
      </header>

      <div className="space-y-6">
        {[
          { title: "Perfil", desc: "Altere sua foto, nome e informações básicas.", icon: User },
          { title: "Notificações", desc: "Escolha quais alertas você deseja receber.", icon: Bell },
          { title: "Privacidade e Segurança", desc: "Gerencie sua senha e autenticação em duas etapas.", icon: Shield },
          { title: "Preferências de Interface", desc: "Personalize o tema, fontes e idiomas da aplicação.", icon: Moon },
          { title: "Conexões", desc: "Gerencie integrações com Google Drive e outras ferramentas.", icon: Globe },
        ].map((setting, i) => (
          <motion.div
            key={setting.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center mr-6 group-hover:bg-blue-600/20 transition-colors">
              <setting.icon className="w-6 h-6 text-blue-500" />
            </div>
            <div className="flex-grow">
              <h3 className="text-lg font-bold text-white mb-1">{setting.title}</h3>
              <p className="text-sm text-gray-400">{setting.desc}</p>
            </div>
            <div className="text-gray-600 group-hover:text-white transition-colors">
              <Lock className="w-4 h-4" />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-12 pt-12 border-t border-white/5 flex justify-between items-center">
        <button className="text-red-500 text-sm font-medium hover:underline">Sair da Conta</button>
        <div className="text-xs text-gray-600">TheoSphere OS v2.0.4 - Silicon Valley Edition</div>
      </div>
    </div>
  );
}
