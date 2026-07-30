"use client";

import React from "react";
import { Search, X, Globe, FileText } from "lucide-react";
import { QueryChips } from "./QueryChips";

interface ReaderSearchProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  setSearchMode: (val: boolean) => void;
  isAdvanced: boolean;
  advanced: any;
  versesToRender: any[];
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  /** Alterna entre busca local (capitulo) e global (toda a Biblia via backend) */
  isGlobalSearch: boolean;
  setIsGlobalSearch: (val: boolean) => void;
}

export const ReaderSearch: React.FC<ReaderSearchProps> = ({
  searchQuery,
  setSearchQuery,
  setSearchMode,
  isAdvanced,
  advanced,
  versesToRender,
  searchInputRef,
  isGlobalSearch,
  setIsGlobalSearch,
}) => {
  return (
    <div className="flex gap-2 relative mt-4">
      <div className="flex-grow flex flex-col gap-1.5">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-hover border border-accent/30">
          {/* Botao para alternar entre busca local e global */}
          <button
            onClick={() => setIsGlobalSearch(!isGlobalSearch)}
            className={`p-1.5 rounded-md transition-all flex-shrink-0 ${
              isGlobalSearch
                ? "bg-blue-500/15 text-blue-500 border border-blue-500/30"
                : "text-foreground/30 hover:text-foreground/60 hover:bg-surface-hover"
            }`}
            title={
              isGlobalSearch
                ? "Busca global ativa (toda a Biblia) — clique para busca local"
                : "Busca local (somente este capitulo) — clique para busca global"
            }
          >
            {isGlobalSearch ? (
              <Globe className="w-3.5 h-3.5" />
            ) : (
              <FileText className="w-3.5 h-3.5" />
            )}
          </button>
          <Search className="w-4 h-4 text-accent flex-shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setSearchMode(false);
            }}
            placeholder={
              isGlobalSearch
                ? "Busca global… (ex: strong:G26 book:João, graça NEAR/3 fé)"
                : "Buscar neste capitulo…"
            }
            className="flex-grow bg-transparent text-sm text-foreground/90 placeholder-foreground/30 outline-none"
            title={
              isGlobalSearch
                ? 'Sintaxe avançada: AND, OR, "frase exata", book:Nome, chapter:1-3, -excluir, strong:G26, morph:V-AAI, lemma:ἀγαπάω, termo1 NEAR/3 termo2'
                : "Filtro simples no capitulo atual"
            }
          />
          {searchQuery && (
            <span className="text-[10px] text-accent/60 font-mono flex-shrink-0">
              {isGlobalSearch
                ? advanced.loading
                  ? "buscando…"
                  : `${advanced.hits.length} hit${advanced.hits.length !== 1 ? "s" : ""}`
                : isAdvanced
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
        {/* Indicador de modo de busca */}
        {isGlobalSearch && (
          <p className="text-[10px] text-blue-400 px-1 font-semibold uppercase tracking-wider">
            Busca global — pesquisando em toda a Biblia via servidor
          </p>
        )}

        {/* Chips indicando o que o parser interpretou — Logos-style preview */}
        {(isAdvanced || isGlobalSearch) && advanced.parsed && (
          <QueryChips
            parsed={advanced.parsed}
            hitsCount={advanced.hits.length}
          />
        )}
        {(isAdvanced || isGlobalSearch) && advanced.error && (
          <p className="text-[10px] text-red-400 px-1">{advanced.error}</p>
        )}
      </div>
    </div>
  );
};
