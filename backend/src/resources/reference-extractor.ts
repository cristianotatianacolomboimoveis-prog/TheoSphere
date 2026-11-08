import { BOOK_NAME_TO_ID, resolveBookId } from '../common/book-map';
import { getChapterRange, toCanonicalRef } from '../common/canonical-ref';

export type AmbiguousBookAbbrev =
  | 'is'
  | 'at'
  | 'am'
  | 'ex'
  | 'ne'
  | 'os'
  | 'ed'
  | 'et'
  | 'na'
  | 'ag'
  | 'cl';

export const AMBIGUOUS_SHORT_ABBREVS = new Set<AmbiguousBookAbbrev>([
  'is',
  'at',
  'am',
  'ex',
  'ne',
  'os',
  'ed',
  'et',
  'na',
  'ag',
  'cl',
]);

export interface ExtractedReference {
  canonicalRef: number;
  startRef: number;
  endRef: number;
  kind: 'heading' | 'inline';
  confidence: number;
  raw: string;
}

export interface HeadingContext {
  bookId?: number;
  chapter?: number;
  startRef?: number;
  endRef?: number;
}

export interface StructuralChunk {
  chunkIndex: number;
  text: string;
  startRef?: number;
  endRef?: number;
  references: ExtractedReference[];
}

/**
 * Número máximo de capítulos por livro canônico (1..66) e deuterocanônicos (67..75).
 */
export const MAX_CHAPTERS_BY_BOOK: Record<number, number> = {
  1: 50,
  2: 40,
  3: 27,
  4: 36,
  5: 34,
  6: 24,
  7: 21,
  8: 4,
  9: 31,
  10: 24,
  11: 22,
  12: 25,
  13: 29,
  14: 36,
  15: 10,
  16: 13,
  17: 10,
  18: 42,
  19: 150,
  20: 31,
  21: 12,
  22: 8,
  23: 66,
  24: 52,
  25: 5,
  26: 48,
  27: 12,
  28: 14,
  29: 3,
  30: 9,
  31: 1,
  32: 4,
  33: 7,
  34: 3,
  35: 3,
  36: 3,
  37: 2,
  38: 14,
  39: 4,
  40: 28,
  41: 16,
  42: 24,
  43: 21,
  44: 28,
  45: 16,
  46: 16,
  47: 13,
  48: 6,
  49: 6,
  50: 4,
  51: 4,
  52: 5,
  53: 3,
  54: 6,
  55: 4,
  56: 3,
  57: 1,
  58: 13,
  59: 5,
  60: 5,
  61: 3,
  62: 5,
  63: 1,
  64: 1,
  65: 1,
  66: 22,
  67: 14,
  68: 16,
  69: 19,
  70: 51,
  71: 5,
  72: 1,
  73: 16,
  74: 15,
  75: 7,
};

const STRICT_ROMAN_REGEX = /^c?l?(?:x{0,3}|xl|xc)(?:v?i{0,3}|iv|ix)$/i;

/**
 * Converte numeral romano (I..CL / 1..150) para inteiro.
 */
export function parseRomanNumeral(raw: string): number | null {
  if (!raw) return null;
  const clean = raw.trim().toLowerCase();
  if (!clean || !STRICT_ROMAN_REGEX.test(clean)) return null;

  const map: Record<string, number> = {
    i: 1,
    v: 5,
    x: 10,
    l: 50,
    c: 100,
  };
  let total = 0;
  for (let i = 0; i < clean.length; i++) {
    const curr = map[clean[i]];
    const next = i + 1 < clean.length ? map[clean[i + 1]] : 0;
    if (!curr) return null;
    if (curr < next) {
      total -= curr;
    } else {
      total += curr;
    }
  }
  return total >= 1 && total <= 150 ? total : null;
}

export function parseChapterNumber(raw: string): number | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/\.$/, '');
  if (/^\d{1,3}$/.test(trimmed)) {
    const n = parseInt(trimmed, 10);
    return n >= 1 && n <= 150 ? n : null;
  }
  return parseRomanNumeral(trimmed);
}

export function isValidBookChapterVerse(
  bookId: number,
  chapter: number,
  verse: number,
): boolean {
  const maxChap = MAX_CHAPTERS_BY_BOOK[bookId] ?? 150;
  if (chapter < 1 || chapter > maxChap) return false;
  if (verse < 1 || verse > 176) return false;
  return true;
}

