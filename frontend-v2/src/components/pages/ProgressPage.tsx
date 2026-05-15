"use client";

import React from "react";
import { Trophy, Star, CheckCircle, Target } from "lucide-react";
import { motion } from "framer-motion";
import { useTrackContext } from "@/hooks/useTrackContext";

export default function ProgressPage() {
  useTrackContext({
    pageId: "progress",
    title: "Progresso e Conquistas",
    metadata: {
      contentSummary: "Métricas de estudo, horas acumuladas e medalhas conquistadas.",
    }
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-12">
        <h1 className="text-4xl font-bold text-white mb-2">Seu Progresso</h1>
        <p className="text-gray-400">Acompanhe sua jornada de conhecimento e conquistas teológicas.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {[
          { label: "Cursos Concluídos", value: "12", icon: CheckCircle, color: "text-green-500" },
          { label: "Horas de Estudo", value: "148h", icon: Target, color: "text-blue-500" },
          { label: "Conquistas", value: "24", icon: Trophy, color: "text-yellow-500" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 rounded-2xl bg-white/5 border border-white/10"
          >
            <stat.icon className={`w-8 h-8 ${stat.color} mb-4`} />
            <div className="text-3xl font-bold text-white">{stat.value}</div>
            <div className="text-sm text-gray-400">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <section>
        <h2 className="text-2xl font-bold text-white mb-6">Conquistas Recentes</h2>
        <div className="space-y-4">
          {[
            { title: "Erudito de Gênesis", description: "Completou a leitura comentada de todo o livro de Gênesis.", date: "Há 2 dias" },
            { title: "Mestre da Exegese", description: "Utilizou a ferramenta de análise interlinear em 50 versículos diferentes.", date: "Há 1 semana" },
            { title: "Primeiros Passos", description: "Criou sua primeira nota de estudo vinculada a um versículo.", date: "Há 1 mês" },
          ].map((achievement, i) => (
            <motion.div
              key={achievement.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="flex items-center p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center mr-4">
                <Star className="w-6 h-6 text-yellow-500" />
              </div>
              <div className="flex-grow">
                <h3 className="text-white font-medium">{achievement.title}</h3>
                <p className="text-sm text-gray-400">{achievement.description}</p>
              </div>
              <div className="text-xs text-gray-500">{achievement.date}</div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
