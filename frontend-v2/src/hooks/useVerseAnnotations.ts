"use client";

import { useState, useEffect, useCallback } from "react";

export type HighlightColor = "yellow" | "green" | "blue" | "purple" | "red";

export interface VerseAnnotation {
  reference: string;
  bookName: string;
  bookId: number;
  chapter: number;
  verse: number;
  note: string;
  updatedAt: string;
}

export const THEOLOGICAL_COLORS: Record<
  HighlightColor,
  { label: string; bg: string; text: string; border: string; mark: string }
> = {
  yellow: {
    label: "Doutrina & Ensino Geral",
    bg: "bg-amber-400/20 dark:bg-amber-400/15",
    text: "text-amber-900 dark:text-amber-200",
    border: "border-amber-400/40",
    mark: "bg-amber-300/40 dark:bg-amber-500/20 text-inherit",
  },
  green: {
    label: "Graça & Salvação",
    bg: "bg-emerald-400/20 dark:bg-emerald-400/15",
    text: "text-emerald-900 dark:text-emerald-200",
    border: "border-emerald-400/40",
    mark: "bg-emerald-300/40 dark:bg-emerald-500/20 text-inherit",
  },
  blue: {
    label: "Aliança & Promessas",
    bg: "bg-sky-400/20 dark:bg-sky-400/15",
    text: "text-sky-900 dark:text-sky-200",
    border: "border-sky-400/40",
    mark: "bg-sky-300/40 dark:bg-sky-500/20 text-inherit",
  },
  purple: {
    label: "Soberania & Reino de Deus",
    bg: "bg-purple-400/20 dark:bg-purple-400/15",
    text: "text-purple-900 dark:text-purple-200",
    border: "border-purple-400/40",
    mark: "bg-purple-300/40 dark:bg-purple-500/20 text-inherit",
  },
  red: {
    label: "Mandamentos & Alertas",
    bg: "bg-rose-400/20 dark:bg-rose-400/15",
    text: "text-rose-900 dark:text-rose-200",
    border: "border-rose-400/40",
    mark: "bg-rose-300/40 dark:bg-rose-500/20 text-inherit",
  },
};

export function useVerseAnnotations(bookId: number, chapter: number) {
  const [highlights, setHighlights] = useState<Record<number, HighlightColor>>(
    {},
  );
  const [notes, setNotes] = useState<Record<number, string>>({});

  const highlightsKey = `theosphere_highlights_${bookId}_${chapter}`;
  const notesPrefix = `theosphere_note_${bookId}_${chapter}_`;

  // Carrega do localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const rawH = localStorage.getItem(highlightsKey);
        if (rawH) {
          setHighlights(JSON.parse(rawH));
        } else {
          setHighlights({});
        }

        // Carrega notas deste capítulo
        const currentNotes: Record<number, string> = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(notesPrefix)) {
            const vNum = parseInt(key.replace(notesPrefix, ""), 10);
            if (!isNaN(vNum)) {
              const val = localStorage.getItem(key);
              if (val) currentNotes[vNum] = val;
            }
          }
        }
        setNotes(currentNotes);
      } catch {
        // Ignora erro de storage
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [bookId, chapter, highlightsKey, notesPrefix]);

  const setVerseHighlight = useCallback(
    (verses: number[], color: HighlightColor | null) => {
      setHighlights((prev) => {
        const next = { ...prev };
        for (const v of verses) {
          if (color) {
            next[v] = color;
          } else {
            delete next[v];
          }
        }
        try {
          localStorage.setItem(highlightsKey, JSON.stringify(next));
        } catch {
          // Ignora
        }
        return next;
      });
    },
    [highlightsKey],
  );

  const saveVerseNote = useCallback(
    (verse: number, text: string) => {
      const key = `${notesPrefix}${verse}`;
      setNotes((prev) => {
        const next = { ...prev };
        if (text.trim()) {
          next[verse] = text.trim();
          try {
            localStorage.setItem(key, text.trim());
          } catch {
            // Ignora
          }
        } else {
          delete next[verse];
          try {
            localStorage.removeItem(key);
          } catch {
            // Ignora
          }
        }
        return next;
      });
    },
    [notesPrefix],
  );

  return {
    highlights,
    notes,
    setVerseHighlight,
    saveVerseNote,
  };
}
