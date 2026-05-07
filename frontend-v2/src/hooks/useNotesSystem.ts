"use client";

import { useState, useEffect, useCallback } from "react";

/* ─── Types ──────────────────────────────────────────────── */

export type HighlightColor = "yellow" | "green" | "blue" | "purple" | "pink";

export interface Highlight {
  id: string;
  reference: string;
  verseNumber: number;
  text: string;
  color: HighlightColor;
  timestamp: number;
}

export interface Note {
  id: string;
  reference: string;
  content: string;
  tags: string[];
  notebookId: string | null;
  timestamp: number;
  updatedAt: number;
}

export interface Notebook {
  id: string;
  name: string;
  description: string;
  color: HighlightColor;
  createdAt: number;
}

export interface Bookmark {
  id: string;
  reference: string;
  label: string;
  timestamp: number;
}

export interface Sermon {
  id: string;
  title: string;
  passage: string;
  date: string;
  points: SermonPoint[];
  notes: string;
  createdAt: number;
  updatedAt: number;
}

export interface SermonPoint {
  id: string;
  title: string;
  content: string;
  verses: string[];
  order: number;
  mapContext?: {
    year: number;
    ref: string | null;
  };
}

export interface StudyPlan {
  id: string;
  title: string;
  passage: string;
  questions: string[];
  leaderNotes: string;
  additionalRefs: string[];
  createdAt: number;
}

/* ─── Storage Keys ───────────────────────────────────────── */

const KEYS = {
  highlights: "theosphere-highlights",
  notes: "theosphere-notes",
  notebooks: "theosphere-notebooks",
  bookmarks: "theosphere-bookmarks",
  sermons: "theosphere-sermons",
  studies: "theosphere-studies",
};

/* ─── Helper ─────────────────────────────────────────────── */

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch { /* quota exceeded */ }
}

/* ─── Hook ───────────────────────────────────────────────── */

