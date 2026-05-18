"use client";

import React, { useEffect, useState } from "react";
import {
  Search,
  BookOpen,
  X,
  ExternalLink,
  Download,
  Loader2,
  Globe2,
  History,
  BookMarked,
  MapPin,
  Church,
  ScrollText,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Binary
} from "lucide-react";
import { motion } from "framer-motion";

import { useTrackContext } from "@/hooks/useTrackContext";
import { api } from "@/lib/api";

/* ─── Types & Categories ────────────────────────────────── */

interface BookItem {
  id: string;
  title: string;
  author: string;
  year: string;
  summary: string;
  readUrl: string;
  downloadUrl: string;
  source: string;
  subjects: string[];
  language: "pt" | "en";
  fileName: string;
  mimeType: string;
}

const CATEGORIES = [
  { id: "all", label: "Todos Clássicos", icon: BookOpen },
  { id: "theology", label: "Sistemática", icon: Church },
  { id: "patristics", label: "Patrística", icon: ScrollText },
  { id: "reformation", label: "Reforma", icon: BookMarked },
  { id: "philosophy", label: "Filosofia & Apologética", icon: Sparkles },
];

const PUBLIC_BOOKS: BookItem[] = [
  {
    id: "confissoes",
    title: "Confissões",
    author: "Santo Agostinho",
    year: "397 d.C.",
    summary: "A clássica jornada espiritual e autobiográfica de conversão de Santo Agostinho. Uma das obras fundamentais da patrística e da história ocidental.",
    readUrl: "https://www.gutenberg.org/ebooks/57134",
    downloadUrl: "https://www.gutenberg.org/ebooks/57134.epub.noimages",
    source: "Project Gutenberg",
    subjects: ["Patrística", "Teologia", "História"],
    language: "pt",
    fileName: "Confissoes - Santo Agostinho.epub",
    mimeType: "application/epub+zip"
  },
  {
    id: "peregrino",
    title: "O Peregrino",
    author: "John Bunyan",
    year: "1678",
    summary: "A mais famosa alegoria cristã de todos os tempos. Narra a jornada épica de 'Cristão' desde a Cidade da Destruição até a Cidade Celestial.",
    readUrl: "https://www.gutenberg.org/ebooks/39452",
    downloadUrl: "https://www.gutenberg.org/ebooks/39452.epub.noimages",
    source: "Project Gutenberg",
    subjects: ["Reforma", "Alegoria", "Vida Cristã"],
    language: "pt",
    fileName: "O Peregrino - John Bunyan.epub",
    mimeType: "application/epub+zip"
  },
  {
    id: "institutas",
    title: "Institutes of the Christian Religion (Vol. 1)",
    author: "João Calvino",
    year: "1559",
    summary: "A obra-prima sistemática da Reforma Protestante. Um compêndio completo da fé cristã, da soberania divina e dos sacramentos.",
    readUrl: "https://www.gutenberg.org/ebooks/66986",
    downloadUrl: "https://www.gutenberg.org/ebooks/66986.epub.noimages",
    source: "Project Gutenberg",
    subjects: ["Reforma", "Sistemática", "Calvinismo"],
    language: "en",
    fileName: "Institutas Volume 1 - Joao Calvino.epub",
    mimeType: "application/epub+zip"
  },
  {
    id: "suma",
    title: "Summa Theologiae (Part I)",
    author: "Tomás de Aquino",
    year: "1274",
    summary: "O maior clássico da teologia escolástica medieval, sintetizando primorosamente a filosofia aristotélica com a teologia bíblica clássica.",
    readUrl: "https://www.gutenberg.org/ebooks/17897",
    downloadUrl: "https://www.gutenberg.org/ebooks/17897.epub.noimages",
    source: "Project Gutenberg",
    subjects: ["Escolástica", "Filosofia", "Doutrina"],
    language: "en",
    fileName: "Suma Teologica Part 1 - Tomas de Aquino.epub",
    mimeType: "application/epub+zip"
  },
  {
    id: "sermaomonte",
    title: "O Sermão do Monte",
    author: "Charles Spurgeon",
    year: "1885",
    summary: "Uma exposição homilética magnífica e detalhada do 'Príncipe dos Pregadores' sobre os ensinamentos práticos e celestiais de Jesus.",
    readUrl: "https://www.gutenberg.org/ebooks/63346",
    downloadUrl: "https://www.gutenberg.org/ebooks/63346.epub.noimages",
    source: "Project Gutenberg",
    subjects: ["Sermões", "Exegese", "Devocional"],
    language: "pt",
    fileName: "O Sermao do Monte - Charles Spurgeon.epub",
    mimeType: "application/epub+zip"
  },
  {
    id: "imitacao",
    title: "A Imitação de Cristo",
    author: "Tomás de Kempis",
    year: "1427",
    summary: "O clássico manual devocional focado na humildade interior, oração silenciosa, renúncia e na imitação do caráter do Salvador.",
    readUrl: "https://www.gutenberg.org/ebooks/59353",
    downloadUrl: "https://www.gutenberg.org/ebooks/59353.epub.noimages",
    source: "Project Gutenberg",
    subjects: ["Devocional", "Mística", "Século XV"],
    language: "pt",
    fileName: "A Imitacao de Cristo - Tomas de Kempis.epub",
    mimeType: "application/epub+zip"
  }
];

