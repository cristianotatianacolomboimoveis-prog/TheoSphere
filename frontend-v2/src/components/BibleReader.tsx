"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, BookOpen, ChevronRight, ChevronLeft, X, Zap, BookMarked,
  ChevronDown, Bookmark, Copy, Check, Loader2, ArrowLeft, ArrowRight,
  Star, Columns, SplitSquareHorizontal, FileText, Hash, Maximize2, Library, Users, MapPin
} from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useTheoStore } from "@/store/useTheoStore";
import { semanticSearch } from "@/lib/semanticSearch";
import { StrongOverlay } from "./StrongOverlay";
import { BIBLE_BOOKS, getBooksByTestament, type BibleBook } from "@/data/bibleBooks";
import * as Framer from "framer-motion";
const { motion, AnimatePresence } = Framer;
import { useTheoWorker } from "@/hooks/useTheoWorker";
import AgenticConsole from "./AgenticConsole";
import { InterlinearTable } from "./InterlinearTable";
import { BIBLE_BOOK_TO_ID, isNewTestament } from "@/lib/bibleUtils";
import ResourceGuide from "./ResourceGuide";
import { useBible } from "@/hooks/useBible";
import ErrorBoundary from "./ErrorBoundary";
import { useRouter } from "next/navigation";
import { ReaderHeader } from "./reader/ReaderHeader";
import { VerseRow } from "./reader/VerseRow";

/* ─── Types ──────────────────────────────────────────────── */

export const TRANSLATIONS = [
  { id: "ara", name: "Almeida Revista e Atualizada (ARA)", lang: "PT", type: "Equivalência Formal" },
  { id: "nvipt", name: "Nova Versão Internacional (NVI)", lang: "PT", type: "Equivalência Dinâmica" },
  { id: "almeida", name: "Almeida Corrigida Fiel (ACF)", lang: "PT", type: "Equivalência Formal" },
  { id: "naa", name: "Nova Almeida Atualizada (NAA)", lang: "PT", type: "Equivalência Formal" },
  { id: "nvt", name: "Nova Versão Transformadora (NVT)", lang: "PT", type: "Dinâmica Contemporânea" },
  { id: "kjv", name: "King James Version (KJV)", lang: "EN", type: "Equivalência Formal" },
  { id: "asv", name: "American Standard Version (ASV)", lang: "EN", type: "Equivalência Formal" },
  { id: "web", name: "World English Bible (WEB)", lang: "EN", type: "Equivalência Dinâmica" },
  { id: "ylt", name: "Young's Literal Translation (YLT)", lang: "EN", type: "Literal" },
];

/* ─── Component ──────────────────────────────────────────── */