export function useNotesSystem() {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [studies, setStudies] = useState<StudyPlan[]>([]);

  // Load on mount
  useEffect(() => {
    setHighlights(loadFromStorage(KEYS.highlights, []));
    setNotes(loadFromStorage(KEYS.notes, []));
    setNotebooks(loadFromStorage(KEYS.notebooks, []));
    setBookmarks(loadFromStorage(KEYS.bookmarks, []));
    setSermons(loadFromStorage(KEYS.sermons, []));
    setStudies(loadFromStorage(KEYS.studies, []));
  }, []);

  /* ── Highlights ───────────────────────────────────────── */

  const addHighlight = useCallback((reference: string, verseNumber: number, text: string, color: HighlightColor) => {
    setHighlights(prev => {
      const updated = [...prev, { id: genId(), reference, verseNumber, text, color, timestamp: Date.now() }];
      saveToStorage(KEYS.highlights, updated);
      return updated;
    });
  }, []);

  const removeHighlight = useCallback((id: string) => {
    setHighlights(prev => {
      const updated = prev.filter(h => h.id !== id);
      saveToStorage(KEYS.highlights, updated);
      return updated;
    });
  }, []);

  const getHighlightsForRef = useCallback((reference: string) => {
    return highlights.filter(h => h.reference === reference);
  }, [highlights]);

  /* ── Notes ────────────────────────────────────────────── */

  const addNote = useCallback((reference: string, content: string, tags: string[] = [], notebookId: string | null = null) => {
    setNotes(prev => {
      const now = Date.now();
      const updated = [...prev, { id: genId(), reference, content, tags, notebookId, timestamp: now, updatedAt: now }];
      saveToStorage(KEYS.notes, updated);
      return updated;
    });
  }, []);

  const updateNote = useCallback((id: string, content: string) => {
    setNotes(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, content, updatedAt: Date.now() } : n);
      saveToStorage(KEYS.notes, updated);
      return updated;
    });
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes(prev => {
      const updated = prev.filter(n => n.id !== id);
      saveToStorage(KEYS.notes, updated);
      return updated;
    });
  }, []);

  const getNotesForRef = useCallback((reference: string) => {
    return notes.filter(n => n.reference === reference);
  }, [notes]);

  /* ── Notebooks ────────────────────────────────────────── */

  const addNotebook = useCallback((name: string, description: string = "", color: HighlightColor = "yellow") => {
    setNotebooks(prev => {
      const updated = [...prev, { id: genId(), name, description, color, createdAt: Date.now() }];
      saveToStorage(KEYS.notebooks, updated);
      return updated;
    });
  }, []);

  const deleteNotebook = useCallback((id: string) => {
    setNotebooks(prev => {
      const updated = prev.filter(nb => nb.id !== id);
      saveToStorage(KEYS.notebooks, updated);
      return updated;
    });
  }, []);

  /* ── Bookmarks ────────────────────────────────────────── */

  const addBookmark = useCallback((reference: string, label: string = "") => {
    setBookmarks(prev => {
      const exists = prev.some(b => b.reference === reference);
      if (exists) return prev;
      const updated = [...prev, { id: genId(), reference, label, timestamp: Date.now() }];
      saveToStorage(KEYS.bookmarks, updated);
      return updated;
    });
  }, []);

  const removeBookmark = useCallback((reference: string) => {
    setBookmarks(prev => {
      const updated = prev.filter(b => b.reference !== reference);
      saveToStorage(KEYS.bookmarks, updated);
      return updated;
    });
  }, []);

  const isBookmarked = useCallback((reference: string) => {
    return bookmarks.some(b => b.reference === reference);
  }, [bookmarks]);

  /* ── Sermons ──────────────────────────────────────────── */

  const addSermon = useCallback((title: string, passage: string) => {
    const now = Date.now();
    const sermon: Sermon = {
      id: genId(), title, passage, date: new Date().toISOString().split("T")[0],
      points: [], notes: "", createdAt: now, updatedAt: now,
    };
    setSermons(prev => {
      const updated = [...prev, sermon];
      saveToStorage(KEYS.sermons, updated);
      return updated;
    });
    return sermon;
  }, []);

  const updateSermon = useCallback((id: string, updates: Partial<Sermon>) => {
    setSermons(prev => {
      const updated = prev.map(s => s.id === id ? { ...s, ...updates, updatedAt: Date.now() } : s);
      saveToStorage(KEYS.sermons, updated);
      return updated;
    });
  }, []);

  const deleteSermon = useCallback((id: string) => {
    setSermons(prev => {
      const updated = prev.filter(s => s.id !== id);
      saveToStorage(KEYS.sermons, updated);
      return updated;
    });
  }, []);

  /* ── Studies ──────────────────────────────────────────── */

  const addStudy = useCallback((title: string, passage: string) => {
    const study: StudyPlan = {
      id: genId(), title, passage, questions: [], leaderNotes: "", additionalRefs: [], createdAt: Date.now(),
    };
    setStudies(prev => {
      const updated = [...prev, study];
      saveToStorage(KEYS.studies, updated);
      return updated;
    });
    return study;
  }, []);

  const updateStudy = useCallback((id: string, updates: Partial<StudyPlan>) => {
    setStudies(prev => {
      const updated = prev.map(s => s.id === id ? { ...s, ...updates } : s);
      saveToStorage(KEYS.studies, updated);
      return updated;
    });
  }, []);

  const deleteStudy = useCallback((id: string) => {
    setStudies(prev => {
      const updated = prev.filter(s => s.id !== id);
      saveToStorage(KEYS.studies, updated);
      return updated;
    });
  }, []);

  return {
    // Highlights
    highlights, addHighlight, removeHighlight, getHighlightsForRef,
    // Notes
    notes, addNote, updateNote, deleteNote, getNotesForRef,
    // Notebooks
    notebooks, addNotebook, deleteNotebook,
    // Bookmarks
    bookmarks, addBookmark, removeBookmark, isBookmarked,
    // Sermons
    sermons, addSermon, updateSermon, deleteSermon,
    // Studies
    studies, addStudy, updateStudy, deleteStudy,
  };
}

export const HIGHLIGHT_COLORS: { id: HighlightColor; label: string; bg: string; text: string; border: string }[] = [
  { id: "yellow", label: "Amarelo", bg: "rgba(250, 204, 21, 0.15)", text: "#facc15", border: "rgba(250, 204, 21, 0.3)" },
  { id: "green", label: "Verde", bg: "rgba(34, 197, 94, 0.15)", text: "#22c55e", border: "rgba(34, 197, 94, 0.3)" },
  { id: "blue", label: "Azul", bg: "rgba(59, 130, 246, 0.15)", text: "#3b82f6", border: "rgba(59, 130, 246, 0.3)" },
  { id: "purple", label: "Roxo", bg: "rgba(168, 85, 247, 0.15)", text: "#a855f7", border: "rgba(168, 85, 247, 0.3)" },
  { id: "pink", label: "Rosa", bg: "rgba(236, 72, 153, 0.15)", text: "#ec4899", border: "rgba(236, 72, 153, 0.3)" },
];
