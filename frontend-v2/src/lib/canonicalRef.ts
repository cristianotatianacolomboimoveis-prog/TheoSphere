/**
 * canonicalRef.ts — Utilitário de Referências Numéricas Canônicas (T0.4 / T1.3)
 * Formato BBCCCVVV
 */

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

