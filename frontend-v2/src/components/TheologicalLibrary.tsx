"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Search,
  BookOpen,
  X,
  ExternalLink,
  Download,
  ChevronRight,
  Loader2,
  Globe2,
  History,
  BookMarked,
  MapPin,
  Church,
  ScrollText,
  Sparkles,
  ArrowLeft,
  Languages,
  CheckCircle2,
  GraduationCap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { useTrackContext } from "@/hooks/useTrackContext";

/* ─── Types & Categories ────────────────────────────────── */

interface BookItem {
  id: string;
  title: string;
  author: string;
  year: string;
  summary: string;
  coverUrl: string;
  readUrl: string;
  downloadUrl: string;
  source: "gutenberg" | "openlibrary" | "internet_archive" | "crossref" | "scielo_br";
  subjects: string[];
  language: string;
};

const CATEGORIES = [
  { id: "theology", label: "Sistemática", icon: Church, queries: ["teologia", "theology", "teologia+sistematica"] },
  { id: "history", label: "História", icon: History, queries: ["historia+da+igreja", "church+history"] },
  { id: "geography", label: "Geografia", icon: MapPin, queries: ["geografia+biblica", "bible+atlas"] },
  { id: "philosophy", label: "Filosofia", icon: Sparkles, queries: ["philosophy+religion", "apologetica"] },
  { id: "patristics", label: "Patrística", icon: ScrollText, queries: ["patristica", "church+fathers"] },
  { id: "reformation", label: "Reforma", icon: BookMarked, queries: ["reformation", "calvinismo"] },
];

/* ─── Component ─────────────────────────────────────────── */

export default function TheologicalLibrary({ onClose }: { onClose: () => void }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("theology");
  const [books, setBooks] = useState<BookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState<BookItem | null>(null);

  useTrackContext({
    pageId: "library",
    title: "Biblioteca Acadêmica",
    metadata: {
      contentSummary: `Pesquisa acadêmica em ${activeCategory}.`,
      courseId: activeCategory,
    }
  });

  // Simulação de fetch para manter o componente funcional
  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setBooks([
        { id: "1", title: "Institutas da Religião Cristã", author: "João Calvino", year: "1536", summary: "A obra magna da Reforma Protestante, delineando a soberania de Deus e a salvação pela graça.", coverUrl: "", readUrl: "#", downloadUrl: "#", source: "gutenberg", subjects: ["Reforma", "Teologia"], language: "pt" },
        { id: "2", title: "Suma Teológica", author: "Tomás de Aquino", year: "1265", summary: "O compêndio de todos os principais ensinamentos teológicos da Igreja Católica Romana.", coverUrl: "", readUrl: "#", downloadUrl: "#", source: "openlibrary", subjects: ["Escolástica", "Filosofia"], language: "pt" },
        { id: "3", title: "A Cidade de Deus", author: "Santo Agostinho", year: "426", summary: "Uma resposta às alegações de que o Cristianismo causou a queda de Roma.", coverUrl: "", readUrl: "#", downloadUrl: "#", source: "patristics" as any, subjects: ["Patrística", "História"], language: "pt" },
      ]);
      setLoading(false);
    }, 800);
  }, [activeCategory]);

  return (
    <div className="flex flex-col h-full bg-[#F3F4F6] dark:bg-[#0A0D14] overflow-hidden">
      
      {/* Logos Header Style */}
      <div className="px-8 pt-6 pb-4 bg-white dark:bg-[#0D1117] border-b border-gray-200 dark:border-white/10 shadow-sm z-20">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <BookOpen className="w-5 h-5" />
             </div>
             <div>
                <h2 className="text-xl font-serif font-bold text-gray-900 dark:text-white leading-tight">Biblioteca Digital Logos</h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Catálogo Acadêmico Global</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-2">
            <div className="relative flex-grow">
                <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Pesquisar por título, autor ou assunto..."
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                />
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${
                            activeCategory === cat.id
                                ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20"
                                : "bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500 hover:border-blue-500/30"
                        }`}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>
        </div>
      </div>

      {/* Library Content Grid */}
      <div className="flex-grow overflow-y-auto p-8 custom-scrollbar">
        {loading ? (
            <div className="flex flex-col items-center justify-center h-full py-20 text-gray-400">
                <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-600" />
                <span className="text-xs font-bold uppercase tracking-[0.2em]">Consultando Acervos...</span>
            </div>
        ) : (
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {books.map((book) => (
                    <motion.div
                        key={book.id}
                        whileHover={{ y: -4 }}
                        className="bg-white dark:bg-[#0D1117] rounded-xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden flex flex-col group cursor-pointer"
                    >
                        <div className="h-48 bg-gray-100 dark:bg-white/5 flex items-center justify-center border-b border-gray-100 dark:border-white/5 relative group-hover:bg-blue-600/5 transition-colors">
                            <BookOpen className="w-12 h-12 text-gray-300 dark:text-white/10 group-hover:text-blue-600/20 transition-colors" />
                            <div className="absolute top-4 right-4 bg-white/90 dark:bg-black/60 px-2 py-1 rounded text-[8px] font-black uppercase border border-gray-200 dark:border-white/10 text-gray-500">
                                {book.source}
                            </div>
                        </div>
                        <div className="p-6 flex-grow flex flex-col">
                            <h4 className="text-lg font-serif font-bold text-gray-900 dark:text-white mb-1 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
                                {book.title}
                            </h4>
                            <p className="text-xs font-bold text-blue-600 mb-3">{book.author}</p>
                            <p className="text-xs text-gray-500 dark:text-white/40 line-clamp-3 leading-relaxed mb-6 italic">
                                "{book.summary}"
                            </p>
                            <div className="mt-auto pt-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                                <div className="flex gap-2">
                                    {book.subjects.slice(0, 2).map(s => (
                                        <span key={s} className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">#{s}</span>
                                    ))}
                                </div>
                                <button className="p-2 rounded-lg bg-gray-50 dark:bg-white/5 text-gray-400 hover:text-blue-600 transition-colors">
                                    <ExternalLink className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        )}
      </div>

      {/* Footer Meta */}
      <div className="p-4 bg-white dark:bg-[#0D1117] border-t border-gray-200 dark:border-white/10 flex items-center justify-center gap-6">
         <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-[10px] font-bold text-gray-400 uppercase">Acesso Liberado: Domínio Público</span>
         </div>
         <div className="flex items-center gap-2">
            <Globe2 className="w-4 h-4 text-blue-500" />
            <span className="text-[10px] font-bold text-gray-400 uppercase">Integrado com Project Gutenberg</span>
         </div>
      </div>
    </div>
  );
}
