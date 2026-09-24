"use client";

import React, { useState } from "react";
import {
  Highlighter,
  MessageSquarePlus,
  Copy,
  Check,
  Scale,
  X,
  Trash2,
  Sparkles,
} from "lucide-react";
import {
  HighlightColor,
  THEOLOGICAL_COLORS,
} from "@/hooks/useVerseAnnotations";

interface VerseSelectionToolbarProps {
  selectedCount: number;
  onApplyHighlight: (color: HighlightColor | null) => void;
  onOpenNote: () => void;
  onCopyVerses: () => void;
  onOpenCompare: () => void;
  onOpenHomiletics?: () => void;
  onClearSelection: () => void;
}

export const VerseSelectionToolbar: React.FC<VerseSelectionToolbarProps> = ({
  selectedCount,
  onApplyHighlight,
  onOpenNote,
  onCopyVerses,
  onOpenCompare,
  onOpenHomiletics,
  onClearSelection,
}) => {
  const [copied, setCopied] = useState(false);

  if (selectedCount === 0) return null;

  const handleCopy = () => {
    onCopyVerses();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const colors: HighlightColor[] = ["yellow", "green", "blue", "purple", "red"];

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="flex items-center gap-2 p-2 rounded-2xl bg-white/95 dark:bg-[#161B22]/95 backdrop-blur-md border border-gray-200 dark:border-white/10 shadow-2xl">
        {/* Contador de Versículos */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200/50 dark:border-white/5 text-xs font-bold text-gray-700 dark:text-gray-300">
          <span>{selectedCount}</span>
          <span className="text-[10px] uppercase tracking-wider text-gray-400">
            {selectedCount === 1 ? "versículo" : "versículos"}
          </span>
        </div>

        {/* Separador */}
        <div className="w-[1px] h-6 bg-gray-200 dark:bg-white/10 mx-1" />

        {/* Paleta de Cores Marca-Texto */}
        <div className="flex items-center gap-1">
          {colors.map((c) => {
            const def = THEOLOGICAL_COLORS[c];
            const dotColor: Record<HighlightColor, string> = {
              yellow: "bg-amber-400 hover:bg-amber-300",
              green: "bg-emerald-400 hover:bg-emerald-300",
              blue: "bg-sky-400 hover:bg-sky-300",
              purple: "bg-purple-400 hover:bg-purple-300",
              red: "bg-rose-400 hover:bg-rose-300",
            };

            return (
              <button
                key={c}
                onClick={() => onApplyHighlight(c)}
                title={`Marcar: ${def.label}`}
                className={`w-6 h-6 rounded-full ${dotColor[c]} shadow-sm transition-transform hover:scale-115 active:scale-95`}
              />
            );
          })}

          <button
            onClick={() => onApplyHighlight(null)}
            title="Remover marca-texto"
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Separador */}
        <div className="w-[1px] h-6 bg-gray-200 dark:bg-white/10 mx-1" />

        {/* Ações Rápidas */}
        <div className="flex items-center gap-1">
          <button
            onClick={onOpenNote}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-xs font-semibold text-gray-700 dark:text-gray-200 transition-colors"
            title="Adicionar ou editar anotação"
          >
            <MessageSquarePlus className="w-3.5 h-3.5 text-blue-500" />
            <span>Nota</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-xs font-semibold text-gray-700 dark:text-gray-200 transition-colors"
            title="Copiar texto formatado"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">
                  Copiado!
                </span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-gray-500" />
                <span>Copiar</span>
              </>
            )}
          </button>

          <button
            onClick={onOpenCompare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-xs font-semibold text-gray-700 dark:text-gray-200 transition-colors"
            title="Comparar versões (Sinopse)"
          >
            <Scale className="w-3.5 h-3.5 text-indigo-500" />
            <span>Sinopse</span>
          </button>

          {onOpenHomiletics && (
            <button
              onClick={onOpenHomiletics}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-xs font-semibold text-amber-500 transition-colors"
              title="Gerar Esboço Homilético Expositivo"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Esboço</span>
            </button>
          )}
        </div>

        {/* Fechar/Desmarcar */}
        <button
          onClick={onClearSelection}
          className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors ml-1"
          title="Desmarcar seleção"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
