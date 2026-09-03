"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Command,
  Search,
  BookOpen,
  Sparkles,
  ArrowRight,
  Loader2,
  X,
  FileText,
  Filter,
} from "lucide-react";
import { useTheoStore } from "@/store/useTheoStore";
import { parseBibleReference } from "@/lib/bibleReference";
import { useAdvancedSearch, isAdvancedSyntax } from "@/hooks/useAdvancedSearch";
import { BIBLE_BOOKS } from "@/data/bibleBooks";
import { useDebounce } from "@/hooks/useDebounce";

interface TheoSphereCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TheoSphereCommandPalette({
  isOpen,
  onClose,
}: TheoSphereCommandPaletteProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  const {
    setBibleReference,
    setActiveVerse,
    setActiveTool,
    setWorkspaceLayout,
  } = useTheoStore();

  const { search, hits, loading, error, parsed } = useAdvancedSearch();

  // Foco automático no input ao abrir
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Dispara a busca quando debouncedQuery mudar e tiver pelo menos 2 caracteres
  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    const isRef = parseBibleReference(trimmed);

    if (trimmed.length >= 2 && !isRef) {
      search(trimmed, { limit: 12 });
    }
  }, [debouncedQuery, search]);

  if (!isOpen) return null;

  const parsedRef = parseBibleReference(query.trim());
  const isAdvanced = isAdvancedSyntax(query);

  const handleGoToVerse = (
    bookName: string,
    chapter: number,
    verse?: number,
  ) => {
    setBibleReference(bookName, chapter);
    if (verse) {
      setActiveVerse(String(verse));
    }
    setActiveTool("exegesis");
    onClose();
  };

  const handleOpenFactbook = (topic: string) => {
    setActiveTool("factbook");
    onClose();
  };

  const handleAskCopilot = (prompt: string) => {
    setWorkspaceLayout("copilot");
    setActiveTool("exegesis");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-20 bg-black/60 backdrop-blur-sm p-4 animate-in fade-in-0 duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-[#161B22] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-gray-200 dark:border-white/10 gap-3">
          <Command className="w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "Enter" && parsedRef) {
                handleGoToVerse(
                  parsedRef.book.namePt,
                  parsedRef.chapter,
                  parsedRef.verse,
                );
              }
            }}
            placeholder="Ir para passagem (ex: Sl 23:1), pesquisar (ex: amor AND paz, book:Rom graça)..."
            className="flex-grow bg-transparent text-sm md:text-base outline-none text-gray-800 dark:text-gray-100 placeholder:text-gray-400 font-medium"
          />
          {loading && (
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          )}
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Chips de Sintaxe Avançada Interpretada */}
        {parsed && isAdvanced && (
          <div className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-50 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/5 text-[11px] overflow-x-auto">
            <Filter className="w-3 h-3 text-blue-500 flex-shrink-0" />
            <span className="font-bold text-gray-500">Filtros Logos:</span>
            {parsed.bookName && (
              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 font-semibold">
                Livro: {parsed.bookName}
              </span>
            )}
            {parsed.chapterMin && (
              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 font-semibold">
                Capítulo: {parsed.chapterMin}
                {parsed.chapterMax ? `-${parsed.chapterMax}` : ""}
              </span>
            )}
            {parsed.must.map((term, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold"
              >
                +{term}
              </span>
            ))}
            {parsed.mustNot.map((term, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 font-semibold"
              >
                -{term}
              </span>
            ))}
          </div>
        )}

        {/* Results Area */}
        <div className="overflow-y-auto p-2 space-y-1 flex-grow">
          {/* Caso 1: Referência Bíblica Detectada */}
          {parsedRef && (
            <button
              onClick={() =>
                handleGoToVerse(
                  parsedRef.book.namePt,
                  parsedRef.chapter,
                  parsedRef.verse,
                )
              }
              className="w-full flex items-center justify-between p-3 rounded-xl bg-blue-50/70 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-left hover:bg-blue-100/70 dark:hover:bg-blue-500/20 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                    <span>
                      {parsedRef.book.namePt} {parsedRef.chapter}
                      {parsedRef.verse ? `:${parsedRef.verse}` : ""}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-300">
                      Navegar
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Abrir leitor bíblico imediatamente nesta perícope
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </button>
          )}

          {/* Caso 2: Resultados da Busca Híbrida */}
          {hits.length > 0 && !parsedRef && (
            <div className="space-y-1">
              <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center justify-between">
                <span>Versículos Encontrados ({hits.length})</span>
                <span className="text-blue-500">Busca Híbrida RRF</span>
              </div>
              {hits.map((hit) => {
                const book = BIBLE_BOOKS.find((b) => b.id === hit.bookId);
                const bookName = book?.namePt || `Livro ${hit.bookId}`;
                const refLabel = `${bookName} ${hit.chapter}:${hit.verse}`;

                return (
                  <button
                    key={hit.id}
                    onClick={() =>
                      handleGoToVerse(bookName, hit.chapter, hit.verse)
                    }
                    className="w-full flex items-start justify-between p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-left transition-colors border border-transparent hover:border-gray-200 dark:hover:border-white/10"
                  >
                    <div className="space-y-0.5 min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                          {refLabel}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-gray-100 dark:bg-white/10 text-gray-500 uppercase">
                          {hit.translation}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                        {hit.text}
                      </p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-1" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Caso 3: Sugestões de Atalhos quando há query */}
          {query.trim().length >= 2 && (
            <div className="pt-2 border-t border-gray-100 dark:border-white/5 space-y-1">
              <button
                onClick={() => handleOpenFactbook(query.trim())}
                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-500/10 text-left transition-colors text-xs text-gray-700 dark:text-gray-300"
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>
                    Explorar <strong>"{query.trim()}"</strong> no Factbook
                  </span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
              </button>

              <button
                onClick={() => handleAskCopilot(query.trim())}
                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-500/10 text-left transition-colors text-xs text-gray-700 dark:text-gray-300"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-purple-500" />
                  <span>
                    Pedir análise exegética de <strong>"{query.trim()}"</strong>{" "}
                    ao Copilot IA
                  </span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
          )}

          {/* Estado Vazio Inicial */}
          {query.trim().length < 2 && (
            <div className="p-8 text-center space-y-3 text-gray-400">
              <Search className="w-8 h-8 mx-auto opacity-30" />
              <div>
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                  Pesquisa Bíblica & Teológica Avançada
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Digite uma referência (ex: Sl 23, Jo 1:1), termos com
                  operadores (AND, OR, NOT, NEAR) ou busque por temas.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-gray-50 dark:bg-[#0D1117] border-t border-gray-200 dark:border-white/10 flex items-center justify-between text-[11px] text-gray-400">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-white/10 text-[10px] font-mono">
                ESC
              </kbd>{" "}
              fechar
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-white/10 text-[10px] font-mono">
                ENTER
              </kbd>{" "}
              selecionar
            </span>
          </div>
          <span className="font-semibold text-blue-500">
            TheoSphere Speed Search
          </span>
        </div>
      </div>
    </div>
  );
}
