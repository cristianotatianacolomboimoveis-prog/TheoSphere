"use client";

import React from "react";
import { 
  ChevronDown, Search, SplitSquareHorizontal, 
  BookOpen, ChevronRight, ChevronLeft, Volume2, Square 
} from "lucide-react";
import { useTheoStore, type BibleBook } from "@/store/useTheoStore";
import { TRANSLATIONS } from "../BibleReader";

interface ReaderToolbarProps {
  primaryTranslation: string;
  setPrimaryTranslation: (val: string) => void;
  secondaryTranslation: string;
  setSecondaryTranslation: (val: string) => void;
  searchMode: boolean;
  setSearchMode: (val: boolean) => void;
  showBookSelector: boolean;
  setShowBookSelector: (val: boolean) => void;
  showChapterSelector: boolean;
  setShowChapterSelector: (val: boolean) => void;
  showTranslationSelector: boolean;
  setShowTranslationSelector: (val: boolean) => void;
  showSecondarySelector: boolean;
  setShowSecondarySelector: (val: boolean) => void;
  chaptersData: any[];
  isPlaying: boolean;
  toggleReading: () => void;
}

export const ReaderToolbar: React.FC<ReaderToolbarProps> = ({
  primaryTranslation,
  setPrimaryTranslation,
  secondaryTranslation,
  setSecondaryTranslation,
  searchMode,
  setSearchMode,
  showBookSelector,
  setShowBookSelector,
  showChapterSelector,
  setShowChapterSelector,
  showTranslationSelector,
  setShowTranslationSelector,
  showSecondarySelector,
  setShowSecondarySelector,
  chaptersData,
  isPlaying,
  toggleReading,
}) => {
  const { activeBook, activeChapter, setBibleReference, books } = useTheoStore();

  const selectedBook = books.find(b => b.namePt === activeBook || b.nameEn === activeBook) || books[0] || {} as BibleBook;

  const closeAllSelectors = () => {
    setShowBookSelector(false);
    setShowChapterSelector(false);
    setShowTranslationSelector(false);
    setShowSecondarySelector(false);
  };

  return (
    <div className="flex gap-2 relative mt-4">
      {!searchMode && (
        <>
          {/* Seletor de Livro */}
          <button
            onClick={() => { closeAllSelectors(); setShowBookSelector(!showBookSelector); }}
            className="flex-grow flex items-center justify-between px-3 py-2 rounded-lg bg-surface-hover/50 border border-border-subtle hover:border-accent/20 transition-all text-sm"
          >
            <span className="font-semibold text-foreground/90">{selectedBook.namePt}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-foreground/30 transition-transform ${showBookSelector ? "rotate-180" : ""}`} />
          </button>

          {/* Seletor de Capítulo */}
          <button
            onClick={() => { closeAllSelectors(); setShowChapterSelector(!showChapterSelector); }}
            className="px-4 py-2 rounded-lg bg-surface-hover/50 border border-border-subtle hover:border-accent/20 transition-all text-sm font-bold text-accent flex items-center gap-1"
          >
            {activeChapter}
            <ChevronDown className={`w-3 h-3 text-foreground/30 transition-transform ${showChapterSelector ? "rotate-180" : ""}`} />
          </button>

          {/* Seletor de Tradução Primária */}
          <button
            onClick={() => { closeAllSelectors(); setShowTranslationSelector(!showTranslationSelector); }}
            className={`px-3 py-2 rounded-lg transition-all text-xs font-bold flex items-center gap-2 border ${showTranslationSelector ? "bg-accent/20 border-accent/30 text-accent" : "bg-surface-hover/50 border-border-subtle text-foreground/60 hover:border-accent/20"}`}
          >
            {primaryTranslation.toUpperCase()}
            <ChevronDown className={`w-3 h-3 transition-transform ${showTranslationSelector ? "rotate-180" : ""}`} />
          </button>

          {/* Botão de Modo Comparativo (Lado a Lado) */}
          <button
            onClick={() => { closeAllSelectors(); setShowSecondarySelector(!showSecondarySelector); }}
            className={`px-3 py-2 rounded-lg transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border ${secondaryTranslation ? "border-primary/30 bg-primary/10 text-primary shadow-[0_0_15px_rgba(59,130,246,0.1)]" : "border-border-subtle bg-surface-hover/50 text-foreground/40 hover:text-foreground hover:border-primary/30"}`}
            title="Abrir outra tradução lado a lado"
          >
            <SplitSquareHorizontal className={`w-3.5 h-3.5 ${secondaryTranslation ? "animate-pulse" : ""}`} />
            <span>{secondaryTranslation ? `PARALELO: ${secondaryTranslation.toUpperCase()}` : "COMPARAR"}</span>
          </button>

          {/* Indicador de Fonte (API vs Cache) */}
          {chaptersData.length > 0 && chaptersData[0].source && (
            <span
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border flex-shrink-0 ${
                chaptersData[0].source === "cache"
                  ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                  : "bg-blue-500/10 border-blue-500/25 text-blue-400"
              }`}
              title={chaptersData[0].source === "cache" ? "Servido do cache local" : "Servido da API remota"}
            >
              {chaptersData[0].source === "cache" ? "💾 Local" : "🌐 API"}
            </span>
          )}

          {/* Botão de Busca */}
          <button
            onClick={() => { closeAllSelectors(); setSearchMode(true); }}
            className="px-3 py-2 rounded-lg bg-surface-hover/50 border border-border-subtle hover:border-accent/20 transition-all text-foreground/30 hover:text-accent"
            title="Buscar no capítulo"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          {/* Botão de Leitura Bíblica */}
          <button
            onClick={toggleReading}
            className={`px-3 py-2 rounded-lg border transition-all ${
              isPlaying ? "bg-accent/20 border-accent/30 text-accent animate-pulse" : "bg-surface-hover/50 border-border-subtle text-foreground/30 hover:text-accent"
            }`}
            title={isPlaying ? "Parar Leitura" : "Ouvir Capítulo"}
          >
            {isPlaying ? <Square className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </>
      )}
    </div>
  );
};
