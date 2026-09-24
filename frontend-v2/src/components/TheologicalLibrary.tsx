"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Search,
  BookOpen,
  X,
  ExternalLink,
  Church,
  ScrollText,
  Sparkles,
  CheckCircle2,
  Library,
  MessageSquare,
  BookMarked,
  Layers,
  History,
  Languages,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useTheoStore } from "@/store/useTheoStore";
import { api } from "@/lib/api";
import {
  CLASSIC_THEOLOGICAL_CATALOG,
  ClassicWorkItem,
} from "@/data/classicCatalog";

interface TheologicalLibraryProps {
  onClose?: () => void;
}

const CATEGORIES = [
  { id: "all", label: "Todas as Obras", icon: Library },
  { id: "comentarios", label: "Comentários Exegéticos", icon: BookOpen },
  { id: "sistematica", label: "Teologia Sistemática", icon: Church },
  { id: "patristica", label: "Patrística & Concílios", icon: ScrollText },
  { id: "historia", label: "História & Judaísmo", icon: History },
  { id: "devocional", label: "Clássicos Devocionais", icon: Sparkles },
  { id: "referencia", label: "Dicionários & Léxicos", icon: Languages },
];

const TRADITIONS = [
  "Todas",
  "Reformada",
  "Puritana",
  "Escolástica",
  "Patrística",
  "Luterana",
  "Histórica",
];

const TRADITION_STYLES: Record<string, string> = {
  Reformada:
    "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  Puritana:
    "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
  Escolástica:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  Patrística:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  Luterana:
    "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
  Histórica:
    "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
  Referência:
    "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
  Devocional:
    "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30",
};

