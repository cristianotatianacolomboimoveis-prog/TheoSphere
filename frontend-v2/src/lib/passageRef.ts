/**
 * passageRef.ts — Parser estrutural de referências bíblicas + matcher de sobreposição.
 *
 * Por que existe:
 *   O Guia de Passagem (e futuros módulos) precisa comparar referências vindas
 *   de fontes heterogêneas: input do usuário em PT ("João 3:16"), datasets em
 *   EN ("John 3:16", "Psalm 33:6") e faixas compostas ("Gênesis 1:1 - 2:3",
 *   "Êxodo 12-14", "Gênesis 12:1-3; 15:6"). Comparação por string (includes/
 *   igualdade) é frágil e silenciosamente errada. Aqui a comparação é
 *   estrutural: livro + intervalo de capítulos + intervalo de versículos.
 */

import { BIBLE_BOOK_TO_ID } from "./bibleUtils";

export interface PassageSegment {
  bookId: number;
  chapterStart: number;
  chapterEnd: number;
  /** null = capítulo inteiro */
  verseStart: number | null;
  verseEnd: number | null;
}

/** Nome canônico em inglês por bookId (usado para exibição/compatibilidade). */
export const BOOK_ID_TO_ENGLISH: Record<number, string> = {
  1: "Genesis",
  2: "Exodus",
  3: "Leviticus",
  4: "Numbers",
  5: "Deuteronomy",
  6: "Joshua",
  7: "Judges",
  8: "Ruth",
  9: "1 Samuel",
  10: "2 Samuel",
  11: "1 Kings",
  12: "2 Kings",
  13: "1 Chronicles",
  14: "2 Chronicles",
  15: "Ezra",
  16: "Nehemiah",
  17: "Esther",
  18: "Job",
  19: "Psalms",
  20: "Proverbs",
  21: "Ecclesiastes",
  22: "Song of Solomon",
  23: "Isaiah",
  24: "Jeremiah",
  25: "Lamentations",
  26: "Ezekiel",
  27: "Daniel",
  28: "Hosea",
  29: "Joel",
  30: "Amos",
  31: "Obadiah",
  32: "Jonah",
  33: "Micah",
  34: "Nahum",
  35: "Habakkuk",
  36: "Zephaniah",
  37: "Haggai",
  38: "Zechariah",
  39: "Malachi",
  40: "Matthew",
  41: "Mark",
  42: "Luke",
  43: "John",
  44: "Acts",
  45: "Romans",
  46: "1 Corinthians",
  47: "2 Corinthians",
  48: "Galatians",
  49: "Ephesians",
  50: "Philippians",
  51: "Colossians",
  52: "1 Thessalonians",
  53: "2 Thessalonians",
  54: "1 Timothy",
  55: "2 Timothy",
  56: "Titus",
  57: "Philemon",
  58: "Hebrews",
  59: "James",
  60: "1 Peter",
  61: "2 Peter",
  62: "1 John",
  63: "2 John",
  64: "3 John",
  65: "Jude",
  66: "Revelation",
};

/** Apelidos comuns não cobertos por BIBLE_BOOK_TO_ID (já normalizados). */
const BOOK_ALIASES: Record<string, number> = {
  psalm: 19,
  salmo: 19,
  "song of songs": 22,
  canticles: 22,
  cantares: 22,
  canticos: 22,
  "cantico dos canticos": 22,
  revelations: 66,
};

/** Remove acentos, baixa caixa e colapsa espaços — chave de lookup estável. */
function normalizeBookKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Lookup normalizado construído uma única vez (PT + EN + apelidos). */
const BOOK_LOOKUP: Record<string, number> = (() => {
  const map: Record<string, number> = {};
  for (const [name, id] of Object.entries(BIBLE_BOOK_TO_ID)) {
    map[normalizeBookKey(name)] = id;
  }
  for (const [alias, id] of Object.entries(BOOK_ALIASES)) {
    map[alias] = id;
  }
  return map;
})();

/** Resolve o nome de um livro (PT/EN, com ou sem acento) para bookId. */
export function resolveBookId(name: string): number | null {
  return BOOK_LOOKUP[normalizeBookKey(name)] ?? null;
}

/**
 * Parte numérica de um segmento. Formatos aceitos:
 *   "3"        → capítulo 3 inteiro
 *   "12-14"    → capítulos 12 a 14
 *   "3:16"     → capítulo 3, versículo 16
 *   "3:16-18"  → capítulo 3, versículos 16 a 18
 *   "1:1-2:3"  → do cap. 1 v.1 ao cap. 2 v.3 (tratado como caps. 1–2)
 */
const NUMERIC_RE =
  /^(\d+)(?::(\d+))?(?:\s*[-–—]\s*(\d+)(?::(\d+))?)?$/;

