"use client";

import { DashboardCard } from "./DashboardCard";
import { ReadingPlanWidget, TheologicalInsightsWidget, WordOfTheDayWidget } from "./DashboardWidgets";
import { motion } from "framer-motion";
import { Library, Download, BookOpen, Clock, ScrollText, Sparkles, BookMarked } from "lucide-react";

import { useTrackContext } from "@/hooks/useTrackContext";

export default function DashboardHome() {
  useTrackContext({
    pageId: "dashboard",
    title: "Dashboard Principal",
    metadata: {
      contentSummary: "Visão geral do sistema, atalhos rápidos e ferramentas de estudo.",
    }
  });

  return (
    <div className="flex-grow overflow-y-auto custom-scrollbar bg-[#F3F4F6] dark:bg-[#05080F] p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Welcome Section / Logos Academic Header */}
        <div className="mb-10 flex items-end justify-between border-b border-gray-300 dark:border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
                <BookMarked className="w-5 h-5 text-blue-600" />
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Theological Research OS</span>
            </div>
            <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-white tracking-tight">Boa tarde, Alex.</h1>
            <p className="text-gray-500 dark:text-white/40 text-sm mt-1">
                Sua jornada teológica continua hoje em <span className="text-blue-600 font-bold italic">Gênesis 32</span>.
            </p>
          </div>
          <div className="hidden md:flex gap-4 text-right">
             <div className="px-4 py-2 bg-white dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10 shadow-sm">
                <div className="text-[9px] font-bold text-gray-400 uppercase">Sessão Ativa</div>
                <div className="text-xs font-bold text-gray-700 dark:text-gray-200">2h 45m</div>
             </div>
             <div className="px-4 py-2 bg-white dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10 shadow-sm">
                <div className="text-[9px] font-bold text-gray-400 uppercase">Progresso Total</div>
                <div className="text-xs font-bold text-gray-700 dark:text-gray-200">14.2%</div>
             </div>
          </div>
        </div>

        {/* Modular Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          
          {/* Main Column */}
          <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            <DashboardCard title="Plano de Leitura Diário" subtitle="15 de Ago, 2026 — Plano M'Cheyne">
              <ReadingPlanWidget />
            </DashboardCard>

            <DashboardCard title="Insights Teológicos" subtitle="Feed: Cristologia, Soteriologia">
              <TheologicalInsightsWidget />
            </DashboardCard>

            <DashboardCard title="Acervo Bibliográfico" subtitle="412 Recursos Sincronizados" className="md:col-span-2">
              <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                  { label: "Logos Library", value: "85%", color: "bg-amber-500/10 text-amber-600", border: "border-amber-500/20" },
                  { label: "TheoSphere Cloud", value: "92%", color: "bg-blue-500/10 text-blue-600", border: "border-blue-500/20" },
                  { label: "Local Research", value: "78%", color: "bg-gray-500/10 text-gray-600", border: "border-gray-500/20" }
                ].map((stat) => (
                  <div key={stat.label} className={`p-4 rounded-xl ${stat.color} border ${stat.border} flex flex-col`}>
                    <span className="text-[9px] font-bold uppercase tracking-widest opacity-70">{stat.label}</span>
                    <div className="text-xl font-bold mt-1">{stat.value}</div>
                  </div>
                ))}
              </div>
              
              <div className="space-y-3">
                <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Sparkles className="w-3 h-3" /> Adições Recentes ao Corpus
                </h5>
                {[
                  { title: "BDAG Lexicon", size: "1.2 GB", icon: BookOpen },
                  { title: "IVP Commentary", size: "850 MB", icon: ScrollText }
                ].map((item) => (
                  <div key={item.title} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-white/5 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-md bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                        <item.icon className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-700 dark:text-white/80">{item.title}</div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase">{item.size}</div>
                      </div>
                    </div>
                    <button className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-white/10 text-gray-300 hover:text-gray-600 transition-all">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </DashboardCard>
          </div>

          {/* Side Column */}
          <div className="space-y-6">
            <DashboardCard title="Lema Acadêmico">
              <WordOfTheDayWidget />
            </DashboardCard>

            <DashboardCard title="Sessões Recentes">
              <div className="space-y-3">
                {[
                  { ref: "João 1:1-18", time: "Há 2 horas", tool: "Exegese" },
                  { ref: "A Aliança Abraâmica", time: "Há 5 horas", tool: "Atlas 4D" },
                  { ref: "Salmo 23", time: "Ontem", tool: "Leitura Devocional" }
                ].map((session) => (
                  <div key={session.ref} className="flex items-center gap-4 p-3 rounded-lg hover:bg-white dark:hover:bg-white/5 border border-transparent hover:border-gray-200 dark:hover:border-white/10 transition-all cursor-pointer group">
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-800 dark:text-white/80">{session.ref}</div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{session.tool} • {session.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </DashboardCard>
          </div>

        </div>
      </div>
    </div>
  );
}
