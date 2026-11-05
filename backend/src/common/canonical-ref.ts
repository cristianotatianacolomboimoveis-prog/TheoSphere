/**
 * canonical-ref.ts — Utilitário de Referências Numéricas Canônicas (T0.4 / T1.3)
 * Formato padrão: BBCCCVVV (inteiro de até 8 dígitos)
 * BB = Livro (1 a 66)
 * CCC = Capítulo (1 a 150)
 * VVV = Versículo (1 a 176)
 */

export function toCanonicalRef(
  bookId: number,
  chapter: number,
  verse: number,
): number {
  if (
    !Number.isInteger(bookId) ||
    !Number.isInteger(chapter) ||
    !Number.isInteger(verse)
  ) {
    throw new Error('Componentes de referência devem ser inteiros válidos.');
  }
  return bookId * 1_000_000 + chapter * 1_000 + verse;
}

export function fromCanonicalRef(ref: number): {
  bookId: number;
  chapter: number;
  verse: number;
} {
  if (!Number.isInteger(ref) || ref <= 0) {
    throw new Error(`Referência canônica inválida: ${ref}`);
  }
  const bookId = Math.floor(ref / 1_000_000);
  const chapter = Math.floor((ref % 1_000_000) / 1_000);
  const verse = ref % 1_000;
  return { bookId, chapter, verse };
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