function parseNumericPart(bookId: number, part: string): PassageSegment | null {
  const m = NUMERIC_RE.exec(part.trim());
  if (!m) return null;

  const c1 = parseInt(m[1], 10);
  const v1 = m[2] ? parseInt(m[2], 10) : null;
  const n2 = m[3] ? parseInt(m[3], 10) : null;
  const v2 = m[4] ? parseInt(m[4], 10) : null;

  if (n2 === null) {
    // "3" ou "3:16"
    return {
      bookId,
      chapterStart: c1,
      chapterEnd: c1,
      verseStart: v1,
      verseEnd: v1,
    };
  }

  if (v2 !== null) {
    // "1:1-2:3" — faixa entre capítulos; granularidade de capítulo é suficiente
    return {
      bookId,
      chapterStart: c1,
      chapterEnd: n2,
      verseStart: c1 === n2 ? v1 : null,
      verseEnd: c1 === n2 ? v2 : null,
    };
  }

  if (v1 !== null) {
    // "3:16-18" — faixa de versículos no mesmo capítulo
    return {
      bookId,
      chapterStart: c1,
      chapterEnd: c1,
      verseStart: v1,
      verseEnd: n2,
    };
  }

  // "12-14" — faixa de capítulos
  return {
    bookId,
    chapterStart: c1,
    chapterEnd: n2,
    verseStart: null,
    verseEnd: null,
  };
}

/** Segmento único: "João 3:16-18". Book pode começar com dígito ("1 João"). */
const SEGMENT_RE = /^(.+?)\s+(\d+(?::\d+)?(?:\s*[-–—]\s*\d+(?::\d+)?)?)$/;

// Cache de parsing — datasets são estáticos, referências se repetem muito.
const parseCache = new Map<string, PassageSegment[]>();

/**
 * Converte uma referência livre em segmentos estruturais.
 * Suporta múltiplos segmentos separados por ";" ("Gênesis 12:1-3; 15:6" —
 * segmentos sem livro herdam o livro anterior). Retorna [] se nada for
 * reconhecido (nunca lança — chamadores tratam [] como "sem referência").
 */
export function parsePassage(raw: string): PassageSegment[] {
  if (!raw) return [];
  const cached = parseCache.get(raw);
  if (cached) return cached;

  const segments: PassageSegment[] = [];
  let lastBookId: number | null = null;

  for (const piece of raw.split(";")) {
    const trimmed = piece.trim();
    if (!trimmed) continue;

    const m = SEGMENT_RE.exec(trimmed);
    if (m) {
      const bookId = resolveBookId(m[1]);
      if (bookId) {
        const seg = parseNumericPart(bookId, m[2]);
        if (seg) {
          segments.push(seg);
          lastBookId = bookId;
          continue;
        }
      }
    }

    // "15:6" ou "15" — sem livro, herda o anterior
    if (lastBookId) {
      const seg = parseNumericPart(lastBookId, trimmed);
      if (seg) segments.push(seg);
    }
  }

  parseCache.set(raw, segments);
  return segments;
}

/** true se dois segmentos se sobrepõem (mesmo livro + interseção de faixas). */
function segmentsOverlap(a: PassageSegment, b: PassageSegment): boolean {
  if (a.bookId !== b.bookId) return false;
  if (a.chapterEnd < b.chapterStart || b.chapterEnd < a.chapterStart) {
    return false;
  }

  // Interseção de capítulos existe. Só refinamos por versículo quando ambos
  // estão restritos a um único capítulo em comum — caso contrário, a
  // sobreposição de capítulo já é suficiente.
  const singleChapterA = a.chapterStart === a.chapterEnd;
  const singleChapterB = b.chapterStart === b.chapterEnd;
  if (
    singleChapterA &&
    singleChapterB &&
    a.verseStart !== null &&
    b.verseStart !== null
  ) {
    const aEnd = a.verseEnd ?? a.verseStart;
    const bEnd = b.verseEnd ?? b.verseStart;
    return !(aEnd < b.verseStart || bEnd < a.verseStart);
  }
  return true;
}

/** true se qualquer segmento de `a` sobrepõe qualquer segmento de `b`. */
export function passagesOverlap(
  a: PassageSegment[],
  b: PassageSegment[],
): boolean {
  return a.some((sa) => b.some((sb) => segmentsOverlap(sa, sb)));
}

/** Sobreposição direta entre duas referências em texto livre. */
export function refsOverlap(refA: string, refB: string): boolean {
  return passagesOverlap(parsePassage(refA), parsePassage(refB));
}

/** Exibição canônica em inglês ("John 3:16-18") — compatível com datasets. */
export function formatEnglishRef(seg: PassageSegment): string {
  const book = BOOK_ID_TO_ENGLISH[seg.bookId];
  if (!book) return "";
  let out = `${book} ${seg.chapterStart}`;
  if (seg.chapterEnd !== seg.chapterStart) {
    out += `-${seg.chapterEnd}`;
  } else if (seg.verseStart !== null) {
    out += `:${seg.verseStart}`;
    if (seg.verseEnd !== null && seg.verseEnd !== seg.verseStart) {
      out += `-${seg.verseEnd}`;
    }
  }
  return out;
}
