"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  X,
  Zap,
  BookMarked,
  ChevronDown,
  Bookmark,
  Copy,
  Check,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Star,
  Columns,
  SplitSquareHorizontal,
  FileText,
  Hash,
  Maximize2,
  Library,
  Users,
  MapPin,
  Volume2,
  Square,
  Languages,
} from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useTheoStore } from "@/store/useTheoStore";
import { StrongOverlay } from "./StrongOverlay";
import { BIBLE_BOOKS } from "@/data/bibleBooks";
import { type BibleBook } from "@/store/useTheoStore";
import * as Framer from "framer-motion";
const { motion, AnimatePresence } = Framer;
import { useTheoWorker } from "@/hooks/useTheoWorker";
import AgenticConsole from "./AgenticConsole";
import { InterlinearTable } from "./InterlinearTable";
import { useBible } from "@/hooks/useBible";
import { useVoice } from "@/hooks/useVoice";
import { useRouter } from "next/navigation";
import { ReaderHeader } from "./reader/ReaderHeader";
import { ReaderToolbar } from "./reader/ReaderToolbar";
import { ReaderSearch } from "./reader/ReaderSearch";
import { BookSelector } from "./reader/BookSelector";
import { ChapterSelector } from "./reader/ChapterSelector";
import { AIInsights } from "./reader/AIInsights";
import { VerseRow } from "./reader/VerseRow";
import { Button, Card, CardHeader } from "./ui";
import { CrossRefsPopover } from "./CrossRefsPopover";
import { useChapterCrossRefs } from "@/hooks/useCrossRefs";
import { useAdvancedSearch, isAdvancedSyntax } from "@/hooks/useAdvancedSearch";

export const TRANSLATIONS = [
  {
    id: "ara",
    name: "Almeida Revista e Atualizada (ARA)",
    lang: "PT",
    type: "Equivalência Formal",
  },
  {
    id: "nvipt",
    name: "Nova Versão Internacional (NVI)",
    lang: "PT",
    type: "Equivalência Dinâmica",
  },
  {
    id: "almeida",
    name: "João Ferreira de Almeida (JFA - Bible-API)",
    lang: "PT",
    type: "Equivalência Formal",
  },
  {
    id: "acf",
    name: "Almeida Corrigida Fiel (ACF - Digital)",
    lang: "PT",
    type: "Equivalência Formal",
  },
  {
    id: "apibible",
    name: "API.Bible (Custom ID)",
    lang: "EN",
    type: "Personalizado",
  },
  {
    id: "kjv",
    name: "King James Version (KJV)",
    lang: "EN",
    type: "Equivalência Formal",
  },
  {
    id: "web",
    name: "World English Bible (WEB - Bible-API)",
    lang: "EN",
    type: "Equivalência Formal",
  },
  {
    id: "clementine",
    name: "Clementine Latin Vulgate (Vulgate - Bible-API)",
    lang: "LA",
    type: "Equivalência Formal",
  },
  {
    id: "cuv",
    name: "Chinese Union Version (CUV - Bible-API)",
    lang: "ZH",
    type: "Equivalência Formal",
  },
];

