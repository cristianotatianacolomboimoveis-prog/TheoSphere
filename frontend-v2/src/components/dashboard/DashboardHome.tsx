"use client";

import Link from "next/link";
import { DashboardCard } from "./DashboardCard";
import {
  ReadingPlanWidget,
  TheologicalInsightsWidget,
  WordOfTheDayWidget,
} from "./DashboardWidgets";
import {
  BookOpen,
  ScrollText,
  Sparkles,
  BookMarked,
  Globe2,
  Landmark,
  Languages,
  Library,
} from "lucide-react";

import { useTrackContext } from "@/hooks/useTrackContext";
import { useTheoStore } from "@/store/useTheoStore";

/**
 * Dashboard inicial.
 * QA 2026-07-14: removidos todos os dados fictícios ("Alex", sessão 2h45m,
 * progresso 14.2%, acervos falsos). Agora exibe apenas dados reais:
 * posição de leitura persistida do usuário e estatísticas verdadeiras
 * da plataforma.
 */

/** Saudação conforme o horário local do usuário. */
function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "Boa madrugada";
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

/** Estatísticas reais da plataforma (conteúdo efetivamente no banco). */
const PLATFORM_STATS = [
  {
    label: "Traduções",
    value: "7",
    color: "bg-amber-500/10 text-amber-600",
    border: "border-amber-500/20",
  },
  {
    label: "Palavras interlineares",
    value: "425 mil",
    color: "bg-blue-500/10 text-blue-600",
    border: "border-blue-500/20",
  },
  {
    label: "Descobertas arqueológicas",
    value: "102",
    color: "bg-emerald-500/10 text-emerald-600",
    border: "border-emerald-500/20",
  },
];

const RECENT_ADDITIONS = [
  {
    title: "Interlinear Grego & Hebraico",
    detail: "STEP Bible / Tyndale House (CC BY 4.0)",
    icon: Languages,
    href: "/study",
  },
  {
    title: "Bíblia Livre e NVA em português",
    detail: "Traduções de licença livre",
    icon: BookOpen,
    href: "/study",
  },
  {
    title: "Acervo Arqueológico",
    detail: "102 descobertas ligadas ao texto",
    icon: Landmark,
    href: "/study",
  },
];

const QUICK_START = [
  {
    ref: "Leitor Bíblico",
    tool: "Estudo com interlinear",
    href: "/study",
    icon: BookOpen,
  },
  {
    ref: "Atlas 3D",
    tool: "Geografia bíblica no globo",
    href: "/atlas",
    icon: Globe2,
  },
  {
    ref: "Biblioteca",
    tool: "Clássicos de domínio público",
    href: "/library",
    icon: Library,
  },
  {
    ref: "Exegese",
    tool: "Análise versículo a versículo",
    href: "/exegete",
    icon: ScrollText,
  },
];

export default function DashboardHome() {
  useTrackContext({
    pageId: "dashboard",
    title: "Dashboard Principal",
    metadata: {
      contentSummary:
        "Visão geral do sistema, atalhos rápidos e ferramentas de estudo.",
    },
  });

  const { activeBook, activeChapter } = useTheoStore();

  return (
    <div className="flex-grow overflow-y-auto custom-scrollbar bg-[#F3F4F6] dark:bg-[#05080F] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Cabeçalho de boas-vindas — dados reais do usuário */}
        <div className="mb-10 flex items-end justify-between border-b border-gray-300 dark:border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BookMarked className="w-5 h-5 text-blue-600" />
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">
                Theological Research OS
              </span>
            </div>
            <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-white tracking-tight">
              {greeting()}.
            </h1>
            <p className="text-gray-500 dark:text-white/40 text-sm mt-1">
              Sua leitura continua em{" "}
              <Link
                href="/study"
                className="text-blue-600 font-bold italic hover:underline"
              >
                {activeBook} {activeChapter}
              </Link>
              .
            </p>
          </div>
          <div className="hidden md:flex gap-4 text-right">
            <div className="px-4 py-2 bg-white dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10 shadow-sm">
              <div className="text-[9px] font-bold text-gray-400 uppercase">
                Versão
              </div>
              <div className="text-xs font-bold text-amber-600">Beta</div>
            </div>
            <Link
              href="/sobre"
              className="px-4 py-2 bg-white dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10 shadow-sm hover:border-blue-400 transition-colors"
            >
              <div className="text-[9px] font-bold text-gray-400 uppercase">
                Sobre
              </div>
              <div className="text-xs font-bold text-gray-700 dark:text-gray-200">
                Licenças & Contato
              </div>
            </Link>
          </div>
        </div>

        {/* Grid modular */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Coluna principal */}
          <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            <DashboardCard
              title="Plano de Leitura Diário"
              subtitle="Sugestão de leitura sistemática"
            >
              <ReadingPlanWidget />
            </DashboardCard>

            <DashboardCard
              title="Insights Teológicos"
              subtitle="Feed: Cristologia, Soteriologia"
            >
              <TheologicalInsightsWidget />
            </DashboardCard>

            <DashboardCard
              title="Acervo da Plataforma"
              subtitle="Conteúdo de licença livre, disponível a todos"
              className="md:col-span-2"
            >
              <div className="grid grid-cols-3 gap-4 mb-8">
                {PLATFORM_STATS.map((stat) => (
                  <div
                    key={stat.label}
                    className={`p-4 rounded-xl ${stat.color} border ${stat.border} flex flex-col`}
                  >
                    <span className="text-[9px] font-bold uppercase tracking-widest opacity-70">
                      {stat.label}
                    </span>
                    <div className="text-xl font-bold mt-1">{stat.value}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Sparkles className="w-3 h-3" /> Adições Recentes ao Corpus
                </h5>
                {RECENT_ADDITIONS.map((item) => (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-white/5 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-md bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                        <item.icon className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-700 dark:text-white/80">
                          {item.title}
                        </div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase">
                          {item.detail}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </DashboardCard>
          </div>

          {/* Coluna lateral */}
          <div className="space-y-6">
            <DashboardCard title="Lema Acadêmico">
              <WordOfTheDayWidget />
            </DashboardCard>

            <DashboardCard title="Comece por Aqui">
              <div className="space-y-3">
                {QUICK_START.map((item) => (
                  <Link
                    key={item.ref}
                    href={item.href}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-white dark:hover:bg-white/5 border border-transparent hover:border-gray-200 dark:hover:border-white/10 transition-all cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                      <item.icon className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-800 dark:text-white/80">
                        {item.ref}
                      </div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                        {item.tool}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </DashboardCard>
          </div>
        </div>
      </div>
    </div>
  );
}
