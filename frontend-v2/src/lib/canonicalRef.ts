/**
 * canonicalRef.ts — Utilitário de Referências Numéricas Canônicas (Frontend)
 * Formato BBCCCVVV
 */

import { BIBLE_BOOK_TO_ID } from "./bibleUtils";

export function toCanonicalRef(
  bookId: number,
  chapter: number,
  verse: number,
): number {
  return bookId * 1_000_000 + chapter * 1_000 + verse;
}

export function fromCanonicalRef(ref: number): {
  bookId: number;
  chapter: number;
  verse: number;
} {
  const bookId = Math.floor(ref / 1_000_000);
  const chapter = Math.floor((ref % 1_000_000) / 1_000);
  const verse = ref % 1_000;
  return { bookId, chapter, verse };
}

export function parseRefToCanonical(refStr: string): number | null {
  if (!refStr || typeof refStr !== "string") return null;
  const match = refStr
    .trim()
    .match(/^(\d?\s*[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s.]*?)\s+(\d+)[:.](\d+)$/);
  if (!match) return null;

  const rawBook = match[1].trim();
  const chapter = parseInt(match[2], 10);
  const verse = parseInt(match[3], 10);

  let bookId = BIBLE_BOOK_TO_ID[rawBook];
  if (!bookId) {
    const lower = rawBook.toLowerCase();
    for (const [k, v] of Object.entries(BIBLE_BOOK_TO_ID)) {
      if (k.toLowerCase() === lower) {
        bookId = v;
        break;
      }
    }
  }
  if (!bookId || isNaN(chapter) || isNaN(verse)) {
    return null;
  }

  return toCanonicalRef(bookId, chapter, verse);
}

export function getChapterRange(
  bookId: number,
  chapter: number,
): { startRef: number; endRef: number } {
  return {
    startRef: toCanonicalRef(bookId, chapter, 1),
    endRef: toCanonicalRef(bookId, chapter, 999),
  };
}

export function isRefInRange(
  ref: number,
  startRef: number,
  endRef: number,
): boolean {
  return ref >= startRef && ref <= endRef;
}