/* ─── Component ─────────────────────────────────────────── */

export default function TheologicalLibrary({ onClose }: { onClose: () => void }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [indexingStatus, setIndexingStatus] = useState<Record<string, "idle" | "loading" | "success" | "error">>({});
  const [messageToast, setMessageToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useTrackContext({
    pageId: "library",
    title: "Biblioteca Acadêmica",
    metadata: {
      contentSummary: `Catálogo de Domínio Público - Categoria: ${activeCategory}.`,
      courseId: activeCategory,
    }
  });

  // Carrega status indexados anteriormente do localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("theosphere-indexed-books");
      if (stored) {
        setIndexingStatus(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Erro ao carregar cache de indexação:", e);
    }
  }, []);

  const handleIndexBook = async (book: BookItem) => {
    if (indexingStatus[book.id] === "loading" || indexingStatus[book.id] === "success") return;

    setIndexingStatus(prev => ({ ...prev, [book.id]: "loading" }));
    setMessageToast(null);

    try {
      const res: any = await api.post("/drive-library/ingest-url", {
        url: book.downloadUrl,
        fileName: book.fileName,
        mimeType: book.mimeType,
        tradition: "Geral"
      });

      setIndexingStatus(prev => {
        const next = { ...prev, [book.id]: "success" as const };
        localStorage.setItem("theosphere-indexed-books", JSON.stringify(next));
        return next;
      });

      setMessageToast({
        type: "success",
        text: `"${book.title}" foi indexado com sucesso na memória da sua IA! (${res.chunksIndexed || 0} trechos adicionados).`
      });
    } catch (err: any) {
      console.error(err);
      setIndexingStatus(prev => ({ ...prev, [book.id]: "error" }));
      setMessageToast({
        type: "error",
        text: `Falha ao indexar "${book.title}": ${err.message || "Erro desconhecido"}.`
      });
    }
  };

  // Filtragem dinâmica dos clássicos
  const filteredBooks = PUBLIC_BOOKS.filter(book => {
    const matchesSearch = 
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.subjects.some(sub => sub.toLowerCase().includes(searchQuery.toLowerCase()));

    if (activeCategory === "all") return matchesSearch;
    if (activeCategory === "theology") return matchesSearch && book.subjects.includes("Teologia");
    if (activeCategory === "patristics") return matchesSearch && book.subjects.includes("Patrística");
    if (activeCategory === "reformation") return matchesSearch && book.subjects.includes("Reforma");
    if (activeCategory === "philosophy") return matchesSearch && book.subjects.includes("Filosofia");
    
    return matchesSearch;
  });

  return (
    <div className="flex flex-col h-full bg-[#FAFAFA] dark:bg-[#070709] overflow-hidden text-gray-900 dark:text-gray-100">
      
      {/* Logos Header Style with Kenlo Colors */}
      <div className="px-8 pt-6 pb-4 bg-white dark:bg-[#0C0C0F] border-b border-gray-200 dark:border-white/5 shadow-sm z-20">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-[#F82E52] to-[#00C2FF] flex items-center justify-center text-white shadow-lg shadow-[#F82E52]/20">
                <BookOpen className="w-5 h-5" />
             </div>
             <div>
                <h2 className="text-xl font-serif font-bold text-gray-900 dark:text-white leading-tight">Acervo de Domínio Público</h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Integração Direta com a Inteligência Artificial</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Search & Category Filter Navigation */}
        <div className="flex flex-col md:flex-row gap-4 mb-2">
            <div className="relative flex-grow">
                <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Pesquisar clássicos por título, autor, assunto..."
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-[#121216] border border-gray-200 dark:border-white/5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00C2FF] transition-all"
                />
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0">
                {CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  return (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`px-4 py-2.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-2 ${
                            activeCategory === cat.id
                                ? "bg-gradient-to-r from-[#F82E52] to-[#F82E52]/90 border-[#F82E52] text-white shadow-md shadow-[#F82E52]/20"
                                : "bg-white dark:bg-[#121216] border-gray-200 dark:border-white/5 text-gray-500 dark:text-gray-400 hover:border-[#00C2FF]/30 hover:text-gray-700 dark:hover:text-white"
                        }`}
                    >
                        <Icon className="w-3.5 h-3.5" />
                        {cat.label}
                    </button>
                  );
                })}
            </div>
        </div>
      </div>

      {/* Floating Notifications */}
      {messageToast && (
        <div className="mx-8 mt-4">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl border flex items-start gap-3 shadow-md ${
              messageToast.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                : "bg-[#F82E52]/10 border-[#F82E52]/20 text-[#F82E52] dark:text-[#F82E52]/80"
            }`}
          >
            {messageToast.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            )}
            <div className="text-xs font-medium leading-relaxed flex-grow">
              {messageToast.text}
            </div>
            <button onClick={() => setMessageToast(null)} className="text-xs opacity-60 hover:opacity-100 font-bold uppercase tracking-widest pl-2">
              Fechar
            </button>
          </motion.div>
        </div>
      )}

      {/* Library Content Grid */}
      <div className="flex-grow overflow-y-auto p-8 custom-scrollbar">
        {filteredBooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 text-center">
            <BookOpen className="w-12 h-12 mb-4 text-gray-300 dark:text-white/10" />
            <p className="text-sm font-bold uppercase tracking-widest mb-1">Nenhum clássico encontrado</p>
            <p className="text-xs opacity-60">Tente ajustar a sua busca ou trocar a categoria ativa.</p>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
            {filteredBooks.map((book) => {
              const status = indexingStatus[book.id] || "idle";
              
              return (
                <motion.div
                  key={book.id}
                  whileHover={{ y: -4 }}
                  className="bg-white dark:bg-[#0C0C0F] rounded-xl border border-gray-200 dark:border-white/5 shadow-sm overflow-hidden flex flex-col group cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-[#00C2FF]/5"
                >
                  {/* Decorative Book Top Bar */}
                  <div className="h-2 bg-gradient-to-r from-[#F82E52] via-[#00C2FF] to-[#F82E52]" />
                  
                  <div className="p-6 flex-grow flex flex-col">
                    {/* Header: Title, Author, Year */}
                    <div className="mb-4">
                      <span className="text-[9px] font-black text-[#00C2FF] uppercase tracking-wider">{book.year}</span>
                      <h4 className="text-lg font-serif font-bold text-gray-900 dark:text-white mt-1 leading-tight group-hover:text-[#F82E52] transition-colors">
                        {book.title}
                      </h4>
                      <p className="text-xs font-bold text-[#F82E52] mt-0.5">{book.author}</p>
                    </div>

                    {/* Summary */}
                    <p className="text-xs text-gray-500 dark:text-white/40 leading-relaxed mb-6 italic">
                      "{book.summary}"
                    </p>

                    {/* Tags */}
                    <div className="flex gap-2 flex-wrap mb-6">
                      {book.subjects.map(s => (
                        <span key={s} className="text-[9px] font-bold px-2 py-0.5 bg-gray-100 dark:bg-white/5 rounded text-gray-400 uppercase tracking-tighter">
                          #{s}
                        </span>
                      ))}
                    </div>

                    {/* Actions and Status Button */}
                    <div className="mt-auto pt-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between gap-3">
                      <a 
                        href={book.readUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#121216] text-gray-400 hover:text-[#00C2FF] hover:bg-[#00C2FF]/10 transition-all text-xs font-bold flex items-center gap-1.5 border border-transparent hover:border-[#00C2FF]/10"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Gutenberg
                      </a>

                      {status === "success" ? (
                        <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/10 text-xs font-black uppercase tracking-wider select-none">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Indexado no RAG
                        </div>
                      ) : status === "loading" ? (
                        <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#00C2FF]/10 text-[#00C2FF] border border-[#00C2FF]/10 text-xs font-black uppercase tracking-wider select-none">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Indexando...
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleIndexBook(book);
                          }}
                          className={`px-3 py-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all border ${
                            status === "error"
                              ? "bg-[#F82E52]/10 border-[#F82E52]/20 text-[#F82E52] hover:bg-[#F82E52] hover:text-white"
                              : "bg-gradient-to-r from-[#00C2FF] to-[#00C2FF]/80 hover:from-[#00C2FF] hover:to-[#00C2FF] border-[#00C2FF] text-white shadow-sm shadow-[#00C2FF]/10 hover:shadow-md hover:shadow-[#00C2FF]/20"
                          }`}
                        >
                          <Flame className="w-3.5 h-3.5" />
                          {status === "error" ? "Erro (Repetir)" : "Indexar na IA"}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Meta */}
      <div className="p-4 bg-white dark:bg-[#0C0C0F] border-t border-gray-200 dark:border-white/5 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-center sm:text-left">
         <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Direitos Autorais: Domínio Público Oficial</span>
         </div>
         <div className="flex items-center gap-2">
            <Globe2 className="w-4 h-4 text-[#00C2FF]" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Conectado aos Servidores do Project Gutenberg</span>
         </div>
      </div>
    </div>
  );
}
