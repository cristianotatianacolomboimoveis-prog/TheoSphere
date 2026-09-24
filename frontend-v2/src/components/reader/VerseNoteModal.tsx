"use client";

import React, { useState } from "react";
import { X, Save, MessageSquare, Trash2, Check } from "lucide-react";

interface VerseNoteModalProps {
  reference: string;
  verseText: string;
  initialNote: string;
  onSave: (note: string) => void;
  onDelete: () => void;
  onClose: () => void;
}

export const VerseNoteModal: React.FC<VerseNoteModalProps> = ({
  reference,
  verseText,
  initialNote,
  onSave,
  onDelete,
  onClose,
}) => {
  const [note, setNote] = useState(initialNote);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave(note);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 600);
  };

  const handleDelete = () => {
    if (confirm("Deseja apagar esta anotação?")) {
      onDelete();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white dark:bg-[#161B22] rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/[0.05] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                Caderno de Notas
              </h3>
              <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                {reference}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Versículo de Referência */}
        {verseText && (
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200/60 dark:border-white/[0.05]">
            <p className="text-xs font-serif text-gray-600 dark:text-gray-300 leading-relaxed italic line-clamp-3">
              "{verseText}"
            </p>
          </div>
        )}

        {/* Campo de Anotação */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
            Sua Reflexão Teológica / Homilética:
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={6}
            placeholder="Escreva seus apontamentos de exegese, esboço de sermão ou aplicação prática..."
            className="w-full p-3.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm leading-relaxed text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none font-serif"
          />
        </div>

        {/* Footer com Ações */}
        <div className="flex items-center justify-between pt-2">
          {initialNote ? (
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir Nota</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all ${
                saved
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {saved ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Salvo!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Nota</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
