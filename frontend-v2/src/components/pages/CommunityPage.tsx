"use client";

import React from "react";
import { MessageSquare, Users, Share2, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { useTrackContext } from "@/hooks/useTrackContext";

export default function CommunityPage() {
  useTrackContext({
    pageId: "community",
    title: "Comunidade",
    metadata: {
      contentSummary: "Fóruns de discussão, grupos de estudo e interações com a comunidade teológica.",
    }
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-12">
        <h1 className="text-4xl font-bold text-white mb-2">Comunidade</h1>
        <p className="text-gray-400">Conecte-se com outros estudantes e pesquisadores da TheoSphere.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Discussões Recentes</h2>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              Nova Discussão
            </button>
          </div>

          {[
            { author: "Pr. Marcos Oliveira", title: "Interpretação de Romanos 8:28 no contexto original", replies: 15, likes: 42, time: "2h atrás" },
            { author: "Dra. Helena Souza", title: "Novas descobertas sobre os Manuscritos do Mar Morto", replies: 28, likes: 89, time: "5h atrás" },
            { author: "João Silva", title: "Dúvida sobre o uso de Strong's para palavras gregas compostas", replies: 7, likes: 12, time: "1 dia atrás" },
          ].map((post, i) => (
            <motion.div
              key={post.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/30 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500" />
                <span className="text-sm font-medium text-white">{post.author}</span>
                <span className="text-xs text-gray-500">• {post.time}</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-4 group-hover:text-blue-400 transition-colors">{post.title}</h3>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <MessageSquare className="w-4 h-4" />
                  {post.replies} respostas
                </div>
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <TrendingUp className="w-4 h-4" />
                  {post.likes} curtidas
                </div>
                <div className="flex items-center gap-2 text-gray-400 text-sm ml-auto">
                  <Share2 className="w-4 h-4" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="space-y-6">
          <section className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Grupos Ativos
            </h3>
            <div className="space-y-4">
              {["Estudo de Grego", "Teologia Sistemática", "História da Igreja", "Exegese Avançada"].map((group) => (
                <div key={group} className="text-sm text-gray-400 hover:text-white cursor-pointer transition-colors flex items-center justify-between">
                  {group}
                  <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full">Ativo</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