export default function BibleReader({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { 
    activeBook, activeChapter, activeVerseId, visibleVerseId, viewMode: storeViewMode,
    setActiveVerse, setVisibleVerse, setBibleReference, setViewMode: setStoreViewMode, setCurrentTime, _hasHydrated 
  } = useTheoStore();

  const [primaryTranslation, setPrimaryTranslation] = useState("ara");
  const [secondaryTranslation, setSecondaryTranslation] = useState("");

  const handleWorkerMessage = useCallback((type: string, payload: any) => {
    if (type === "STRONGS_DATA") {
      setHoverData(prev => prev ? { ...prev, definition: payload.definition || prev.definition } : null);
    }
    if (type === "SYNC_PROGRESS") {
      setSyncProgress(payload.progress);
      setCurrentSyncBook(payload.currentBook);
      setIsSyncing(true);
    }
    if (type === "SYNC_COMPLETE") {
      setIsSyncing(false);
      setSyncProgress(100);
      setTimeout(() => setSyncProgress(0), 3000); // Esconde após 3s
    }
  }, []);

  const { postMessage: workerPost } = useTheoWorker(handleWorkerMessage);

  const { chaptersData, secondaryData, interlinearMap, loading } = useBible(primaryTranslation, storeViewMode === "exegesis" ? "interlinear" : "text", secondaryTranslation || undefined);
  
  const selectedBook = BIBLE_BOOKS.find(b => b.nameEn === activeBook) || BIBLE_BOOKS[42];
  const selectedChapter = activeChapter;

  const [showBookSelector, setShowBookSelector] = useState(false);
  const [showChapterSelector, setShowChapterSelector] = useState(false);
  const [showTranslationSelector, setShowTranslationSelector] = useState(false);
  const [showSecondarySelector, setShowSecondarySelector] = useState(false);
  const [showResourceGuide, setShowResourceGuide] = useState(true);
  const [selectedVerses, setSelectedVerses] = useState<Set<number>>(new Set());
  const [amplifyAnchor, setAmplifyAnchor] = useState<{ x: number, y: number, verse: number } | null>(null);
  const [hoverData, setHoverData] = useState<{ word: string; strongId: string; definition: string; pos: { x: number; y: number } } | null>(null);

  // Sync state
  const [syncProgress, setSyncProgress] = useState(0);
  const [currentSyncBook, setCurrentSyncBook] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  // Search state
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // PhD Timeline Sync: Sincroniza o tempo do mapa com o livro bíblico
  useEffect(() => {
    if (selectedBook.yearStart) {
      setCurrentTime(selectedBook.yearStart);
    }
  }, [selectedBook.id, setCurrentTime]);

  const toggleVerseSelection = (verseNum: number) => {
    setSelectedVerses(prev => {
      const next = new Set(prev);
      if (next.has(verseNum)) next.delete(verseNum);
      else next.add(verseNum);
      return next;
    });
    setActiveVerse(`${selectedBook.nameEn} ${selectedChapter}:${verseNum}`);
  };

  const setSelectedBook = (book: BibleBook) => setBibleReference(book.nameEn, 1);
  const setSelectedChapter = (chapter: number) => setBibleReference(activeBook, chapter);

  const handleAmplify = (e: React.MouseEvent, verseNum: number) => {
    e.preventDefault();
    setAmplifyAnchor({ x: e.clientX, y: e.clientY, verse: verseNum });
  };

  // Task 3: Strong's hover handler – dispatches FETCH_STRONGS to the worker
  const handleWordHover = useCallback((word: string, strongId: string, pos: { x: number; y: number }) => {
    setHoverData({ word, strongId, definition: "Carregando...", pos });
    workerPost("FETCH_STRONGS", { strongId });
  }, [workerPost]);

  // Search: focus input when entering search mode
  useEffect(() => {
    if (searchMode) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery("");
    }
  }, [searchMode]);

  const parentRef = useRef<HTMLDivElement>(null);
  const allVerses = chaptersData.length > 0 ? chaptersData[0].verses : [];
  const versesToRender = searchMode && searchQuery.trim()
    ? allVerses.filter(v => v.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : allVerses;
  
  const rowVirtualizer = useVirtualizer({
    count: versesToRender.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // Estimativa maior para evitar saltos
    overscan: 10,
  });

  // PhD Scroll Sync: Intersection Observer para versículo visível
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries.find(e => e.isIntersecting);
        if (visibleEntry) {
          const index = parseInt(visibleEntry.target.getAttribute('data-index') || "0");
          const verseNum = versesToRender[index]?.verse;
          if (verseNum) {
            setVisibleVerse(`${activeBook} ${activeChapter}:${verseNum}`);
          }
        }
      },
      { root: parentRef.current, threshold: 0.5 }
    );

    const elements = parentRef.current?.querySelectorAll('[data-verse-index]');
    elements?.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, [versesToRender, activeBook, activeChapter, setVisibleVerse]);

  return (
    <div className="flex flex-col h-full bg-background/95 backdrop-blur-3xl border-l border-border-subtle text-foreground overflow-hidden transition-all duration-500 ease-in-out shadow-2xl w-full">
      <ReaderHeader
        viewMode={storeViewMode}
        showResourceGuide={showResourceGuide}
        onToggleViewMode={() => setStoreViewMode(storeViewMode === "reading" ? "exegesis" : "reading")}
        onToggleResourceGuide={() => setShowResourceGuide(!showResourceGuide)}
        onExpand={() => router.push("/exegete")}
        onClose={onClose}
      />

      <div className="px-6 pb-4 border-b border-border-subtle flex-shrink-0 relative z-20">
        <div className="flex gap-2 relative mt-4">
          {searchMode ? (
            /* Search input bar */
            <div className="flex-grow flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-hover border border-accent/30">
              <Search className="w-4 h-4 text-accent flex-shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => { if (e.key === "Escape") setSearchMode(false); }}
                placeholder="Buscar versículos..."
                className="flex-grow bg-transparent text-sm text-foreground/90 placeholder-foreground/30 outline-none"
              />
              {searchQuery && (
                <span className="text-[10px] text-accent/60 font-mono flex-shrink-0">
                  {versesToRender.length} resultado{versesToRender.length !== 1 ? "s" : ""}
                </span>
              )}
              <button
                onClick={() => setSearchMode(false)}
                className="p-1 rounded-md hover:bg-red-500/10 text-foreground/30 hover:text-red-400 transition-all flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => { setShowBookSelector(!showBookSelector); setShowChapterSelector(false); setShowTranslationSelector(false); setShowSecondarySelector(false); }}
                className="flex-grow flex items-center justify-between px-3 py-2 rounded-lg bg-surface-hover/50 border border-border-subtle hover:border-accent/20 transition-all text-sm"
              >
                <span className="font-semibold text-foreground/90">{selectedBook.namePt}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-foreground/30 transition-transform ${showBookSelector ? "rotate-180" : ""}`} />
              </button>
              <button
                onClick={() => { setShowChapterSelector(!showChapterSelector); setShowBookSelector(false); setShowTranslationSelector(false); setShowSecondarySelector(false); }}
                className="px-4 py-2 rounded-lg bg-surface-hover/50 border border-border-subtle hover:border-accent/20 transition-all text-sm font-bold text-accent flex items-center gap-1"
              >
                {selectedChapter}
                <ChevronDown className={`w-3 h-3 text-foreground/30 transition-transform ${showChapterSelector ? "rotate-180" : ""}`} />
              </button>
              <button
                onClick={() => { setShowTranslationSelector(!showTranslationSelector); setShowBookSelector(false); setShowChapterSelector(false); setShowSecondarySelector(false); }}
                className={`px-3 py-2 rounded-lg transition-all text-xs font-bold flex items-center gap-2 border ${showTranslationSelector ? "bg-accent/20 border-accent/30 text-accent" : "bg-surface-hover/50 border-border-subtle text-foreground/60 hover:border-accent/20"}`}
              >
                {primaryTranslation.toUpperCase()}
                <ChevronDown className={`w-3 h-3 transition-transform ${showTranslationSelector ? "rotate-180" : ""}`} />
              </button>

              {/* Parallel translation toggle */}
              <button
                onClick={() => { setShowSecondarySelector(!showSecondarySelector); setShowBookSelector(false); setShowChapterSelector(false); setShowTranslationSelector(false); }}
                className={`px-3 py-2 rounded-lg transition-all text-xs font-bold flex items-center gap-2 border ${secondaryTranslation ? "border-primary/30 bg-primary/10 text-primary" : "border-border-subtle bg-surface-hover/50 text-foreground/30 hover:text-foreground/60"}`}
                title="Tradução paralela"
              >
                <SplitSquareHorizontal className="w-3.5 h-3.5" />
                {secondaryTranslation ? secondaryTranslation.toUpperCase() : "//"}
              </button>

              {/* Source badge: cache (local) vs API (remote) */}
              {chaptersData.length > 0 && chaptersData[0].source && (
                <span
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border flex-shrink-0 ${
                    chaptersData[0].source === "cache"
                      ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                      : "bg-blue-500/10 border-blue-500/25 text-blue-400"
                  }`}
                  title={chaptersData[0].source === "cache" ? "Servido do cache local (DuckDB)" : "Servido da API remota"}
                >
                  {chaptersData[0].source === "cache" ? "💾 Local" : "🌐 API"}
                </span>
              )}

              {/* Search button */}
              <button
                onClick={() => { setSearchMode(true); setShowBookSelector(false); setShowChapterSelector(false); setShowTranslationSelector(false); setShowSecondarySelector(false); }}
                className="px-3 py-2 rounded-lg bg-surface-hover/50 border border-border-subtle hover:border-accent/20 transition-all text-foreground/30 hover:text-accent"
                title="Buscar no capítulo"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>

        {/* Sync Progress Bar — Premium Feedback */}
        <AnimatePresence>
          {syncProgress > 0 && syncProgress < 100 && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-1.5 px-0.5">
                <div className="flex items-center gap-2">
                  <div className="flex space-x-1">
                    <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 2 }} className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 2, delay: 0.3 }} className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  </div>
                  <span className="text-[10px] font-bold text-foreground/50 uppercase tracking-widest">Sincronizando Offline: {currentSyncBook}</span>
                </div>
                <span className="text-[10px] font-black text-blue-400/80 tabular-nums">{syncProgress}%</span>
              </div>
              <div className="h-1 w-full bg-border-subtle rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-blue-600 via-blue-400 to-indigo-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${syncProgress}%` }}
                  transition={{ type: "spring", stiffness: 50, damping: 20 }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="relative flex-grow overflow-hidden bg-surface shadow-inner">
        <AnimatePresence>
          {showBookSelector && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute inset-0 z-30 bg-background/98 backdrop-blur-xl overflow-y-auto custom-scrollbar p-4">
              <div className="grid grid-cols-2 gap-1">
                {BIBLE_BOOKS.map(book => (
                  <button key={book.id} onClick={() => { setSelectedBook(book); setSelectedChapter(1); setShowBookSelector(false); }} className={`text-left px-3 py-2 rounded-lg text-xs transition-all ${selectedBook.id === book.id ? "bg-accent/15 text-accent" : "hover:bg-surface-hover text-foreground/60"}`}>
                    {book.namePt}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showChapterSelector && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute inset-0 z-30 bg-background/98 backdrop-blur-xl overflow-y-auto custom-scrollbar p-4"
            >
              <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest mb-3 px-1">
                {selectedBook.namePt} — {selectedBook.chapters} capítulos
              </p>
              <div className="grid grid-cols-6 gap-1.5">
                {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map(ch => (
                  <button
                    key={ch}
                    onClick={() => { setSelectedChapter(ch); setShowChapterSelector(false); }}
                    className={`py-2.5 rounded-lg text-xs font-bold transition-all ${
                      selectedChapter === ch
                        ? "bg-accent/20 text-accent border border-accent/30 shadow-lg shadow-accent/10"
                        : "hover:bg-surface-hover text-foreground/60 hover:text-foreground"
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showTranslationSelector && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute inset-0 z-30 bg-background/98 backdrop-blur-xl overflow-y-auto custom-scrollbar p-4"
            >
              <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest mb-4 px-1">
                Selecione a Versão Bíblica
              </p>
              <div className="space-y-1">
                {TRANSLATIONS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setPrimaryTranslation(t.id); setShowTranslationSelector(false); }}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-all border ${
                      primaryTranslation === t.id
                        ? "bg-accent/10 border-accent/30 text-accent shadow-lg shadow-accent/5"
                        : "hover:bg-surface-hover border-transparent text-foreground/60 hover:text-foreground"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold">{t.name}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface-hover font-mono">{t.id.toUpperCase()}</span>
                    </div>
                    <p className="text-[10px] opacity-40 mt-1">{t.type} • {t.lang}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showSecondarySelector && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute inset-0 z-30 bg-background/98 backdrop-blur-xl overflow-y-auto custom-scrollbar p-4"
            >
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-4 px-1">
                Segunda Versão (Comparação Paralela)
              </p>
              <div className="space-y-1">
                {TRANSLATIONS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setSecondaryTranslation(t.id); setShowSecondarySelector(false); }}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-all border ${
                      secondaryTranslation === t.id
                        ? "bg-primary/10 border-primary/30 text-primary shadow-lg shadow-primary/5"
                        : "hover:bg-surface-hover border-transparent text-foreground/60 hover:text-foreground"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold">{t.name}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 font-mono">{t.id.toUpperCase()}</span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex h-full overflow-hidden">
          {/* Main Reader Area */}
          <div className="flex-grow h-full relative overflow-hidden">
            <div ref={parentRef} className="h-full overflow-y-auto custom-scrollbar px-6 py-8 relative z-10">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                  <p className="text-[10px] font-bold text-blue-500/60 uppercase tracking-widest">Iniciando Exegese PhD...</p>
                </div>
              ) : storeViewMode === "exegesis" ? (
                <div className="space-y-12 pb-32">
                  <AgenticConsole />
                  {versesToRender.map((v) => {
                    const isNT = selectedBook.testament === "NT";
                    const words = interlinearMap[v.verse] || [];
                    return (
                      <div key={v.verse} onContextMenu={(e) => handleAmplify(e, v.verse)}>
                        <InterlinearTable
                          verse={v.verse}
                          selectedBook={selectedBook}
                          selectedChapter={selectedChapter}
                          isNT={isNT}
                          words={words}
                          onWordHover={handleWordHover}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : searchMode && searchQuery.trim() ? (
                /* Search results: non-virtualized for simplicity */
                <div className="space-y-1 pb-32 px-2">
                  {versesToRender.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-foreground/30">
                      <Search className="w-8 h-8 mb-3 opacity-30" />
                      <p className="text-sm">Nenhum versículo encontrado para &ldquo;{searchQuery}&rdquo;</p>
                    </div>
                  ) : versesToRender.map((vPrimary) => {
                    const vSecondary = secondaryData?.verses.find(v => v.verse === vPrimary.verse);
                    return (
                      <VerseRow
                        key={vPrimary.verse}
                        verse={vPrimary.verse}
                        text={vPrimary.text}
                        secondaryText={vSecondary?.text}
                        selected={selectedVerses.has(vPrimary.verse)}
                        onClick={() => toggleVerseSelection(vPrimary.verse)}
                        highlightQuery={searchQuery}
                      />
                    );
                  })}
                </div>
              ) : (
                <div
                  style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative'
                  }}
                >
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const vPrimary = versesToRender[virtualRow.index];
                    const vSecondary = secondaryData?.verses[virtualRow.index];

                    if (!vPrimary) return null;

                    return (
                      <div
                        key={virtualRow.key}
                        data-index={virtualRow.index}
                        data-verse-index={vPrimary.verse}
                        ref={rowVirtualizer.measureElement}
                        className="absolute top-0 left-0 w-full px-2"
                        style={{ transform: `translateY(${virtualRow.start}px)` }}
                      >
                        <VerseRow
                          verse={vPrimary.verse}
                          text={vPrimary.text}
                          secondaryText={vSecondary?.text}
                          selected={selectedVerses.has(vPrimary.verse)}
                          onClick={() => toggleVerseSelection(vPrimary.verse)}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Resource Guide Panel (Split Screen) */}
          <AnimatePresence>
            {showResourceGuide && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "380px", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="flex-shrink-0 border-l border-border-subtle overflow-hidden"
              >
                <ResourceGuide />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Amplify Context Menu */}
      <AnimatePresence>
        {amplifyAnchor && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{ left: amplifyAnchor.x, top: amplifyAnchor.y }}
            className="fixed z-[100] w-56 bg-surface/95 backdrop-blur-2xl border border-border-strong rounded-2xl shadow-2xl p-2"
          >
            <div className="px-3 py-2 border-b border-border-subtle mb-1">
              <p className="text-[10px] font-black text-primary uppercase tracking-widest">Ampliar Referência</p>
              <p className="text-[11px] text-foreground/60 font-mono mt-0.5">{selectedBook.nameEn} {selectedChapter}:{amplifyAnchor.verse}</p>
            </div>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-surface-hover transition-all text-xs text-foreground/80 group">
              <BookOpen className="w-4 h-4 text-foreground/20 group-hover:text-primary" />
              Estudo de Palavras
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-surface-hover transition-all text-xs text-foreground/80 group">
              <Users className="w-4 h-4 text-foreground/20 group-hover:text-amber-400" />
              Ver no Factbook
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-surface-hover transition-all text-xs text-foreground/80 group">
              <MapPin className="w-4 h-4 text-foreground/20 group-hover:text-emerald-400" />
              Localizar no Atlas4D
            </button>
            <div className="h-px bg-border-subtle my-1" />
            <button 
              onClick={() => setAmplifyAnchor(null)}
              className="w-full flex items-center justify-center px-3 py-2 rounded-xl hover:bg-red-500/10 transition-all text-[10px] font-bold text-red-500/60 uppercase"
            >
              Fechar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {hoverData && (
        <StrongOverlay word={hoverData.word} strongId={hoverData.strongId} definition={hoverData.definition} position={hoverData.pos} onClose={() => setHoverData(null)} />
      )}
    </div>
  );
}
