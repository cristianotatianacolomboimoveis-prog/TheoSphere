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
import { TranslationPicker } from "./reader/TranslationPicker";
import { GlobalSearchResults } from "./reader/GlobalSearchResults";
import { Button, Card, CardHeader } from "./ui";
import { CrossRefsPopover } from "./CrossRefsPopover";
import { useChapterCrossRefs } from "@/hooks/useCrossRefs";
import { useAdvancedSearch, isAdvancedSyntax } from "@/hooks/useAdvancedSearch";
import { useDebounce } from "@/hooks/useDebounce";

export const TRANSLATIONS = [
  // Traduções de licença livre (CC) — padrão do beta público.
  // Servidas do banco local via seed-public-domain.ts (backend).
  {
    id: "blivre",
    name: "Bíblia Livre (BLIVRE)",
    lang: "PT",
    type: "Equivalência Formal • Licença Livre",
  },
  {
    id: "nva",
    name: "Nova Versão de Acesso Livre (NVA)",
    lang: "PT",
    type: "Equivalência Dinâmica • Licença Livre",
  },
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

  // Padrão do beta: BLIVRE (licença livre CC BY 3.0 BR) — ver go-to-market-checklist.md
  const [primaryTranslation, setPrimaryTranslation] = useState("blivre");
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
  const [showResourceGuide, setShowResourceGuide] = useState(false);

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
  // Estado para alternar entre busca local (no capitulo) e global (backend RRF + pgvector + FTS)
  const [isGlobalSearch, setIsGlobalSearch] = useState(false);
  const advanced = useAdvancedSearch();
  const isAdvanced = searchMode && isAdvancedSyntax(searchQuery);
  const debouncedQuery = useDebounce(searchQuery, 300);

  // Dispara busca global no backend quando ativada
  useEffect(() => {
    if (!searchMode || !isGlobalSearch) {
      return;
    }
    if (debouncedQuery.trim().length >= 2) {
      advanced.search(debouncedQuery, { translation: primaryTranslation });
    } else {
      advanced.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, isGlobalSearch, searchMode, primaryTranslation]);

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

  // Callback para navegação ao clicar em resultado da busca global
  const handleGlobalSearchSelect = useCallback(
    (result: { bookId: number; chapter: number; verse: number }) => {
      const hitBook = BIBLE_BOOKS.find((b) => b.id === result.bookId);
      if (hitBook) {
        setBibleReference(hitBook.namePt, result.chapter);
        setActiveVerse(`${hitBook.nameEn} ${result.chapter}:${result.verse}`);
      }
      setSearchMode(false);
      setSearchQuery("");
      setIsGlobalSearch(false);
      advanced.reset();
    },
    [setBibleReference, setActiveVerse, advanced],
  );

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
        {/* Barra de busca — renderizada quando searchMode esta ativo */}
        {searchMode && (
          <ReaderSearch
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            setSearchMode={(val) => {
              setSearchMode(val);
              if (!val) {
                setSearchQuery("");
                setIsGlobalSearch(false);
                advanced.reset();
              }
            }}
            isAdvanced={isAdvanced}
            advanced={advanced}
            versesToRender={versesToRender}
            searchInputRef={{ current: null }}
            isGlobalSearch={isGlobalSearch}
            setIsGlobalSearch={setIsGlobalSearch}
          />
        )}
      </div>

      <div className="relative flex-grow overflow-hidden flex flex-col">
        {/* Academic Page Container */}
        <div
          ref={parentRef}
          className="flex-grow overflow-y-auto custom-scrollbar-academic py-12"
        >
          <div className="max-w-4xl mx-auto px-8 md:px-16">
            {/* Chapter Heading — oculto durante busca */}
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

            {/* Resultados da busca global (backend RRF + pgvector + FTS) */}
            {searchMode && isGlobalSearch ? (
              <GlobalSearchResults
                hits={advanced.hits}
                loading={advanced.loading}
                error={advanced.error}
                debouncedQuery={debouncedQuery}
                onSelectResult={handleGlobalSearchSelect}
              />
            ) : loading ? (
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

        {/* Seletor de tradução primária */}
        <TranslationPicker
          title="Versão de Estudo Primária"
          subtitle="Escolha a tradução bíblica principal para leitura e exegese."
          selectedTranslation={primaryTranslation}
          onSelect={(id) => {
            setPrimaryTranslation(id);
            setShowTranslationSelector(false);
          }}
          translations={TRANSLATIONS}
          isOpen={showTranslationSelector}
          onClose={() => setShowTranslationSelector(false)}
        />

        {/* Seletor de tradução secundária (modo comparativo) */}
        <TranslationPicker
          title="Versão de Estudo Paralela"
          subtitle="Selecione uma tradução secundária para comparar o texto sagrado lado a lado."
          selectedTranslation={secondaryTranslation}
          onSelect={(id) => {
            setSecondaryTranslation(id);
            setShowSecondarySelector(false);
          }}
          translations={TRANSLATIONS}
          isOpen={showSecondarySelector}
          onClose={() => setShowSecondarySelector(false)}
          showDisableOption
          excludeIds={[primaryTranslation]}
        />

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
