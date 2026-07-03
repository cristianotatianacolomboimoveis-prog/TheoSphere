"use client";

import React, { useState } from "react";
import { Search, X, Check } from "lucide-react";
import * as Framer from "framer-motion";
const { motion, AnimatePresence } = Framer;

export interface TranslationOption {
  id: string;
  name: string;
  lang: string;
  type: string;
}

export interface TranslationPickerProps {
  /** Título exibido no topo do painel (ex: "Versão de Estudo Primária") */
  title: string;
  /** Subtítulo descritivo abaixo do título */
  subtitle: string;
  /** ID da tradução atualmente selecionada */
  selectedTranslation: string;
  /** Callback ao selecionar uma tradução */
  onSelect: (translationId: string) => void;
  /** Lista de traduções disponíveis */
  translations: TranslationOption[];
  /** Controla visibilidade do painel */
  isOpen: boolean;
  /** Callback para fechar o painel */
  onClose: () => void;
  /** Exibir opção "Desativar" (usado no seletor secundário) */
  showDisableOption?: boolean;
  /** IDs a excluir da lista (ex: tradução primária no seletor secundário) */
  excludeIds?: string[];
}

export const TranslationPicker: React.FC<TranslationPickerProps> = ({
  title,
  subtitle,
  selectedTranslation,
  onSelect,
  translations,
  isOpen,
  onClose,
  showDisableOption = false,
  excludeIds = [],
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const handleClose = () => {
    setSearchTerm("");
    onClose();
  };

  const handleSelect = (id: string) => {
    onSelect(id);
    setSearchTerm("");
  };

  // Filtra traduções pelo termo de busca e exclui IDs bloqueados
  const filtered = translations.filter((t) => {
    if (excludeIds.includes(t.id)) return false;
    const q = searchTerm.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q) ||
      t.lang.toLowerCase().includes(q) ||
      t.type.toLowerCase().includes(q)
    );
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-[100] bg-background/95 backdrop-blur-xl p-6 md:p-10 overflow-y-auto custom-scrollbar flex flex-col"
        >
          <div className="w-full max-w-2xl mx-auto space-y-6 flex flex-col">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-serif font-bold text-foreground">
                  {title}
                </h2>
                <p className="text-xs text-muted mt-1">{subtitle}</p>
              </div>
              <button
                onClick={handleClose}
                className="p-2.5 rounded-full bg-surface hover:bg-surface-hover border border-border-subtle hover:border-accent/40 text-foreground/60 hover:text-foreground transition-all hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Barra de busca */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar tradução por nome, sigla ou idioma..."
                className="w-full pl-10 pr-4 py-3 bg-surface/50 border border-border-subtle rounded-xl text-sm text-foreground placeholder:text-muted focus:border-accent/45 focus:outline-none transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-surface-hover text-muted hover:text-foreground transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Opção para desativar modo comparativo (seletor secundário) */}
            {showDisableOption && (
              <>
                <button
                  onClick={() => handleSelect("")}
                  className={`w-full p-4 rounded-xl border transition-all text-left flex items-center justify-between group overflow-hidden cursor-pointer ${
                    !selectedTranslation
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
                  {!selectedTranslation && (
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  )}
                </button>
                <div className="h-px bg-border-subtle" />
              </>
            )}

            {/* Grid de traduções */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-8">
              {filtered.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSelect(t.id)}
                  className={`relative w-full p-4 rounded-xl border transition-all text-left flex flex-col justify-between group overflow-hidden cursor-pointer ${
                    selectedTranslation === t.id
                      ? "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary text-foreground shadow-lg shadow-primary/5"
                      : "bg-surface/30 border-border-subtle hover:border-accent/30 text-foreground/80 hover:text-foreground"
                  }`}
                >
                  {selectedTranslation === t.id && (
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
                    {selectedTranslation === t.id && (
                      <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    )}
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="col-span-1 md:col-span-2 py-12 text-center text-sm text-muted italic">
                  Nenhuma tradução encontrada para &quot;{searchTerm}&quot;
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
