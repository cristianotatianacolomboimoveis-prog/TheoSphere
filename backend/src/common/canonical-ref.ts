/**
 * canonical-ref.ts — Utilitário de Referências Numéricas Canônicas (T0.4 / T1.3)
 * Formato padrão: BBCCCVVV (inteiro de até 8 dígitos)
 * BB = Livro (1 a 66)
 * CCC = Capítulo (1 a 150)
 * VVV = Versículo (1 a 176)
 */

import {
  BOOK_NAME_TO_ID,
  BOOK_ID_TO_NAME_PT,
  BOOK_ID_TO_NAME_EN,
  resolveBookId,
} from './book-map';

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
  if (bookId < 1 || bookId > 82) {
    throw new Error(`bookId fora do cânon: ${bookId}`);
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

/**
 * Converte qualquer string de referência ("John 3:16", "João 3:16", "Gn 1:1") para BBCCCVVV.
 */
export function parseRefToCanonical(refStr: string): number | null {
  if (!refStr || typeof refStr !== 'string') return null;
  const trimmed = refStr.trim();

  // Expressão regular para capturar "Livro Capítulo:Versículo" ou "Livro Capítulo.Versículo"
  const match = trimmed.match(
    /^(\d?\s*[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s.]*?)\s+(\d+)[:.](\d+)$/,
  );
  if (!match) return null;

  const rawBook = match[1]
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\./g, '')
    .trim();
  const chapter = parseInt(match[2], 10);
  const verse = parseInt(match[3], 10);

  const bookId = BOOK_NAME_TO_ID[rawBook] || resolveBookId(rawBook);
  if (!bookId || isNaN(chapter) || isNaN(verse)) {
    return null;
  }

  return toCanonicalRef(bookId, chapter, verse);
}

/**
 * Formata um inteiro BBCCCVVV para uma string legível.
 */
export function formatCanonicalRef(
  refNum: number,
  lang: 'pt' | 'en' = 'pt',
): string {
  const { bookId, chapter, verse } = fromCanonicalRef(refNum);
  const name =
    lang === 'pt'
      ? BOOK_ID_TO_NAME_PT[bookId] || `Livro ${bookId}`
      : BOOK_ID_TO_NAME_EN[bookId] || `Book ${bookId}`;
  return `${name} ${chapter}:${verse}`;
}

/**
 * Retorna o intervalo numérico canônico para um capítulo inteiro.
 */
export function getChapterRange(
  bookId: number,
  chapter: number,
): { startRef: number; endRef: number } {
  return {
    startRef: toCanonicalRef(bookId, chapter, 1),
    endRef: toCanonicalRef(bookId, chapter, 999),
  };
}

/**
 * Retorna o intervalo numérico canônico para um livro inteiro.
 */
export function getBookRange(bookId: number): {
  startRef: number;
  endRef: number;
} {
  return {
    startRef: toCanonicalRef(bookId, 1, 1),
    endRef: toCanonicalRef(bookId, 999, 999),
  };
}

/**
 * Valida se uma referência está dentro de um intervalo [startRef, endRef].
 */
export function isRefInRange(
  ref: number,
  startRef: number,
  endRef: number,
): boolean {
  return ref >= startRef && ref <= endRef;
}
