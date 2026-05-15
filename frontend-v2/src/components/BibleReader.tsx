"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, BookOpen, ChevronRight, ChevronLeft, X, Zap, BookMarked,
  ChevronDown, Bookmark, Copy, Check, Loader2, ArrowLeft, ArrowRight,
  Star, Columns, SplitSquareHorizontal, FileText, Hash, Maximize2, Library, Users, MapPin, Volume2, Square, Languages
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
  { id: "ara", name: "Almeida Revista e Atualizada (ARA)", lang: "PT", type: "Equivalência Formal" },
  { id: "nvipt", name: "Nova Versão Internacional (NVI)", lang: "PT", type: "Equivalência Dinâmica" },
  { id: "kjv", name: "King James Version (KJV)", lang: "EN", type: "Equivalência Formal" },
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
    activeBook, activeChapter, activeVerseId, visibleVerseId, viewMode: storeViewMode,
    setActiveVerse, setVisibleVerse, setBibleReference, setViewMode: setStoreViewMode, setCurrentTime, _hasHydrated 
  } = useTheoStore();

  const [primaryTranslation, setPrimaryTranslation] = useState("ara");
  const [secondaryTranslation, setSecondaryTranslation] = useState("");

  const handleWorkerMessage = useCallback((type: string, payload: any) => {
    if (type === "STRONGS_DATA") {
      setHoverData(prev => prev ? { ...prev, ...payload } : null);
    }
  }, []);

  const { postMessage: workerPost } = useTheoWorker(handleWorkerMessage);
  const { chaptersData, secondaryData, interlinearMap, loading } = useBible(primaryTranslation, storeViewMode === "exegesis" ? "interlinear" : "text", secondaryTranslation || undefined);
  
  const selectedBook = BIBLE_BOOKS.find(b => b.namePt === activeBook || b.nameEn === activeBook) || BIBLE_BOOKS[0];
  const [showBookSelector, setShowBookSelector] = useState(false);
  const [showChapterSelector, setShowChapterSelector] = useState(false);
  const [showTranslationSelector, setShowTranslationSelector] = useState(false);
  const [showSecondarySelector, setShowSecondarySelector] = useState(false);
  const [showResourceGuide, setShowResourceGuide] = useState(false);
  const [selectedVerses, setSelectedVerses] = useState<Set<number>>(new Set());
  const [amplifyAnchor, setAmplifyAnchor] = useState<{ x: number, y: number, verse: number } | null>(null);
  const [crossRefAnchor, setCrossRefAnchor] = useState<{ x: number; y: number; sourceRef: string; } | null>(null);
  const [hoverData, setHoverData] = useState<any | null>(null);

  const { speak, stopSpeaking } = useVoice();
  const [isPlaying, setIsPlaying] = useState(false);

  const toggleReading = () => {
    if (isPlaying) { stopSpeaking(); setIsPlaying(false); }
    else { speak(versesToRender.map(v => `${v.verse}. ${v.text}`).join(" ")); setIsPlaying(true); }
  };

  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const advanced = useAdvancedSearch();
  const isAdvanced = searchMode && isAdvancedSyntax(searchQuery);

  const toggleVerseSelection = (verseNum: number) => {
    setSelectedVerses(prev => {
      const next = new Set(prev);
      if (next.has(verseNum)) next.delete(verseNum);
      else next.add(verseNum);
      return next;
    });
    setActiveVerse(`${selectedBook.namePt} ${activeChapter}:${verseNum}`);
  };

  const handleWordHover = useCallback((word: any, event: React.MouseEvent) => {
    if (word.strong) {
      setHoverData({ word: word.original, strongId: word.strong, definition: "...", pos: { x: event.clientX, y: event.clientY } });
      workerPost("FETCH_STRONGS", { strongId: word.strong, book: activeBook });
    }
  }, [workerPost, activeBook]);

  const parentRef = useRef<HTMLDivElement>(null);
  const allVerses = chaptersData.length > 0 ? chaptersData[0].verses : [];
  const versesToRender = searchMode && searchQuery.trim()
    ? allVerses.filter(v => v.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : allVerses;

  const chapterRefs = React.useMemo(() => versesToRender.map((v) => `${selectedBook.nameEn} ${activeChapter}:${v.verse}`), [selectedBook.nameEn, activeChapter, versesToRender.length]);
  const { counts: crossRefCounts, list: listCrossRefs } = useChapterCrossRefs(chapterRefs);
  
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
          onToggleViewMode={() => setStoreViewMode(storeViewMode === "reading" ? "exegesis" : "reading")}
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
        <div ref={parentRef} className="flex-grow overflow-y-auto custom-scrollbar-academic py-12">
            <div className="max-w-4xl mx-auto px-8 md:px-16">
                
                {/* Chapter Heading */}
                {!loading && !searchMode && (
                    <div className="text-center mb-16 space-y-4">
                        <div className="flex items-center justify-center gap-4 mb-2">
                            <div className="h-px w-12 bg-blue-600/20" />
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em]">Capítulo</span>
                            <div className="h-px w-12 bg-blue-600/20" />
                        </div>
                        <h1 className="text-6xl font-serif font-bold text-gray-900 dark:text-white">{activeChapter}</h1>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{activeBook}</p>
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sincronizando Texto Sagrado...</p>
                    </div>
                ) : (
                    <div
                        style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}
                    >
                        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                            const vPrimary = versesToRender[virtualRow.index];
                            const vSecondary = secondaryData?.verses[virtualRow.index];
                            if (!vPrimary) return null;

                            return (
                                <div
                                    key={virtualRow.key}
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
                                        crossRefCount={crossRefCounts[`${selectedBook.nameEn} ${activeChapter}:${vPrimary.verse}`] || 0}
                                        onCrossRefClick={(e) => {
                                            const ref = `${selectedBook.nameEn} ${activeChapter}:${vPrimary.verse}`;
                                            setCrossRefAnchor({ x: e.clientX, y: e.clientY, sourceRef: ref });
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
        <BookSelector isOpen={showBookSelector} onClose={() => setShowBookSelector(false)} onSelect={(book) => setBibleReference(book.namePt, 1)} />
        <ChapterSelector isOpen={showChapterSelector} onClose={() => setShowChapterSelector(false)} onSelect={(ch) => setBibleReference(activeBook, ch)} />
        
        <AnimatePresence>
            {showTranslationSelector && (
                <div className="absolute inset-0 z-[100] bg-white/95 dark:bg-black/95 backdrop-blur-xl p-10 overflow-y-auto">
                    <div className="max-w-xl mx-auto space-y-4">
                        <h2 className="text-xl font-serif font-bold mb-8 text-center">Versão de Estudo Primária</h2>
                        {TRANSLATIONS.map(t => (
                            <button key={t.id} onClick={() => { setPrimaryTranslation(t.id); setShowTranslationSelector(false); }} className={`w-full p-6 rounded-xl border transition-all text-left ${primaryTranslation === t.id ? "bg-blue-600 border-blue-600 text-white shadow-xl" : "bg-gray-50 border-gray-200 hover:border-blue-500"}`}>
                                <div className="font-bold">{t.name}</div>
                                <div className="text-[10px] uppercase opacity-60 mt-1">{t.type}</div>
                            </button>
                        ))}
                    </div>
                </div>
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
            const targetBook = BIBLE_BOOKS.find((b) => b.nameEn === book || b.namePt === book);
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