export default function BibleReader({
  onClose,
  onOpenWordStudy,
  hideHeader = false,
}: {
  onClose: () => void;
  onOpenWordStudy?: (strongId: string) => void;
  hideHeader?: boolean;
}) {
  const router = useRouter();
  const {
    activeBook,
    activeChapter,
    activeVerseId,
    visibleVerseId,
    viewMode: storeViewMode,
    setActiveVerse,
    setVisibleVerse,
    setBibleReference,
    setViewMode: setStoreViewMode,
    setCurrentTime,
    _hasHydrated,
  } = useTheoStore();

  const [primaryTranslation, setPrimaryTranslation] = useState("ara");
  const [secondaryTranslation, setSecondaryTranslation] = useState("");

  const handleWorkerMessage = useCallback((type: string, payload: any) => {
    if (type === "STRONGS_DATA") {
      setHoverData((prev: any) => (prev ? { ...prev, ...payload } : null));
    }
  }, []);

  const { postMessage: workerPost } = useTheoWorker(handleWorkerMessage);
  const { chaptersData, secondaryData, interlinearMap, loading } = useBible(
    primaryTranslation,
    storeViewMode === "exegesis" ? "interlinear" : "text",
    secondaryTranslation || undefined,
  );

  const selectedBook =
    BIBLE_BOOKS.find(
      (b) => b.namePt === activeBook || b.nameEn === activeBook,
    ) || BIBLE_BOOKS[0];
  const [showBookSelector, setShowBookSelector] = useState(false);
  const [showChapterSelector, setShowChapterSelector] = useState(false);
  const [showTranslationSelector, setShowTranslationSelector] = useState(false);
  const [showSecondarySelector, setShowSecondarySelector] = useState(false);
  const [primarySearch, setPrimarySearch] = useState("");
  const [secondarySearch, setSecondarySearch] = useState("");
  const [showResourceGuide, setShowResourceGuide] = useState(false);
  const [selectedVerses, setSelectedVerses] = useState<Set<number>>(new Set());
  const [amplifyAnchor, setAmplifyAnchor] = useState<{
    x: number;
    y: number;
    verse: number;
  } | null>(null);
  const [crossRefAnchor, setCrossRefAnchor] = useState<{
    x: number;
    y: number;
    sourceRef: string;
  } | null>(null);
  const [hoverData, setHoverData] = useState<any | null>(null);

  const { speak, stopSpeaking } = useVoice();
  const [isPlaying, setIsPlaying] = useState(false);

  const toggleReading = () => {
    if (isPlaying) {
      stopSpeaking();
      setIsPlaying(false);
    } else {
      speak(versesToRender.map((v) => `${v.verse}. ${v.text}`).join(" "));
      setIsPlaying(true);
    }
  };

  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const advanced = useAdvancedSearch();
  const isAdvanced = searchMode && isAdvancedSyntax(searchQuery);

  const toggleVerseSelection = (verseNum: number) => {
    setSelectedVerses((prev) => {
      const next = new Set(prev);
      if (next.has(verseNum)) next.delete(verseNum);
      else next.add(verseNum);
      return next;
    });
    setActiveVerse(`${selectedBook.namePt} ${activeChapter}:${verseNum}`);
  };

  const handleWordHover = useCallback(
    (word: any, event: React.MouseEvent) => {
      if (word.strong) {
        setHoverData({
          word: word.original,
          strongId: word.strong,
          definition: "...",
          pos: { x: event.clientX, y: event.clientY },
        });
        workerPost("FETCH_STRONGS", {
          strongId: word.strong,
          book: activeBook,
        });
      }
    },
    [workerPost, activeBook],
  );

  const parentRef = useRef<HTMLDivElement>(null);
  const allVerses = chaptersData.length > 0 ? chaptersData[0].verses : [];
  const versesToRender =
    searchMode && searchQuery.trim()
      ? allVerses.filter((v) =>
          v.text.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : allVerses;

  const chapterRefs = React.useMemo(
    () =>
      versesToRender.map(
        (v) => `${selectedBook.nameEn} ${activeChapter}:${v.verse}`,
      ),
    [selectedBook.nameEn, activeChapter, versesToRender],
  );
  const { counts: crossRefCounts, list: listCrossRefs } =
    useChapterCrossRefs(chapterRefs);

  const rowVirtualizer = useVirtualizer({
    count: versesToRender.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 5,
  });

  return (
    <div className="flex flex-col h-full bg-[#FCFBF7] dark:bg-[#0A0D14] text-gray-900 dark:text-gray-100 overflow-hidden shadow-2xl w-full border-l border-gray-200 dark:border-white/10">
      {!hideHeader && (
        <ReaderHeader
          viewMode={storeViewMode}
          showResourceGuide={showResourceGuide}
          onToggleViewMode={() =>
            setStoreViewMode(
              storeViewMode === "reading" ? "exegesis" : "reading",
            )
          }
          onToggleResourceGuide={() => setShowResourceGuide(!showResourceGuide)}
          onExpand={() => router.push("/exegete")}
          onClose={onClose}
        />
      )}

      {/* Logos Style Academic Toolbar */}
      <div className="px-10 pb-4 border-b border-gray-200 dark:border-white/10 flex-shrink-0 bg-white/50 dark:bg-black/20 backdrop-blur-md">
        <ReaderToolbar
          primaryTranslation={primaryTranslation}
          setPrimaryTranslation={setPrimaryTranslation}
          secondaryTranslation={secondaryTranslation}
          setSecondaryTranslation={setSecondaryTranslation}
          searchMode={searchMode}
          setSearchMode={setSearchMode}
          showBookSelector={showBookSelector}
          setShowBookSelector={setShowBookSelector}
          showChapterSelector={showChapterSelector}
          setShowChapterSelector={setShowChapterSelector}
          showTranslationSelector={showTranslationSelector}
          setShowTranslationSelector={setShowTranslationSelector}
          showSecondarySelector={showSecondarySelector}
          setShowSecondarySelector={setShowSecondarySelector}
          chaptersData={chaptersData}
          isPlaying={isPlaying}
          toggleReading={toggleReading}
        />
      </div>

      <div className="relative flex-grow overflow-hidden flex flex-col">
        {/* Academic Page Container */}
        <div
          ref={parentRef}
          className="flex-grow overflow-y-auto custom-scrollbar-academic py-12"
        >
          <div className="max-w-4xl mx-auto px-8 md:px-16">
            {/* Chapter Heading */}
            {!loading && !searchMode && (
              <div className="text-center mb-16 space-y-4">
                <div className="flex items-center justify-center gap-4 mb-2">
                  <div className="h-px w-12 bg-blue-600/20" />
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em]">
                    Capítulo
                  </span>
                  <div className="h-px w-12 bg-blue-600/20" />
                </div>
                <h1 className="text-6xl font-serif font-bold text-gray-900 dark:text-white">
                  {activeChapter}
                </h1>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  {activeBook}
                </p>
              </div>
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Sincronizando Texto Sagrado...
                </p>
              </div>
            ) : (
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: "100%",
                  position: "relative",
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const vPrimary = versesToRender[virtualRow.index];
                  const vSecondary = secondaryData?.verses[virtualRow.index];
                  if (!vPrimary) return null;

                  return (
                    <div
                      key={virtualRow.key}
                      ref={rowVirtualizer.measureElement}
                      data-index={virtualRow.index}
                      className="absolute top-0 left-0 w-full"
                      style={{ transform: `translateY(${virtualRow.start}px)` }}
                    >
                      <VerseRow
                        verse={vPrimary.verse}
                        text={vPrimary.text}
                        secondaryText={vSecondary?.text}
                        selected={selectedVerses.has(vPrimary.verse)}
                        onClick={() => toggleVerseSelection(vPrimary.verse)}
                        highlightQuery={searchMode ? searchQuery : undefined}
                        crossRefCount={
                          crossRefCounts[
                            `${selectedBook.nameEn} ${activeChapter}:${vPrimary.verse}`
                          ] || 0
                        }
                        onCrossRefClick={(e) => {
                          const ref = `${selectedBook.nameEn} ${activeChapter}:${vPrimary.verse}`;
                          setCrossRefAnchor({
                            x: e.clientX,
                            y: e.clientY,
                            sourceRef: ref,
                          });
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Global Component Overlays */}
        <BookSelector
          isOpen={showBookSelector}
          onClose={() => setShowBookSelector(false)}
          onSelect={(book) => setBibleReference(book.namePt, 1)}
        />
        <ChapterSelector
          isOpen={showChapterSelector}
          onClose={() => setShowChapterSelector(false)}
          onSelect={(ch) => setBibleReference(activeBook, ch)}
        />

        <AnimatePresence>
          {showTranslationSelector && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[100] bg-background/95 backdrop-blur-xl p-6 md:p-10 overflow-y-auto custom-scrollbar flex flex-col"
            >
              <div className="w-full max-w-2xl mx-auto space-y-6 flex flex-col">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-serif font-bold text-foreground">
                      Versão de Estudo Primária
                    </h2>
                    <p className="text-xs text-muted mt-1">
                      Escolha a tradução bíblica principal para leitura e
                      exegese.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowTranslationSelector(false);
                      setPrimarySearch("");
                    }}
                    className="p-2.5 rounded-full bg-surface hover:bg-surface-hover border border-border-subtle hover:border-accent/40 text-foreground/60 hover:text-foreground transition-all hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer"
                    title="Fechar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="text"
                    value={primarySearch}
                    onChange={(e) => setPrimarySearch(e.target.value)}
                    placeholder="Buscar tradução por nome, sigla ou idioma..."
                    className="w-full pl-10 pr-4 py-3 bg-surface/50 border border-border-subtle rounded-xl text-sm text-foreground placeholder:text-muted focus:border-accent/45 focus:outline-none transition-all"
                  />
                  {primarySearch && (
                    <button
                      onClick={() => setPrimarySearch("")}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-surface-hover text-muted hover:text-foreground transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Grid list of translation options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-8">
                  {TRANSLATIONS.filter((t) => {
                    const q = primarySearch.toLowerCase();
                    return (
                      t.name.toLowerCase().includes(q) ||
                      t.id.toLowerCase().includes(q) ||
                      t.lang.toLowerCase().includes(q) ||
                      t.type.toLowerCase().includes(q)
                    );
                  }).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setPrimaryTranslation(t.id);
                        setShowTranslationSelector(false);
                        setPrimarySearch("");
                      }}
                      className={`relative w-full p-4 rounded-xl border transition-all text-left flex flex-col justify-between group overflow-hidden cursor-pointer ${
                        primaryTranslation === t.id
                          ? "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary text-foreground shadow-lg shadow-primary/5"
                          : "bg-surface/30 border-border-subtle hover:border-accent/30 text-foreground/80 hover:text-foreground"
                      }`}
                    >
                      {primaryTranslation === t.id && (
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
                      )}
                      <div className="flex items-start justify-between gap-3 w-full">
                        <div className="flex flex-col flex-grow">
                          <div className="font-bold text-sm tracking-wide flex items-center gap-2 text-foreground">
                            <span>{t.name}</span>
                          </div>
                          <div className="text-[10px] text-muted mt-1 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[8px] font-black ${
                                t.lang === "PT"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : t.lang === "EN"
                                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                    : t.lang === "LA"
                                      ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              }`}
                            >
                              {t.lang}
                            </span>
                            <span>•</span>
                            <span>{t.type}</span>
                          </div>
                        </div>
                        {primaryTranslation === t.id && (
                          <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        )}
                      </div>
                    </button>
                  ))}
                  {TRANSLATIONS.filter((t) => {
                    const q = primarySearch.toLowerCase();
                    return (
                      t.name.toLowerCase().includes(q) ||
                      t.id.toLowerCase().includes(q) ||
                      t.lang.toLowerCase().includes(q) ||
                      t.type.toLowerCase().includes(q)
                    );
                  }).length === 0 && (
                    <div className="col-span-1 md:col-span-2 py-12 text-center text-sm text-muted italic">
                      Nenhuma tradução encontrada para "{primarySearch}"
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showSecondarySelector && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[100] bg-background/95 backdrop-blur-xl p-6 md:p-10 overflow-y-auto custom-scrollbar flex flex-col"
            >
              <div className="w-full max-w-2xl mx-auto space-y-6 flex flex-col">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-serif font-bold text-foreground">
                      Versão de Estudo Paralela
                    </h2>
                    <p className="text-xs text-muted mt-1">
                      Selecione uma tradução secundária para comparar o texto
                      sagrado lado a lado.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowSecondarySelector(false);
                      setSecondarySearch("");
                    }}
                    className="p-2.5 rounded-full bg-surface hover:bg-surface-hover border border-border-subtle hover:border-accent/40 text-foreground/60 hover:text-foreground transition-all hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer"
                    title="Fechar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="text"
                    value={secondarySearch}
                    onChange={(e) => setSecondarySearch(e.target.value)}
                    placeholder="Buscar tradução por nome, sigla ou idioma..."
                    className="w-full pl-10 pr-4 py-3 bg-surface/50 border border-border-subtle rounded-xl text-sm text-foreground placeholder:text-muted focus:border-accent/45 focus:outline-none transition-all"
                  />
                  {secondarySearch && (
                    <button
                      onClick={() => setSecondarySearch("")}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-surface-hover text-muted hover:text-foreground transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Clear Option / Disable Parallel View Button */}
                <button
                  onClick={() => {
                    setSecondaryTranslation("");
                    setShowSecondarySelector(false);
                    setSecondarySearch("");
                  }}
                  className={`w-full p-4 rounded-xl border transition-all text-left flex items-center justify-between group overflow-hidden cursor-pointer ${
                    !secondaryTranslation
                      ? "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary text-foreground shadow-lg shadow-primary/5"
                      : "bg-surface/30 border-border-subtle hover:border-accent/30 text-foreground/80 hover:text-foreground"
                  }`}
                >
                  <div className="flex flex-col">
                    <div className="font-bold text-sm tracking-wide text-foreground">
                      Desativar Modo Comparativo
                    </div>
                    <div className="text-[10px] text-muted mt-1 uppercase tracking-wider font-semibold">
                      Exibir apenas a versão primária
                    </div>
                  </div>
                  {!secondaryTranslation && (
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  )}
                </button>

                <div className="h-px bg-border-subtle" />

                {/* Grid list of translation options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-8">
                  {TRANSLATIONS.filter((t) => {
                    // Do not show the current primary translation as a secondary option to prevent self-comparison
                    if (t.id === primaryTranslation) return false;

                    const q = secondarySearch.toLowerCase();
                    return (
                      t.name.toLowerCase().includes(q) ||
                      t.id.toLowerCase().includes(q) ||
                      t.lang.toLowerCase().includes(q) ||
                      t.type.toLowerCase().includes(q)
                    );
                  }).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setSecondaryTranslation(t.id);
                        setShowSecondarySelector(false);
                        setSecondarySearch("");
                      }}
                      className={`relative w-full p-4 rounded-xl border transition-all text-left flex flex-col justify-between group overflow-hidden cursor-pointer ${
                        secondaryTranslation === t.id
                          ? "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary text-foreground shadow-lg shadow-primary/5"
                          : "bg-surface/30 border-border-subtle hover:border-accent/30 text-foreground/80 hover:text-foreground"
                      }`}
                    >
                      {secondaryTranslation === t.id && (
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
                      )}
                      <div className="flex items-start justify-between gap-3 w-full">
                        <div className="flex flex-col flex-grow">
                          <div className="font-bold text-sm tracking-wide flex items-center gap-2 text-foreground">
                            <span>{t.name}</span>
                          </div>
                          <div className="text-[10px] text-muted mt-1 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[8px] font-black ${
                                t.lang === "PT"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : t.lang === "EN"
                                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                    : t.lang === "LA"
                                      ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              }`}
                            >
                              {t.lang}
                            </span>
                            <span>•</span>
                            <span>{t.type}</span>
                          </div>
                        </div>
                        {secondaryTranslation === t.id && (
                          <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        )}
                      </div>
                    </button>
                  ))}
                  {TRANSLATIONS.filter((t) => {
                    if (t.id === primaryTranslation) return false;
                    const q = secondarySearch.toLowerCase();
                    return (
                      t.name.toLowerCase().includes(q) ||
                      t.id.toLowerCase().includes(q) ||
                      t.lang.toLowerCase().includes(q) ||
                      t.type.toLowerCase().includes(q)
                    );
                  }).length === 0 && (
                    <div className="col-span-1 md:col-span-2 py-12 text-center text-sm text-muted italic">
                      Nenhuma outra tradução encontrada para "{secondarySearch}"
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AIInsights />
      </div>

      {/* Floating UI Elements */}
      {hoverData && (
        <StrongOverlay
          {...hoverData}
          onClose={() => setHoverData(null)}
          onOpenWordStudy={onOpenWordStudy}
        />
      )}

      {crossRefAnchor && (
        <CrossRefsPopover
          sourceRef={crossRefAnchor.sourceRef}
          position={{ x: crossRefAnchor.x, y: crossRefAnchor.y }}
          loader={() => listCrossRefs(crossRefAnchor.sourceRef)}
          onClose={() => setCrossRefAnchor(null)}
          onJump={({ book, chapter, verse }) => {
            const targetBook = BIBLE_BOOKS.find(
              (b) => b.nameEn === book || b.namePt === book,
            );
            if (targetBook) {
              setBibleReference(targetBook.namePt, chapter);
              setActiveVerse(`${targetBook.nameEn} ${chapter}:${verse}`);
            }
            setCrossRefAnchor(null);
          }}
        />
      )}
    </div>
  );
}

function BootingFallback({ label }: { label: string }) {
  return (
    <div className="h-screen w-full bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );
}
