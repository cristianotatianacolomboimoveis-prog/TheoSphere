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

/* ─── Types ─────────────────────────────────────────────── */

interface GutenbergBook {
  id: number;
  title: string;
  authors: { name: string; birth_year: number | null; death_year: number | null }[];
  summaries?: string[];
  subjects: string[];
  bookshelves: string[];
  languages: string[];
  formats: Record<string, string>;
  download_count: number;
}

interface OpenLibraryBook {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  subject?: string[];
  cover_i?: number;
  ia?: string[];
  number_of_pages_median?: number;
  language?: string[];
}

interface CrossrefWork {
  DOI: string;
  title?: string[];
  author?: { given?: string; family?: string }[];
  "container-title"?: string[];
  created?: { "date-parts": number[][] };
  abstract?: string;
  language?: string;
  URL: string;
  type: string;
}

type BookItem = {
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

/* ─── Categories ────────────────────────────────────────── */

const CATEGORIES = [
  { id: "theology", label: "Teologia", icon: Church, queries: ["teologia", "theology", "teologia+sistematica", "christian+theology"] },
  { id: "history", label: "História", icon: History, queries: ["historia+da+igreja", "church+history", "antiguidade"] },
  { id: "geography", label: "Geografia Bíblica", icon: MapPin, queries: ["geografia+biblica", "geography+bible", "bible+atlas"] },
  { id: "philosophy", label: "Filosofia", icon: Sparkles, queries: ["filosofia+da+religiao", "philosophy+religion", "apologetica"] },
  { id: "patristics", label: "Patrística", icon: ScrollText, queries: ["patristica", "church+fathers", "early+church", "pais+da+igreja"] },
  { id: "reformation", label: "Reforma", icon: BookMarked, queries: ["reforma+protestante", "reformation", "calvinismo", "lutero"] },
];

/* ─── Cache System ──────────────────────────────────────── */
interface CacheEntry {
  data: BookItem[];
  timestamp: number;
}
const apiCache = new Map<string, CacheEntry>();
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

/* ─── Helpers ───────────────────────────────────────────── */

function gutenbergToItem(book: GutenbergBook): BookItem {
  const cover = book.formats["image/jpeg"] || "";
  const htmlUrl = book.formats["text/html"] || book.formats["text/html; charset=us-ascii"] || "";
  const txtUrl = book.formats["text/plain; charset=utf-8"] || book.formats["text/plain; charset=us-ascii"] || "";
  const epubUrl = book.formats["application/epub+zip"] || "";
  const author = book.authors.length > 0 ? book.authors[0].name : "Autor desconhecido";
  const yearStr = book.authors[0]?.birth_year && book.authors[0]?.death_year ? `${book.authors[0].birth_year}–${book.authors[0].death_year}` : "";
  return {
    id: `gutenberg-${book.id}`,
    title: book.title,
    author,
    year: yearStr,
    summary: book.summaries?.[0]?.slice(0, 300) || "",
    coverUrl: cover,
    readUrl: htmlUrl || `https://www.gutenberg.org/ebooks/${book.id}`,
    downloadUrl: epubUrl || txtUrl,
    source: "gutenberg",
    subjects: book.subjects.slice(0, 3),
    language: book.languages[0] || "en",
  };
}

function openLibraryToItem(book: OpenLibraryBook): BookItem {
  const cover = book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : "";
  const iaId = book.ia?.[0];
  const readUrl = iaId ? `https://archive.org/details/${iaId}` : `https://openlibrary.org${book.key}`;
  return {
    id: `ol-${book.key}`,
    title: book.title,
    author: book.author_name?.[0] || "Autor desconhecido",
    year: book.first_publish_year ? String(book.first_publish_year) : "",
    summary: "",
    coverUrl: cover,
    readUrl,
    downloadUrl: iaId ? `https://archive.org/download/${iaId}` : "",
    source: "openlibrary",
    subjects: book.subject?.slice(0, 3) || [],
    language: book.language?.[0]?.replace("eng", "en").replace("por", "pt") || "en",
  };
}

function crossrefToItem(work: CrossrefWork): BookItem {
  const author = work.author?.[0] ? `${work.author[0].given || ""} ${work.author[0].family || ""}`.trim() : "Autor Acadêmico";
  const year = work.created?.["date-parts"]?.[0]?.[0] ? String(work.created["date-parts"][0][0]) : "";
  let summary = work.abstract ? work.abstract.replace(/(<([^>]+)>)/gi, "") : "";
  if (summary.length > 300) summary = summary.slice(0, 300) + "...";
  
  return {
    id: `cr-${work.DOI}`,
    title: work.title?.[0] || "Artigo sem título",
    author,
    year,
    summary,
    coverUrl: "",
    readUrl: work.URL || `https://doi.org/${work.DOI}`,
    downloadUrl: "",
    source: "crossref",
    subjects: work["container-title"] || ["Paper Acadêmico"],
    language: work.language || "en",
  };
}

/* ─── Skeleton Components ───────────────────────────────── */

function BookSkeleton() {
  return (
    <div className="flex gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
      <div className="w-14 h-20 rounded-lg skeleton flex-shrink-0" />
      <div className="flex-grow space-y-2 py-1">
        <div className="h-4 w-3/4 skeleton" />
        <div className="h-3 w-1/2 skeleton" />
        <div className="h-3 w-1/3 skeleton mt-3" />
      </div>
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="p-4 space-y-2">
      {Array.from({ length: 6 }).map((_, i) => <BookSkeleton key={i} />)}
    </div>
  );
}

/* ─── Component ─────────────────────────────────────────── */

export default function TheologicalLibrary({ onClose }: { onClose: () => void }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("theology");
  const [books, setBooks] = useState<BookItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedBook, setSelectedBook] = useState<BookItem | null>(null);
  const [readingContent, setReadingContent] = useState<string | null>(null);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [readingLoading, setReadingLoading] = useState(false);
  
  // Translation State
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  
  const [sourceFilter, setSourceFilter] = useState<"all" | "gutenberg" | "openlibrary" | "crossref" | "scielo_br">("all");

  /* ── Fetch books from Global APIs ─────────────────────── */

  const fetchBooks = useCallback(async (category: string, query?: string) => {
    const cacheKey = `theo-lib-${category}-${query || ""}`;
    
    // 1. Memory + LocalStorage Cache Check
    const cachedMem = apiCache.get(cacheKey);
    if (cachedMem && Date.now() - cachedMem.timestamp < CACHE_DURATION_MS) {
      setBooks(cachedMem.data);
      setLoading(false);
      return;
    }
    
    const cachedLocal = localStorage.getItem(cacheKey);
    if (cachedLocal) {
      const parsed = JSON.parse(cachedLocal);
      if (Date.now() - parsed.timestamp < CACHE_DURATION_MS) {
        setBooks(parsed.data);
        apiCache.set(cacheKey, parsed);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    setBooks([]);
    const results: BookItem[] = [];
    const cat = CATEGORIES.find((c) => c.id === category);

    const gutenbergQuery = query || (cat?.queries[0] ?? "theology");
    const olSubject = query || (cat?.queries[0]?.replace("+", " ") ?? "theology");
    const crQuery = query || (cat?.queries[0]?.replace("+", " ") ?? "theology");
    
    // Melhora a busca brasileira com termos específicos de domínio público e acadêmicos
    const brQuery = query ? `${query} language:por` : (cat?.queries[0]?.replace("+", " ") ?? "teologia");

    const fetchPromises = [
      // 1. Gutenberg
      fetch(`https://gutendex.com/books/?topic=${encodeURIComponent(gutenbergQuery)}&page=1`)
        .then(res => res.json())
        .then(data => { if (data.results) results.push(...data.results.map(gutenbergToItem)); }),

      // 2. Open Library
      fetch(`https://openlibrary.org/search.json?subject=${encodeURIComponent(olSubject)}&limit=15&has_fulltext=true`)
        .then(res => res.json())
        .then(data => { if (data.docs) results.push(...data.docs.map((b: any) => openLibraryToItem(b))); }),

      // 3. Crossref
      fetch(`https://api.crossref.org/works?query=${encodeURIComponent(crQuery)}&filter=type:journal-article&rows=10&mailto=research@theosphere.com`)
        .then(res => res.json())
        .then(data => { if (data.message?.items) results.push(...data.message.items.map((w: any) => crossrefToItem(w))); }),

      // 4. SciELO BR / Domínio Público (Busca otimizada em Português)
      fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(brQuery)}&language=por&limit=15`)
        .then(res => res.json())
        .then(data => {
          if (data.docs) {
            results.push(...data.docs.map((b: any) => ({
              ...openLibraryToItem(b),
              id: `br-${b.key}`,
              source: "scielo_br",
            })));
          }
        })
    ];

    await Promise.allSettled(fetchPromises);

    // Deduplicate
    const seen = new Set<string>();
    const unique = results.filter((b) => {
      const key = b.title.toLowerCase().slice(0, 40);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    unique.sort((a, b) => a.source.localeCompare(b.source));

    const entry = { data: unique, timestamp: Date.now() };
    apiCache.set(cacheKey, entry);
    localStorage.setItem(cacheKey, JSON.stringify(entry));
    
    setBooks(unique);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBooks(activeCategory);
  }, [activeCategory, fetchBooks]);

  const handleSearch = () => {
    if (searchQuery.trim()) fetchBooks(activeCategory, searchQuery.trim());
  };

  /* ── Read & Translate ─────────────────────────────────── */

  const openBookReader = async (book: BookItem) => {
    setSelectedBook(book);
    setReadingContent(null);
    setIframeUrl(null);
    setTranslatedContent(null);
    setIsTranslating(false);

    if (book.source === "gutenberg" && book.readUrl.includes("gutenberg.org")) {
      setReadingLoading(true);
      try {
        const txtUrl = book.readUrl.replace(".html.images", ".txt.utf-8");
        const res = await fetch(txtUrl);
        if (res.ok) {
          const text = await res.text();
          setReadingContent(text.slice(0, 30000)); // first 30k chars
        }
      } catch {
        setReadingContent(null);
      } finally {
        setReadingLoading(false);
      }
    } else if (book.source === "openlibrary" && book.readUrl.includes("archive.org/details/")) {
      const iaId = book.readUrl.split("/").pop();
      setIframeUrl(`https://archive.org/embed/${iaId}?ui=embed`);
    } else {
      setIframeUrl(book.readUrl);
    }
  };

  const handleTranslate = async (textToTranslate: string) => {
    if (!textToTranslate) return;
    setIsTranslating(true);
    
    try {
      const token =
        typeof window !== 'undefined'
          ? window.localStorage.getItem('theosphere-access-token')
          : null;
      if (!token) {
        setTranslatedContent(
          `[Tradução requer login]\n\n${textToTranslate}`,
        );
        return;
      }
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: textToTranslate, targetLang: 'pt' }),
      });

      if (res.ok) {
        const data = await res.json();
        setTranslatedContent(`[Tradução Automática Dinâmica — TheoSphere]\n\n***\n\n${data.translated}`);
      } else if (res.status === 429) {
        setTranslatedContent(
          `[Limite de traduções atingido. Aguarde 1 minuto.]\n\n${textToTranslate}`,
        );
      } else if (res.status === 401) {
        setTranslatedContent(
          `[Sessão expirou — faça login novamente]\n\n${textToTranslate}`,
        );
      } else {
        setTranslatedContent(`[Falha na tradução automática. Exibindo original]\n\n${textToTranslate}`);
      }
    } catch (err) {
      console.error('Translation error:', err);
      setTranslatedContent(`[Erro de conexão na tradução]\n\n${textToTranslate}`);
    } finally {
      setIsTranslating(false);
    }
  };

  useEffect(() => {
    if (readingContent && selectedBook && !selectedBook.language.includes("pt") && !selectedBook.language.includes("por")) {
      handleTranslate(readingContent);
    }
  }, [readingContent, selectedBook]);

  /* ── Filtered books ───────────────────────────────── */

  const filteredBooks = sourceFilter === "all" ? books : books.filter((b) => b.source === sourceFilter);

  /* ── Render ───────────────────────────────────────── */

  return (
    <div className="flex flex-col h-full bg-[#070b14] text-white overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-white/5 flex-shrink-0 bg-gradient-to-b from-[#070b14] to-transparent z-10">
        <div className="flex items-center justify-between mb-4">
          {selectedBook ? (
            <button
              onClick={() => { setSelectedBook(null); setReadingContent(null); setIframeUrl(null); setTranslatedContent(null); }}
              className="flex items-center gap-2 text-amber-500 hover:text-amber-400 transition-colors bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-bold">Voltar à Biblioteca</span>
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <BookOpen className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold tracking-tight">
                  <span className="text-gradient">Biblioteca</span> Global
                </h2>
                <p className="text-[10px] text-amber-500/80 font-bold tracking-widest uppercase">
                  APIs Públicas & Open Source
                </p>
              </div>
            </div>
          )}
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/30 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!selectedBook && (
          <>
            {/* Search */}
            <div className="relative mb-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Pesquisar livros, papers, autores, temas em bases globais..."
                className="input-glass w-full pl-10 text-sm focus:border-amber-500/50"
              />
              <Search className="absolute left-3 top-3.5 w-4 h-4 text-white/25" />
            </div>

            {/* Categories */}
            <div className="flex gap-1.5 overflow-x-auto pb-2 no-scrollbar">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all border ${
                      activeCategory === cat.id
                        ? "bg-amber-500 border-amber-500 text-slate-950 shadow-lg shadow-amber-500/15"
                        : "bg-white/[0.03] border-white/5 text-white/40 hover:text-white/70 hover:border-white/15"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Source filter */}
            <div className="flex items-center gap-2 mt-3">
              {[
                { id: "all" as const, label: "Todas as Bases" },
                { id: "gutenberg" as const, label: "Gutenberg" },
                { id: "openlibrary" as const, label: "Open Library" },
                { id: "crossref" as const, label: "Artigos Acadêmicos" },
                { id: "scielo_br" as const, label: "SciELO & BR" },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSourceFilter(s.id)}
                  className={`text-[10px] px-2.5 py-1 rounded-md border transition-all font-bold ${
                    sourceFilter === s.id
                      ? "bg-white/10 border-white/20 text-white"
                      : "border-white/5 text-white/25 hover:text-white/50 hover:border-white/10"
                  }`}
                >
                  {s.label}
                </button>
              ))}
              <span className="text-[10px] text-amber-500/50 ml-auto font-mono font-bold uppercase tracking-wider">
                {filteredBooks.length} Fontes Globais
              </span>
            </div>
          </>
        )}
      </div>

      {/* Content */}
      <div className="flex-grow overflow-y-auto custom-scrollbar relative">
        <AnimatePresence mode="wait">
          {selectedBook ? (
            /* ─── Book Detail / Reader ──────────── */
            <motion.div key="detail" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="p-6 pb-20">
              <div className="flex gap-6 mb-8">
                {selectedBook.coverUrl ? (
                  <img src={selectedBook.coverUrl} alt="" className="w-32 h-48 rounded-xl object-cover shadow-2xl flex-shrink-0 border border-white/10" />
                ) : (
                  <div className="w-32 h-48 rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 flex items-center justify-center flex-shrink-0 shadow-2xl">
                    {selectedBook.source === "crossref" ? <GraduationCap className="w-10 h-10 text-white/20" /> : <BookOpen className="w-10 h-10 text-white/20" />}
                  </div>
                )}
                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`tag text-[8px] ${selectedBook.source === "gutenberg" ? "tag-emerald" : selectedBook.source === "scielo_br" ? "tag-green" : selectedBook.source === "openlibrary" ? "tag-blue" : "tag-amber"}`}>
                      {selectedBook.source.toUpperCase()}
                    </span>
                    {!selectedBook.language.includes("pt") && (
                      <span className="tag bg-white/10 text-white border-white/20 text-[8px] flex items-center gap-1">
                        <Languages className="w-3 h-3 text-amber-400" />
                        TRADUÇÃO IA DISPONÍVEL
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-white leading-tight mb-2 font-serif">{selectedBook.title}</h3>
                  <p className="text-sm text-amber-400 font-bold mb-1">{selectedBook.author}</p>
                  {selectedBook.year && <p className="text-xs text-white/30 mb-4">{selectedBook.year}</p>}
                  
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {selectedBook.subjects.map((s, i) => (
                      <span key={i} className="text-[9px] font-bold tracking-wider uppercase bg-white/[0.03] border border-white/10 px-2 py-0.5 rounded-md text-white/50">
                        {s}
                      </span>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <a href={selectedBook.readUrl} target="_blank" rel="noopener noreferrer" className="btn-primary flex items-center gap-1.5 text-xs">
                      <ExternalLink className="w-3.5 h-3.5" /> Acessar Original
                    </a>
                    {selectedBook.downloadUrl && (
                      <a href={selectedBook.downloadUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost flex items-center gap-1.5 text-xs">
                        <Download className="w-3.5 h-3.5" /> Baixar
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {selectedBook.summary && (
                <div className="mb-6 p-5 glass-amber rounded-xl border border-amber-500/20 shadow-xl shadow-amber-500/5">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-amber-500 mb-3 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5" /> Resumo Acadêmico
                  </h4>
                  <p className="text-[13px] text-slate-300 leading-relaxed font-serif">
                    {selectedBook.summary}
                  </p>
                </div>
              )}

              {/* Inline Reader with Translation AI */}
              {readingLoading && (
                <div className="flex flex-col items-center justify-center py-16 glass rounded-xl border border-white/5">
                  <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-4" />
                  <span className="text-xs font-bold tracking-widest uppercase text-white/40">Conectando ao Acervo...</span>
                </div>
              )}

              {(readingContent || translatedContent) && (
                <div className="relative glass-heavy rounded-2xl border border-white/10 p-1 mt-6 shadow-2xl overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent pointer-events-none" />
                  
                  <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-white/[0.02]">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-white/60">
                      Leitor Integrado <span className="text-white/20 mx-1">•</span> Texto Bruto
                    </h4>
                    
                    {(!selectedBook.language.includes("pt") && !selectedBook.language.includes("por")) && (
                      <span className={`flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all ${
                          translatedContent ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : 
                          "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        }`}
                      >
                        {translatedContent ? (
                          <><CheckCircle2 className="w-3.5 h-3.5" /> Traduzido Automaticamente (TheoAI)</>
                        ) : (
                          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Traduzindo...</>
                        )}
                      </span>
                    )}
                  </div>
                  
                  <div className="p-6 text-[15px] text-slate-300/90 leading-[2.2] font-light whitespace-pre-wrap max-h-[60vh] overflow-y-auto custom-scrollbar font-serif">
                    {translatedContent || readingContent}
                  </div>
                </div>
              )}

              {iframeUrl && !readingContent && (
                <div className="relative glass-heavy rounded-2xl border border-white/10 p-1 mt-6 shadow-2xl overflow-hidden group h-[70vh] w-full">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-white/[0.02]">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-white/60">
                      Leitor Integrado Nativo
                    </h4>
                  </div>
                  <iframe 
                    src={iframeUrl} 
                    className="w-full h-full border-none bg-white rounded-b-xl"
                    sandbox="allow-scripts allow-same-origin allow-popups"
                    title="Leitor Integrado"
                  />
                </div>
              )}

              {/* Source badge */}
              <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-center gap-3">
                <Globe2 className="w-4 h-4 text-white/20" />
                <span className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-bold">
                  Sincronizado via {selectedBook.source === "crossref" ? "Crossref (Artigos Acadêmicos)" : selectedBook.source === "gutenberg" ? "Project Gutenberg" : "Open Library"}
                </span>
              </div>
            </motion.div>
          ) : loading ? (
            /* ─── Skeleton Loading ─────────────────── */
            <GridSkeleton />
          ) : (
            /* ─── Book Grid ─────────────────────── */
            <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredBooks.map((book, idx) => (
                <motion.button
                  key={book.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.02, 0.3) }}
                  onClick={() => openBookReader(book)}
                  className="w-full flex gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.03] hover:bg-white/[0.04] hover:border-amber-500/30 transition-all text-left group shadow-lg"
                >
                  {book.coverUrl ? (
                    <img src={book.coverUrl} alt="" className="w-16 h-24 rounded-lg object-cover flex-shrink-0 border border-white/5 group-hover:border-amber-500/40 transition-all shadow-md" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <div className="w-16 h-24 rounded-lg bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 flex items-center justify-center flex-shrink-0">
                      {book.source === "crossref" ? <GraduationCap className="w-6 h-6 text-white/20 group-hover:text-amber-500/50 transition-colors" /> : <BookOpen className="w-6 h-6 text-white/20 group-hover:text-amber-500/50 transition-colors" />}
                    </div>
                  )}
                  <div className="flex-grow min-w-0 py-0.5 flex flex-col">
                    <h4 className="text-[14px] font-bold text-white/90 leading-tight line-clamp-2 group-hover:text-amber-400 transition-colors font-serif mb-1">
                      {book.title}
                    </h4>
                    <p className="text-[11px] text-white/50 font-medium truncate">{book.author}</p>
                    <div className="mt-auto pt-3 flex flex-wrap items-center gap-1.5">
                      <span className={`tag text-[7px] px-1.5 py-0.5 ${book.source === "gutenberg" ? "tag-emerald" : book.source === "openlibrary" ? "tag-blue" : "tag-amber"}`}>
                        {book.source === "crossref" ? "ACADEMIC PAPER" : book.source.toUpperCase()}
                      </span>
                      {!book.language.includes("pt") && (
                        <span className="text-[8px] bg-white/10 text-white/60 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                          <Languages className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                  </div>
                </motion.button>
              ))}

              {filteredBooks.length === 0 && !loading && (
                <div className="col-span-full text-center py-24 text-white/20">
                  <Globe2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="text-sm font-bold uppercase tracking-widest text-white/40">Bases de Dados Vazias</p>
                  <p className="text-xs mt-2 text-white/20">Nenhum recurso gratuito encontrado para esta pesquisa em nossas fontes globais.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-white/5 flex-shrink-0 bg-[#070b14]/90 backdrop-blur-md z-10 relative">
        <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
        <p className="text-[9px] text-white/20 text-center uppercase tracking-[0.2em] font-bold flex items-center justify-center gap-2">
          <Globe2 className="w-3 h-3" /> Conectado às maiores bibliotecas open source do mundo
        </p>
      </div>
    </div>
  );
}
