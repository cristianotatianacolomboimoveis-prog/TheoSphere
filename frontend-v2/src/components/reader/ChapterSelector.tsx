"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheoStore } from "@/store/useTheoStore";

interface ChapterSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (chapter: number) => void;
}

export const ChapterSelector: React.FC<ChapterSelectorProps> = ({ isOpen, onClose, onSelect }) => {
  const { books, activeBook, activeChapter } = useTheoStore();

  const selectedBook = books.find(b => b.namePt === activeBook || b.nameEn === activeBook);
  const chapterCount = selectedBook?.chapters || 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute inset-0 z-30 bg-background/98 backdrop-blur-xl overflow-y-auto custom-scrollbar p-4"
        >
          <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest mb-3 px-1">
            {selectedBook?.namePt || activeBook} — {chapterCount} capítulos
          </p>
          <div className="grid grid-cols-6 gap-1.5">
            {Array.from({ length: chapterCount }, (_, i) => i + 1).map(ch => (
              <button
                key={ch}
                onClick={() => { onSelect(ch); onClose(); }}
                className={`py-2.5 rounded-lg text-xs font-bold transition-all ${
                  activeChapter === ch
                    ? "bg-accent/20 text-accent border border-accent/30 shadow-lg shadow-accent/10"
                    : "hover:bg-surface-hover text-foreground/60 hover:text-foreground"
                }`}
              >
                {ch}
              </button>
            ))}
            {chapterCount === 0 && (
              <div className="col-span-6 py-8 text-center text-xs text-foreground/30 italic">
                Nenhum capítulo disponível.
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
