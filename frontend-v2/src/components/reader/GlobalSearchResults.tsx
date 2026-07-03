"use client";

import React from "react";
import { Loader2, Search } from "lucide-react";
import { BIBLE_BOOKS } from "@/data/bibleBooks";
import type { AdvancedHit } from "@/hooks/useAdvancedSearch";

export interface GlobalSearchResultsProps {
  /** Resultados da busca avançada (RRF + pgvector + FTS) */
  hits: AdvancedHit[];
  /** Indica se a busca está em andamento */
  loading: boolean;
  /** Mensagem de erro, se houver */
  error: string | null;
  /** Termo buscado (debounced) para exibição no estado vazio */
  debouncedQuery: string;
  /** Callback ao clicar em um resultado — navega até o versículo */
  onSelectResult: (result: {
    bookId: number;
    chapter: number;
    verse: number;
    translation: string;
  }) => void;
}

export const GlobalSearchResults: React.FC<GlobalSearchResultsProps> = ({
  hits,
  loading,
  error,
  debouncedQuery,
  onSelectResult,
}) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
          Pesquisando em toda a Biblia...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center space-y-2">
        <p className="text-sm text-red-400">{error}</p>
        <p className="text-xs text-muted">Tente ajustar sua busca.</p>
      </div>
    );
  }

  if (hits.length > 0) {
    return (
      <div className="space-y-3 pb-12">
        {hits.map((hit) => {
          // Resolve o nome do livro a partir do bookId
          const hitBook = BIBLE_BOOKS.find((b) => b.id === hit.bookId);
          const bookLabel = hitBook?.namePt || `Livro ${hit.bookId}`;
          const refStr = `${bookLabel} ${hit.chapter}:${hit.verse}`;
          return (
            <button
              key={hit.id}
              onClick={() =>
                onSelectResult({
                  bookId: hit.bookId,
                  chapter: hit.chapter,
                  verse: hit.verse,
                  translation: hit.translation,
                })
              }
              className="w-full text-left p-4 rounded-xl border border-border-subtle bg-surface/30 hover:border-accent/30 hover:bg-surface-hover/60 transition-all group cursor-pointer"
            >
              <div className="flex items-baseline gap-3 mb-1">
                <span className="text-xs font-black text-blue-500 uppercase tracking-wider flex-shrink-0">
                  {refStr}
                </span>
                <span className="text-[10px] text-muted font-mono uppercase">
                  {hit.translation.toUpperCase()}
                </span>
                {hit.score > 0 && (
                  <span className="text-[9px] text-muted/50 font-mono ml-auto">
                    score {hit.score.toFixed(2)}
                  </span>
                )}
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed group-hover:text-foreground transition-colors">
                {hit.text}
              </p>
            </button>
          );
        })}
      </div>
    );
  }

  // Estado vazio — query curta ou sem resultados
  if (debouncedQuery.trim().length >= 2) {
    return (
      <div className="py-16 text-center space-y-2">
        <Search className="w-8 h-8 text-muted/30 mx-auto" />
        <p className="text-sm text-muted">
          Nenhum resultado para &quot;{debouncedQuery}&quot;
        </p>
      </div>
    );
  }

  return (
    <div className="py-16 text-center">
      <p className="text-sm text-muted">
        Digite ao menos 2 caracteres para buscar em toda a Biblia.
      </p>
    </div>
  );
};
