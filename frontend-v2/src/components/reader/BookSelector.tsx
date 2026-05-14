"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheoStore, type BibleBook } from "@/store/useTheoStore";

interface BookSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (book: BibleBook) => void;
}

export const BookSelector: React.FC<BookSelectorProps> = ({ isOpen, onClose, onSelect }) => {
  const { books, activeBook } = useTheoStore();

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
            Selecione o Livro
          </p>
          <div className="grid grid-cols-2 gap-1">
            {books.length > 0 ? (
              books.map(book => (
                <button 
                  key={book.id} 
                  onClick={() => { onSelect(book); onClose(); }} 
                  className={`text-left px-3 py-2 rounded-lg text-xs transition-all ${
                    activeBook === book.namePt || activeBook === book.nameEn 
                      ? "bg-accent/15 text-accent font-bold" 
                      : "hover:bg-surface-hover text-foreground/60"
                  }`}
                >
                  {book.namePt}
                </button>
              ))
            ) : (
              <div className="col-span-2 py-8 text-center text-xs text-foreground/30 italic">
                Carregando livros...
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