export default function TheologicalLibrary({
  onClose,
}: TheologicalLibraryProps) {
  const router = useRouter();
  const { setWorkspaceLayout, setActiveTool } = useTheoStore();
  const [works, setWorks] = useState<ClassicWorkItem[]>(
    CLASSIC_THEOLOGICAL_CATALOG,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeTradition, setActiveTradition] = useState("Todas");
  const [copilotModalBook, setCopilotModalBook] =
    useState<ClassicWorkItem | null>(null);
  const [copilotQuestion, setCopilotQuestion] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Opcionalmente sincroniza com a API do backend para contagens dinâmicas
  useEffect(() => {
    let isMounted = true;
    api
      .get<any>("/bible/catalog", { throwOnError: false })
      .then((res) => {
        if (isMounted && res?.success && res.data?.works) {
          setWorks(res.data.works);
        }
      })
      .catch((_err: any) => {
        if (isMounted) {
          setErrorMessage(
            "Catálogo sincronizado localmente (modo offline/cache).",
          );
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const totalChunks = useMemo(() => {
    return works.reduce((acc, curr) => acc + (curr.chunks || 0), 0);
  }, [works]);

  // Contagens por categoria
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: works.length };
    for (const w of works) {
      counts[w.category] = (counts[w.category] || 0) + 1;
    }
    return counts;
  }, [works]);

  // Filtragem dinâmica
  const filteredWorks = useMemo(() => {
    return works.filter((w) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        w.title.toLowerCase().includes(q) ||
        w.author.toLowerCase().includes(q) ||
        w.tradition.toLowerCase().includes(q) ||
        w.summary.toLowerCase().includes(q) ||
        w.gid.includes(q);

      const matchesCategory =
        activeCategory === "all" || w.category === activeCategory;

      const matchesTradition =
        activeTradition === "Todas" ||
        w.tradition.toLowerCase() === activeTradition.toLowerCase();

      return matchesSearch && matchesCategory && matchesTradition;
    });
  }, [works, searchQuery, activeCategory, activeTradition]);

  const handleOpenStudy = (work: ClassicWorkItem) => {
    if (work.category === "comentarios") {
      router.push("/study");
    } else {
      setWorkspaceLayout("copilot");
      setActiveTool("exegesis");
      router.push("/study");
    }
  };

  const handleAskCopilot = (work: ClassicWorkItem) => {
    setCopilotModalBook(work);
    setCopilotQuestion(`O que ${work.author} ensina em "${work.title}" sobre `);
  };

  const handleSubmitCopilot = () => {
    if (!copilotModalBook) return;
    setWorkspaceLayout("copilot");
    setActiveTool("exegesis");
    router.push("/study");
  };

  return (
    <div className="flex flex-col h-full bg-[#FCFBF7] dark:bg-[#090C10] text-gray-900 dark:text-gray-100 overflow-hidden">
      {/* ── Header Principal Logos Style ── */}
      <div className="px-8 pt-8 pb-6 bg-white/70 dark:bg-[#0D1117]/80 backdrop-blur-md border-b border-gray-200 dark:border-white/10 shadow-sm z-20">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Library className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-serif font-bold tracking-tight text-gray-900 dark:text-white">
                  Biblioteca Teológica Clássica
                </h1>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Domínio Público Canônico
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Acervo de 89 obras de patrística, reforma, puritanismo e exegese
                indexadas na base vetorial RAG
              </p>
              {errorMessage && (
                <p
                  role="alert"
                  className="text-[11px] text-amber-500 font-medium mt-1"
                >
                  ⚠️ {errorMessage}
                </p>
              )}
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
              title="Fechar Biblioteca"
            >
              <X className="w-5 h-5 text-gray-400 hover:text-gray-900 dark:hover:text-white" />
            </button>
          )}
        </div>

        {/* ── Banner de Métricas em Tempo Real ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/10">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
              Obras Canônicas
            </span>
            <span className="text-xl font-black text-gray-900 dark:text-white">
              {works.length} Obras
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/10">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
              Trechos Vetorizados (768d)
            </span>
            <span className="text-xl font-black text-blue-600 dark:text-blue-400">
              {totalChunks.toLocaleString("pt-BR")} Chunks
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/10">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
              Portão de Licença
            </span>
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              100% Fail-Closed
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/10">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
              Integração Ativa
            </span>
            <span className="text-xl font-black text-purple-600 dark:text-purple-400">
              Copilot RAG & Guia
            </span>
          </div>
        </div>

        {/* ── Barra de Busca e Filtros ── */}
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-grow w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por autor (Calvino, Henry, Aquino), título (Salmos, Summa, Institutas) ou tradição..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Filtro de Tradição Teológica */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap mr-1">
              Tradição:
            </span>
            {TRADITIONS.map((trad) => (
              <button
                key={trad}
                onClick={() => setActiveTradition(trad)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border ${
                  activeTradition === trad
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                {trad}
              </button>
            ))}
          </div>
        </div>

        {/* ── Abas de Categoria com Badges Numéricos ── */}
        <div className="flex items-center gap-2 overflow-x-auto mt-4 pt-3 border-t border-gray-100 dark:border-white/[0.05]">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const count = categoryCounts[cat.id] || 0;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border ${
                  isActive
                    ? "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
                    : "bg-transparent border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 dark:bg-white/10 text-gray-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Grid de Obras Teológicas ── */}
      <div className="flex-grow overflow-y-auto p-8 custom-scrollbar-academic">
        {filteredWorks.length === 0 ? (
          <div className="text-center py-24 space-y-3">
            <BookMarked className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" />
            <p className="text-sm font-semibold text-gray-500">
              Nenhuma obra encontrada para esta busca ou filtro.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setActiveCategory("all");
                setActiveTradition("Todas");
              }}
              className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
            >
              Redefinir filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-7xl mx-auto">
            {filteredWorks.map((work) => {
              const tradStyle =
                TRADITION_STYLES[work.tradition] ||
                "bg-gray-500/10 text-gray-400 border-gray-500/30";

              return (
                <div
                  key={work.gid + work.title}
                  className="flex flex-col justify-between p-5 rounded-2xl bg-white dark:bg-[#0D1117]/60 border border-gray-200 dark:border-white/10 shadow-sm hover:shadow-xl hover:border-blue-500/40 transition-all group"
                >
                  <div className="space-y-3">
                    {/* Header do Card */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${tradStyle}`}
                      >
                        {work.tradition}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {work.chunks.toLocaleString()} chunks
                      </span>
                    </div>

                    {/* Título & Autor */}
                    <div>
                      <h3 className="font-serif font-bold text-base text-gray-900 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {work.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                          {work.author}
                        </span>
                        <span className="text-gray-300 dark:text-gray-600">
                          •
                        </span>
                        <span className="text-[11px] text-gray-400 font-mono">
                          {work.year}
                        </span>
                      </div>
                    </div>

                    {/* Sumário */}
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-3">
                      {work.summary}
                    </p>
                  </div>

                  {/* Ações no Card */}
                  <div className="pt-4 mt-4 border-t border-gray-100 dark:border-white/[0.05] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleAskCopilot(work)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-all shadow-sm"
                        title="Perguntar ao Copilot IA usando esta obra"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Copilot</span>
                      </button>

                      <button
                        onClick={() => handleOpenStudy(work)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 hover:border-blue-500/40 text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
                        title="Ver no Estudo Bíblico / Guia Exegético"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Estudo</span>
                      </button>
                    </div>

                    {work.readUrl && (
                      <a
                        href={work.readUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                        title="Abrir no Project Gutenberg / CCEL (Domínio Público)"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal de Pergunta Rápida para o Copilot ── */}
      <AnimatePresence>
        {copilotModalBook && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-white dark:bg-[#161B22] rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/[0.05] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600/10 text-blue-600 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                      Consultar Copilot IA
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      Raciocínio ancorado em: {copilotModalBook.title}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setCopilotModalBook(null)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                  Sua Pergunta Teológica:
                </label>
                <textarea
                  value={copilotQuestion}
                  onChange={(e) => setCopilotQuestion(e.target.value)}
                  rows={4}
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="Ex: O que Calvino argumenta sobre a justificação pela fé em Romanos?"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setCopilotModalBook(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmitCopilot}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-md transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Enviar para Bancada Copilot</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
