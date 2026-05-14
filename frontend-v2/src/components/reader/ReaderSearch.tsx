"use client";

import React from "react";
import { Search, X } from "lucide-react";
import { QueryChips } from "./QueryChips";

interface ReaderSearchProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  setSearchMode: (val: boolean) => void;
  isAdvanced: boolean;
  advanced: any;
  versesToRender: any[];
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

export const ReaderSearch: React.FC<ReaderSearchProps> = ({
  searchQuery,
  setSearchQuery,
  setSearchMode,
  isAdvanced,
  advanced,
  versesToRender,
  searchInputRef,
}) => {
  return (
    <div className="flex gap-2 relative mt-4">
      <div className="flex-grow flex flex-col gap-1.5">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-hover border border-accent/30">
          <Search className="w-4 h-4 text-accent flex-shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => { if (e.key === "Escape") setSearchMode(false); }}
            placeholder='Buscar… (ex: book:John "in the beginning")'
            className="flex-grow bg-transparent text-sm text-foreground/90 placeholder-foreground/30 outline-none"
            title='Sintaxe avançada: AND, OR, "frase exata", book:Nome, chapter:1-3, -excluir'
          />
          {searchQuery && (
            <span className="text-[10px] text-accent/60 font-mono flex-shrink-0">
              {isAdvanced
                ? `${advanced.hits.length} hit${advanced.hits.length !== 1 ? "s" : ""}`
                : `${versesToRender.length} resultado${versesToRender.length !== 1 ? "s" : ""}`}
            </span>
          )}
          <button
            onClick={() => setSearchMode(false)}
            className="p-1 rounded-md hover:bg-red-500/10 text-foreground/30 hover:text-red-400 transition-all flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        
        {/* Chips indicando o que o parser interpretou — Logos-style preview */}
        {isAdvanced && advanced.parsed && (
          <QueryChips parsed={advanced.parsed} hitsCount={advanced.hits.length} />
        )}
        {isAdvanced && advanced.error && (
          <p className="text-[10px] text-red-400 px-1">{advanced.error}</p>
        )}
      </div>
    </div>
  );
};