/**
 * Infere o bookId padrão quando a obra inteira é um comentário de um único livro bíblico.
 */
export function inferBookIdFromWorkTitle(title: string): number | undefined {
  if (!title) return undefined;
  const t = title.toLowerCase();
  if (t.includes('whole bible')) return undefined;
  if (t.includes('harmony of')) return undefined;
  if (t.includes('minor prophets')) return undefined;
  if (t.includes('catholic epistles')) return undefined;
  if (t.includes('galatians and ephesians')) return undefined;
  if (t.includes('philippians, colossians')) return undefined;
  if (t.includes('timothy, titus')) return undefined;
  if (t.includes('jeremiah and lamentations')) return 24;
  if (t.includes('epistles of paul to the corinthians')) return 46;

  const patterns: Array<[RegExp, number]> = [
    [/\bgenesis\b/, 1],
    [/\bjoshua\b/, 6],
    [/\bpsalms?\b/, 19],
    [/\bisaiah\b/, 23],
    [/\bezekiel\b/, 26],
    [/\bdaniel\b/, 27],
    [/\bgospel (?:according to|of) (?:st\.?\s*)?john\b/, 43],
    [/\bacts of the apostles\b/, 44],
    [/\bromans\b/, 45],
    [/\b1 corinthians\b/, 46],
    [/\b2 corinthians\b/, 47],
    [/\bgalatians\b/, 48],
    [/\bhebrews\b/, 58],
  ];

  for (const [regex, id] of patterns) {
    if (regex.test(t)) return id;
  }
  return undefined;
}

/**
 * Verifica se o token de livro capturado é válido e não cai nas armadilhas de palavras comuns
 * ("at 5:30", "is 3:16", "am 2:4", "jn_nt", etc.).
 */
function resolveSafeInlineBookId(
  rawBookToken: string,
  hasTrailingDot: boolean,
  precedingChar: string,
): number | null {
  const trimmed = rawBookToken.trim();
  if (!trimmed) return null;
  if (trimmed.toLowerCase() === 'jn_nt') return null;

  // Regra 1: O primeiro caractere alfabético do nome/abreviação do livro DEVE ser maiúsculo.
  // Isso bloqueia imediatamente "at 5:30", "is 3:16", "am 2:4", "ex 1:2", "os 2:1", "na 1:1", etc.
  const firstAlphaMatch = trimmed.match(/[A-Za-zÀ-ÿ]/);
  if (!firstAlphaMatch) return null;
  const firstAlpha = firstAlphaMatch[0];
  if (firstAlpha !== firstAlpha.toUpperCase()) {
    return null;
  }

  // Se houver prefixo romano (I, II, III), o segundo token alfabético também deve iniciar com maiúscula
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2 && /^(?:[1-3]|I{1,3})\.?$/i.test(parts[0])) {
    const secondAlpha = parts[1].match(/[A-Za-zÀ-ÿ]/)?.[0];
    if (!secondAlpha || secondAlpha !== secondAlpha.toUpperCase()) {
      return null;
    }
  }

  const normalized = trimmed
    .toLowerCase()
    .replace(/\./g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Bloqueia palavras latinas/escolásticas comuns na Summa Theologica e patrística
  if (
    normalized === 'obj' ||
    normalized === 'art' ||
    normalized === 'ad' ||
    normalized === 'bk' ||
    normalized === 'vol' ||
    normalized === 'ch' ||
    normalized === 'chap' ||
    normalized === 'ver' ||
    normalized === 'ib' ||
    normalized === 'ibid' ||
    normalized === 'pg' ||
    normalized === 'st'
  ) {
    return null;
  }

  // Regra 2: Para as 11 abreviações curtas ambíguas (is, at, am, ex, ne, os, ed, et, na, ag, cl),
  // mesmo com inicial maiúscula ("At 5:30", "Is 3:16", "Am 2:4" no início de frase),
  // exige ponto abreviativo ("Is. 53:5", "Ex. 20:1", "At. 2:38") OU parêntese/colchete/ponto-e-vírgula imediatamente anterior.
  if (AMBIGUOUS_SHORT_ABBREVS.has(normalized as AmbiguousBookAbbrev)) {
    const hasSafeDelimiter = /[([;«"“]/.test(precedingChar);
    if (!hasTrailingDot && !hasSafeDelimiter) {
      return null;
    }
  }

  return BOOK_NAME_TO_ID[normalized] ?? resolveBookId(normalized);
}

/**
 * Detecta cabeçalhos espaçados do Matthew Henry (ex.: "G E N E S I S", "J O H N.", "I. C O R I N T H I A N S").
 */
function extractSpacedBookHeadings(
  text: string,
): Array<{ index: number; bookId: number; chapter?: number }> {
  const results: Array<{ index: number; bookId: number; chapter?: number }> =
    [];
  const regex =
    /(?:_{5,}\s*)?(?:([I]{1,3}|[1-3])\.?\s+)?((?:[A-Z]\s+){2,}[A-Z])\.?\s+(?:CHAP\.|PSALM)\s+([IVXLCDM]+|\d+)\.?/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    const prefix = m[1] ? `${m[1].toLowerCase()} ` : '';
    let collapsedWord = m[2].replace(/\s+/g, '').toLowerCase();
    collapsedWord = collapsedWord
      .replace(/^first/, '1 ')
      .replace(/^second/, '2 ')
      .replace(/^third/, '3 ')
      .replace(/^songofsolomon$/, 'song of solomon')
      .replace(/^actsoftheapostles$/, 'acts');
    const bookKey = (prefix + collapsedWord).trim();
    const bookId = BOOK_NAME_TO_ID[bookKey] ?? resolveBookId(bookKey);
    const chapter = parseChapterNumber(m[3]);
    if (bookId && chapter && chapter <= (MAX_CHAPTERS_BY_BOOK[bookId] ?? 150)) {
      results.push({ index: m.index, bookId, chapter });
    }
  }
  return results;
}

/**
 * Extrai referências bíblicas estruturadas (PT + EN, arábicos e romanos, intervalos e cabeçalhos)
 * e atualiza o contexto corrente de cabeçalho (livro/capítulo/perícope).
 */
export function extractStructuredReferences(
  text: string,
  initialContext?: HeadingContext,
): { references: ExtractedReference[]; updatedContext: HeadingContext } {
  const ctx: HeadingContext = { ...initialContext };
  if (!text || typeof text !== 'string') {
    return { references: [], updatedContext: ctx };
  }

  const extracted: ExtractedReference[] = [];
  const seenKeys = new Set<string>();

  const pushRef = (
    bookId: number,
    chapter: number,
    startVerse: number,
    endVerse: number,
    kind: 'heading' | 'inline',
    confidence: number,
    raw: string,
  ) => {
    const safeEndVerse = Math.max(startVerse, endVerse);
    if (
      !isValidBookChapterVerse(bookId, chapter, startVerse) ||
      !isValidBookChapterVerse(bookId, chapter, safeEndVerse)
    ) {
      return;
    }
    const startRef = toCanonicalRef(bookId, chapter, startVerse);
    const endRef = toCanonicalRef(bookId, chapter, safeEndVerse);
    const canonicalRef = startRef;
    const rangeKey = `${startRef}-${endRef}`;
    if (seenKeys.has(rangeKey)) return;
    seenKeys.add(rangeKey);

    extracted.push({
      canonicalRef,
      startRef,
      endRef,
      kind,
      confidence,
      raw: raw.trim(),
    });
  };

  // 1. Cabeçalhos espaçados de Livro + Capítulo (ex: "J O H N. CHAP. III.")
  const spacedHeadings = extractSpacedBookHeadings(text);
  for (const sh of spacedHeadings) {
    ctx.bookId = sh.bookId;
    ctx.chapter = sh.chapter;
    const range = getChapterRange(sh.bookId, sh.chapter!);
    ctx.startRef = range.startRef;
    ctx.endRef = range.endRef;
  }

  // 2. Cabeçalhos explícitos de Capítulo ("CHAPTER 3", "CHAPTER III", "CHAP. III.", "CAPÍTULO 3", "PSALM 23", "SALMO 23")
  // quando já temos ctx.bookId (ou quando é PSALM/SALMO -> bookId 19).
  const chapterHeadingRegex =
    /(?:^|_{4,}|\n)\s*(?:(PSALM|SALMO)\s+([IVXLCDM]+|\d+)|(?:CHAPTER|CHAP\.|CAP[ÍI]TULO)\s+([IVXLCDM]+|\d+))\.?(?=\s|$)/gi;
  let chMatch: RegExpExecArray | null;
  while ((chMatch = chapterHeadingRegex.exec(text)) !== null) {
    const isPsalm = Boolean(chMatch[1]);
    const chapRaw = chMatch[2] || chMatch[3];
    const chapNum = parseChapterNumber(chapRaw);
    const targetBookId = isPsalm ? 19 : ctx.bookId;
    if (
      targetBookId &&
      chapNum &&
      chapNum <= (MAX_CHAPTERS_BY_BOOK[targetBookId] ?? 150)
    ) {
      ctx.bookId = targetBookId;
      ctx.chapter = chapNum;
      const range = getChapterRange(targetBookId, chapNum);
      ctx.startRef = range.startRef;
      ctx.endRef = range.endRef;
    }
  }

  // 3. Cabeçalhos de perícope de Calvino / comentários: "____ John 3:13-18"
  const pericopeHeadingRegex =
    /(?:_{4,})\s*([1-3]?\s*[A-ZÀ-Ÿ][A-Za-zÀ-ÿ]+)\s+(\d{1,3}):(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?\b/g;
  let pMatch: RegExpExecArray | null;
  while ((pMatch = pericopeHeadingRegex.exec(text)) !== null) {
    const bookId = resolveSafeInlineBookId(pMatch[1], false, '(');
    const chapter = parseInt(pMatch[2], 10);
    const vStart = parseInt(pMatch[3], 10);
    const vEnd = pMatch[4] ? parseInt(pMatch[4], 10) : vStart;
    if (bookId && isValidBookChapterVerse(bookId, chapter, vStart)) {
      ctx.bookId = bookId;
      ctx.chapter = chapter;
      ctx.startRef = toCanonicalRef(bookId, chapter, vStart);
      ctx.endRef = toCanonicalRef(bookId, chapter, Math.max(vStart, vEnd));
      pushRef(
        bookId,
        chapter,
        vStart,
        vEnd,
        'heading',
        1.0,
        pMatch[0].replace(/^_+\s*/, ''),
      );
    }
  }

  // 4. Cabeçalhos e subcabeçalhos de intervalo de versículos ("Verses 16-18", "ver. 1-21", "v. 14-18", "vv. 16-18")
  // Resolvidos pelo cabeçalho corrente (ctx.bookId + ctx.chapter)
  if (ctx.bookId && ctx.chapter) {
    const verseRangeHeadingRegex =
      /\b(?:Verses|Verse|vers\.|ver\.|vv\.|v\.)\s*(\d{1,3})\s*(?:[-–—]\s*(\d{1,3})|,\s*(\d{1,3}))\b/gi;
    let vrMatch: RegExpExecArray | null;
    while ((vrMatch = verseRangeHeadingRegex.exec(text)) !== null) {
      const vStart = parseInt(vrMatch[1], 10);
      const vEnd = parseInt(vrMatch[2] || vrMatch[3], 10);
      if (
        isValidBookChapterVerse(ctx.bookId, ctx.chapter, vStart) &&
        isValidBookChapterVerse(ctx.bookId, ctx.chapter, vEnd) &&
        vEnd >= vStart &&
        vEnd - vStart <= 60
      ) {
        ctx.startRef = toCanonicalRef(ctx.bookId, ctx.chapter, vStart);
        ctx.endRef = toCanonicalRef(ctx.bookId, ctx.chapter, vEnd);
        pushRef(
          ctx.bookId,
          ctx.chapter,
          vStart,
          vEnd,
          'heading',
          0.95,
          vrMatch[0],
        );
      }
    }
  }

  // 5. Referências explícitas com Livro + Capítulo (arábico ou romano) + Versículo(s)
  // Exemplos suportados:
  //   - "John 3:16", "Jo 3:16-18", "1 Cor. 13:4-7", "Romans 5:8, 10", "John 14. 26"
  //   - "Ps. cxix. 130", "Job ix. 15", "Num. xxi. 6-9", "Luke xxiv. 26, 46", "1 Cor. xv. 47"
  //   - Continuação por ponto-e-vírgula: "Ps. civ. 13; lxv. 9, 10"
  const explicitRefRegex =
    /(^|[^A-Za-zÀ-ÿ0-9_])((?:(?:[1-3]|I{1,3})\.?\s+)?[A-ZÀ-Ÿ][A-Za-zÀ-ÿ]{1,14})(\.?)\s+(\d{1,3}|[ivxlcdmIVXLCDM]{1,7})(?:\s*[:.]\s*)(\d{1,3})(?:\s*[-–—]\s*(\d{1,3})|(?:\s*,\s*(\d{1,3}))+)?((?:\s*;\s*(?:\d{1,3}|[ivxlcdmIVXLCDM]{1,7})\s*[:.]\s*\d{1,3}(?:\s*[-–—]\s*\d{1,3}|\s*,\s*\d{1,3})*)*)/g;

  let exMatch: RegExpExecArray | null;
  while ((exMatch = explicitRefRegex.exec(text)) !== null) {
    const precedingChar = exMatch[1] || '';
    const rawBook = exMatch[2];
    const hasDot = exMatch[3] === '.';
    const rawChap = exMatch[4];
    const rawV1 = exMatch[5];
    const rawVRangeEnd = exMatch[6];
    const semicolonTail = exMatch[8] || '';

    // Se o capítulo é romano sem ponto dopo o livro e o livro é palavra comum, valida com rigor
    const bookId = resolveSafeInlineBookId(rawBook, hasDot, precedingChar);
    if (!bookId) continue;

    const chapter = parseChapterNumber(rawChap);
    if (!chapter) continue;

    const v1 = parseInt(rawV1, 10);
    if (!isValidBookChapterVerse(bookId, chapter, v1)) continue;

    const fullMatchedText = exMatch[0].slice(precedingChar.length);

    if (rawVRangeEnd) {
      const v2 = parseInt(rawVRangeEnd, 10);
      pushRef(bookId, chapter, v1, v2, 'inline', 1.0, fullMatchedText);
    } else {
      // Verifica se há lista separada por vírgula após o primeiro versículo (ex: "Heb. iv. 12, 13" ou "Romans 5:8, 10")
      const primaryPart = fullMatchedText.split(';')[0];
      const afterChap = primaryPart.replace(
        /^.*?(\d{1,3}|[ivxlcdmIVXLCDM]{1,7})\s*[:.]\s*/,
        '',
      );
      const commaVerses = afterChap
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n));

      if (commaVerses.length === 2 && commaVerses[1] === commaVerses[0] + 1) {
        pushRef(
          bookId,
          chapter,
          commaVerses[0],
          commaVerses[1],
          'inline',
          1.0,
          primaryPart,
        );
      } else if (commaVerses.length > 1) {
        for (const v of commaVerses) {
          pushRef(bookId, chapter, v, v, 'inline', 1.0, primaryPart);
        }
      } else {
        pushRef(bookId, chapter, v1, v1, 'inline', 1.0, primaryPart);
      }
    }

    // Processa continuações com ";" do mesmo livro (ex: "Ps. civ. 13; lxv. 9, 10")
    if (semicolonTail) {
      const tailParts = semicolonTail
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean);
      for (const part of tailParts) {
        const tm = part.match(
          /^(\d{1,3}|[ivxlcdmIVXLCDM]{1,7})\s*[:.]\s*(\d{1,3})(?:\s*[-–—]\s*(\d{1,3})|\s*,\s*(\d{1,3}))?$/,
        );
        if (!tm) continue;
        const tChap = parseChapterNumber(tm[1]);
        const tv1 = parseInt(tm[2], 10);
        if (!tChap || !isValidBookChapterVerse(bookId, tChap, tv1)) continue;
        if (tm[3]) {
          pushRef(
            bookId,
            tChap,
            tv1,
            parseInt(tm[3], 10),
            'inline',
            0.95,
            `${rawBook} ${part}`,
          );
        } else if (tm[4]) {
          const tv2 = parseInt(tm[4], 10);
          if (tv2 === tv1 + 1) {
            pushRef(
              bookId,
              tChap,
              tv1,
              tv2,
              'inline',
              0.95,
              `${rawBook} ${part}`,
            );
          } else {
            pushRef(
              bookId,
              tChap,
              tv1,
              tv1,
              'inline',
              0.95,
              `${rawBook} ${part}`,
            );
            pushRef(
              bookId,
              tChap,
              tv2,
              tv2,
              'inline',
              0.95,
              `${rawBook} ${part}`,
            );
          }
        } else {
          pushRef(
            bookId,
            tChap,
            tv1,
            tv1,
            'inline',
            0.95,
            `${rawBook} ${part}`,
          );
        }
      }
    }
  }

  // 6. Referências contextuais de capítulo ("ch. vii. 50; xix. 39", "ch. xii. 32, 33", "(ch. i. 13)")
  // quando ctx.bookId é conhecido
  if (ctx.bookId) {
    const chRefRegex =
      /\b(?:ch|chap)\.\s*([ivxlcdmIVXLCDM]{1,7}|\d{1,3})\.?\s*[:.]?\s*(\d{1,3})(?:\s*[-–—]\s*(\d{1,3})|\s*,\s*(\d{1,3}))?((?:\s*;\s*(?:[ivxlcdmIVXLCDM]{1,7}|\d{1,3})\.?\s*[:.]?\s*\d{1,3})*)/gi;
    let cm: RegExpExecArray | null;
    while ((cm = chRefRegex.exec(text)) !== null) {
      const cNum = parseChapterNumber(cm[1]);
      const v1 = parseInt(cm[2], 10);
      if (!cNum || !isValidBookChapterVerse(ctx.bookId, cNum, v1)) continue;
      if (cm[3]) {
        pushRef(
          ctx.bookId,
          cNum,
          v1,
          parseInt(cm[3], 10),
          'inline',
          0.95,
          cm[0],
        );
      } else if (cm[4]) {
        const v2 = parseInt(cm[4], 10);
        if (v2 === v1 + 1) {
          pushRef(ctx.bookId, cNum, v1, v2, 'inline', 0.95, cm[0]);
        } else {
          pushRef(ctx.bookId, cNum, v1, v1, 'inline', 0.95, cm[0]);
          pushRef(ctx.bookId, cNum, v2, v2, 'inline', 0.95, cm[0]);
        }
      } else {
        pushRef(ctx.bookId, cNum, v1, v1, 'inline', 0.95, cm[0]);
      }

      if (cm[5]) {
        const tailParts = cm[5]
          .split(';')
          .map((s) => s.trim())
          .filter(Boolean);
        for (const tp of tailParts) {
          const tpm = tp.match(
            /^([ivxlcdmIVXLCDM]{1,7}|\d{1,3})\.?\s*[:.]?\s*(\d{1,3})$/,
          );
          if (!tpm) continue;
          const tc = parseChapterNumber(tpm[1]);
          const tv = parseInt(tpm[2], 10);
          if (tc && isValidBookChapterVerse(ctx.bookId, tc, tv)) {
            pushRef(ctx.bookId, tc, tv, tv, 'inline', 0.95, `ch. ${tp}`);
          }
        }
      }
    }
  }

  // 7. Referências contextuais de versículo isolado ("v. 16", "(v. 16)", "ver. 16", "Verse 16")
  // resolvidas pelo cabeçalho corrente (ctx.bookId + ctx.chapter)
  if (ctx.bookId && ctx.chapter) {
    const singleVerseRegex =
      /\b(?:Verse|ver\.|v\.)\s*(\d{1,3})(?!\s*[-–—,\d])/gi;
    let svm: RegExpExecArray | null;
    while ((svm = singleVerseRegex.exec(text)) !== null) {
      const vNum = parseInt(svm[1], 10);
      if (isValidBookChapterVerse(ctx.bookId, ctx.chapter, vNum)) {
        pushRef(ctx.bookId, ctx.chapter, vNum, vNum, 'inline', 0.9, svm[0]);
      }
    }
  }

  return { references: extracted, updatedContext: ctx };
}

/**
 * Realiza chunking estrutural por cabeçalhos (CHAPTER / CHAP. / PSALM / Verses X-Y),
 * caindo para janelas deslizantes com sobreposição quando um bloco excede windowWords
 * ou não possui cabeçalhos.
 */
export function splitIntoStructuralChunks(
  text: string,
  options?: {
    windowWords?: number;
    overlapWords?: number;
    initialContext?: HeadingContext;
  },
): StructuralChunk[] {
  const windowWords = options?.windowWords ?? 450;
  const overlapWords = options?.overlapWords ?? 50;
  let runningContext: HeadingContext = { ...options?.initialContext };

  if (!text || !text.trim()) return [];

  // Divide em seções estruturais nos pontos de cabeçalho (CHAPTER, CHAP., PSALM, Verses X-Y)
  const headingSplitRegex =
    /(?=(?:_{5,}\s*(?:(?:[I]{1,3}|[1-3])\.?\s+)?(?:[A-Z]\s+){3,}[A-Z]\.?\s+(?:CHAP\.|PSALM)\s+(?:[IVXLCDM]+|\d+))|(?:(?:^|\n)\s*(?:CHAPTER|CHAP\.|CAP[ÍI]TULO|PSALM|SALMO)\s+(?:[IVXLCDM]+|\d+)\b)|(?:(?:^|\n)\s*(?:Verses|Ver\.)\s+\d{1,3}\s*[-–—]\s*\d{1,3}\b))/gi;

  const rawParts = text
    .split(headingSplitRegex)
    .map((s) => s.trim())
    .filter(Boolean);

  // Mescla cabeçalho puro de capítulo ("CHAPTER 3") com a primeira subseção ("Verses 1-5...")
  const rawSections: string[] = [];
  for (let i = 0; i < rawParts.length; i++) {
    const part = rawParts[i];
    if (
      /^(?:CHAPTER|CHAP\.|CAP[ÍI]TULO|PSALM|SALMO)\s+(?:[IVXLCDM]+|\d+)\.?$/i.test(
        part,
      ) &&
      i + 1 < rawParts.length
    ) {
      rawSections.push(`${part}\n${rawParts[i + 1]}`);
      i++;
    } else {
      rawSections.push(part);
    }
  }

  const chunks: StructuralChunk[] = [];
  let chunkIndex = 0;

  for (const section of rawSections) {
    const words = section.split(/\s+/);
    if (words.length <= windowWords) {
      const { references, updatedContext } = extractStructuredReferences(
        section,
        runningContext,
      );
      runningContext = updatedContext;

      // Garante que o intervalo herdado do cabeçalho conste como referência kind='heading'
      const allRefs = [...references];
      if (
        runningContext.startRef &&
        runningContext.endRef &&
        !allRefs.some(
          (r) =>
            r.kind === 'heading' &&
            r.startRef === runningContext.startRef &&
            r.endRef === runningContext.endRef,
        )
      ) {
        allRefs.unshift({
          canonicalRef: runningContext.startRef,
          startRef: runningContext.startRef,
          endRef: runningContext.endRef,
          kind: 'heading',
          confidence: 0.9,
          raw: 'heading-context',
        });
      }

      chunks.push({
        chunkIndex: chunkIndex++,
        text: section,
        startRef: runningContext.startRef,
        endRef: runningContext.endRef,
        references: allRefs,
      });
    } else {
      // Janela deslizante com sobreposição preservando o contexto do cabeçalho da seção
      const step = Math.max(1, windowWords - overlapWords);
      for (let start = 0; start < words.length; start += step) {
        const sliceText = words.slice(start, start + windowWords).join(' ');
        const { references, updatedContext } = extractStructuredReferences(
          sliceText,
          runningContext,
        );
        runningContext = updatedContext;

        const allRefs = [...references];
        if (
          runningContext.startRef &&
          runningContext.endRef &&
          !allRefs.some(
            (r) =>
              r.kind === 'heading' &&
              r.startRef === runningContext.startRef &&
              r.endRef === runningContext.endRef,
          )
        ) {
          allRefs.unshift({
            canonicalRef: runningContext.startRef,
            startRef: runningContext.startRef,
            endRef: runningContext.endRef,
            kind: 'heading',
            confidence: 0.9,
            raw: 'heading-context',
          });
        }

        chunks.push({
          chunkIndex: chunkIndex++,
          text: sliceText,
          startRef: runningContext.startRef,
          endRef: runningContext.endRef,
          references: allRefs,
        });
        if (start + windowWords >= words.length) break;
      }
    }
  }

  return chunks;
}
