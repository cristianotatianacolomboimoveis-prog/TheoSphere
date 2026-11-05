/**
 * versification.ts — Sistema de Mapeamento de Versificação Canônica (Frontend)
 *
 * Mapeia divergências entre os esquemas:
 * - KJV / Protestant (padrão ocidental: BLIVRE, NVA, KJV, WEB, SBLGNT, TR)
 * - MT (Masoretic Text: Westminster Leningrad Codex - WLC)
 * - LXX (Septuaginta Grega)
 *
 * Fonte de referência: Paratext / SIL Versification Tables e STEPBible Data (CC BY 4.0).
 */

export type VersificationScheme = "KJV" | "MT" | "LXX";

export interface VerseRef {
  bookId: number;
  chapter: number;
  verse: number;
}

export interface VersificationRule {
  bookId: number;
  kjvChapter: number;
  kjvVerseStart: number;
  kjvVerseEnd: number;
  mtChapter: number;
  mtVerseStart: number;
}

const PSALMS_OFFSET_PLUS_1 = new Set([
  3, 4, 5, 6, 7, 8, 9, 12, 18, 19, 20, 21, 22, 30, 31, 34, 36, 38, 39, 40, 41,
  42, 44, 46, 47, 48, 49, 53, 55, 56, 57, 58, 59, 61, 62, 63, 64, 65, 67, 68,
  69, 70, 75, 76, 77, 80, 81, 83, 84, 85, 88, 89, 92, 102, 108, 140, 142,
]);

const PSALMS_OFFSET_PLUS_2 = new Set([51, 52, 54, 60]);

export const BLOCK_RULES: VersificationRule[] = [
  {
    bookId: 1,
    kjvChapter: 31,
    kjvVerseStart: 55,
    kjvVerseEnd: 55,
    mtChapter: 32,
    mtVerseStart: 1,
  },
  {
    bookId: 1,
    kjvChapter: 32,
    kjvVerseStart: 1,
    kjvVerseEnd: 32,
    mtChapter: 32,
    mtVerseStart: 2,
  },
  {
    bookId: 2,
    kjvChapter: 8,
    kjvVerseStart: 1,
    kjvVerseEnd: 4,
    mtChapter: 7,
    mtVerseStart: 26,
  },
  {
    bookId: 2,
    kjvChapter: 8,
    kjvVerseStart: 5,
    kjvVerseEnd: 32,
    mtChapter: 8,
    mtVerseStart: 1,
  },
  {
    bookId: 2,
    kjvChapter: 22,
    kjvVerseStart: 1,
    kjvVerseEnd: 1,
    mtChapter: 21,
    mtVerseStart: 37,
  },
  {
    bookId: 2,
    kjvChapter: 22,
    kjvVerseStart: 2,
    kjvVerseEnd: 31,
    mtChapter: 22,
    mtVerseStart: 1,
  },
  {
    bookId: 3,
    kjvChapter: 6,
    kjvVerseStart: 1,
    kjvVerseEnd: 7,
    mtChapter: 5,
    mtVerseStart: 20,
  },
  {
    bookId: 3,
    kjvChapter: 6,
    kjvVerseStart: 8,
    kjvVerseEnd: 30,
    mtChapter: 6,
    mtVerseStart: 1,
  },
  {
    bookId: 4,
    kjvChapter: 16,
    kjvVerseStart: 36,
    kjvVerseEnd: 50,
    mtChapter: 17,
    mtVerseStart: 1,
  },
  {
    bookId: 4,
    kjvChapter: 17,
    kjvVerseStart: 1,
    kjvVerseEnd: 13,
    mtChapter: 17,
    mtVerseStart: 16,
  },
  {
    bookId: 9,
    kjvChapter: 23,
    kjvVerseStart: 29,
    kjvVerseEnd: 29,
    mtChapter: 24,
    mtVerseStart: 1,
  },
  {
    bookId: 9,
    kjvChapter: 24,
    kjvVerseStart: 1,
    kjvVerseEnd: 22,
    mtChapter: 24,
    mtVerseStart: 2,
  },
  {
    bookId: 10,
    kjvChapter: 18,
    kjvVerseStart: 33,
    kjvVerseEnd: 33,
    mtChapter: 19,
    mtVerseStart: 1,
  },
  {
    bookId: 10,
    kjvChapter: 19,
    kjvVerseStart: 1,
    kjvVerseEnd: 43,
    mtChapter: 19,
    mtVerseStart: 2,
  },
  {
    bookId: 11,
    kjvChapter: 4,
    kjvVerseStart: 21,
    kjvVerseEnd: 34,
    mtChapter: 5,
    mtVerseStart: 1,
  },
  {
    bookId: 11,
    kjvChapter: 5,
    kjvVerseStart: 1,
    kjvVerseEnd: 18,
    mtChapter: 5,
    mtVerseStart: 15,
  },
  {
    bookId: 16,
    kjvChapter: 4,
    kjvVerseStart: 1,
    kjvVerseEnd: 6,
    mtChapter: 3,
    mtVerseStart: 33,
  },
  {
    bookId: 16,
    kjvChapter: 4,
    kjvVerseStart: 7,
    kjvVerseEnd: 23,
    mtChapter: 4,
    mtVerseStart: 1,
  },
  {
    bookId: 18,
    kjvChapter: 41,
    kjvVerseStart: 1,
    kjvVerseEnd: 8,
    mtChapter: 40,
    mtVerseStart: 25,
  },
  {
    bookId: 18,
    kjvChapter: 41,
    kjvVerseStart: 9,
    kjvVerseEnd: 34,
    mtChapter: 41,
    mtVerseStart: 1,
  },
  {
    bookId: 21,
    kjvChapter: 5,
    kjvVerseStart: 1,
    kjvVerseEnd: 1,
    mtChapter: 4,
    mtVerseStart: 17,
  },
  {
    bookId: 21,
    kjvChapter: 5,
    kjvVerseStart: 2,
    kjvVerseEnd: 20,
    mtChapter: 5,
    mtVerseStart: 1,
  },
  {
    bookId: 22,
    kjvChapter: 6,
    kjvVerseStart: 13,
    kjvVerseEnd: 13,
    mtChapter: 7,
    mtVerseStart: 1,
  },
  {
    bookId: 22,
    kjvChapter: 7,
    kjvVerseStart: 1,
    kjvVerseEnd: 13,
    mtChapter: 7,
    mtVerseStart: 2,
  },
  {
    bookId: 23,
    kjvChapter: 9,
    kjvVerseStart: 1,
    kjvVerseEnd: 1,
    mtChapter: 8,
    mtVerseStart: 23,
  },
  {
    bookId: 23,
    kjvChapter: 9,
    kjvVerseStart: 2,
    kjvVerseEnd: 21,
    mtChapter: 9,
    mtVerseStart: 1,
  },
  {
    bookId: 26,
    kjvChapter: 20,
    kjvVerseStart: 45,
    kjvVerseEnd: 49,
    mtChapter: 21,
    mtVerseStart: 1,
  },
  {
    bookId: 26,
    kjvChapter: 21,
    kjvVerseStart: 1,
    kjvVerseEnd: 32,
    mtChapter: 21,
    mtVerseStart: 6,
  },
  {
    bookId: 27,
    kjvChapter: 4,
    kjvVerseStart: 1,
    kjvVerseEnd: 3,
    mtChapter: 3,
    mtVerseStart: 31,
  },
  {
    bookId: 27,
    kjvChapter: 4,
    kjvVerseStart: 4,
    kjvVerseEnd: 37,
    mtChapter: 4,
    mtVerseStart: 1,
  },
  {
    bookId: 28,
    kjvChapter: 1,
    kjvVerseStart: 10,
    kjvVerseEnd: 11,
    mtChapter: 2,
    mtVerseStart: 1,
  },
  {
    bookId: 28,
    kjvChapter: 2,
    kjvVerseStart: 1,
    kjvVerseEnd: 23,
    mtChapter: 2,
    mtVerseStart: 3,
  },
  {
    bookId: 28,
    kjvChapter: 11,
    kjvVerseStart: 12,
    kjvVerseEnd: 12,
    mtChapter: 12,
    mtVerseStart: 1,
  },
  {
    bookId: 28,
    kjvChapter: 12,
    kjvVerseStart: 1,
    kjvVerseEnd: 14,
    mtChapter: 12,
    mtVerseStart: 2,
  },
  {
    bookId: 28,
    kjvChapter: 13,
    kjvVerseStart: 16,
    kjvVerseEnd: 16,
    mtChapter: 14,
    mtVerseStart: 1,
  },
  {
    bookId: 28,
    kjvChapter: 14,
    kjvVerseStart: 1,
    kjvVerseEnd: 9,
    mtChapter: 14,
    mtVerseStart: 2,
  },
  {
    bookId: 29,
    kjvChapter: 2,
    kjvVerseStart: 28,
    kjvVerseEnd: 32,
    mtChapter: 3,
    mtVerseStart: 1,
  },
  {
    bookId: 29,
    kjvChapter: 3,
    kjvVerseStart: 1,
    kjvVerseEnd: 21,
    mtChapter: 4,
    mtVerseStart: 1,
  },
  {
    bookId: 32,
    kjvChapter: 1,
    kjvVerseStart: 17,
    kjvVerseEnd: 17,
    mtChapter: 2,
    mtVerseStart: 1,
  },
  {
    bookId: 32,
    kjvChapter: 2,
    kjvVerseStart: 1,
    kjvVerseEnd: 10,
    mtChapter: 2,
    mtVerseStart: 2,
  },
  {
    bookId: 33,
    kjvChapter: 5,
    kjvVerseStart: 1,
    kjvVerseEnd: 1,
    mtChapter: 4,
    mtVerseStart: 14,
  },
  {
    bookId: 33,
    kjvChapter: 5,
    kjvVerseStart: 2,
    kjvVerseEnd: 15,
    mtChapter: 5,
    mtVerseStart: 1,
  },
  {
    bookId: 34,
    kjvChapter: 1,
    kjvVerseStart: 15,
    kjvVerseEnd: 15,
    mtChapter: 2,
    mtVerseStart: 1,
  },
  {
    bookId: 34,
    kjvChapter: 2,
    kjvVerseStart: 1,
    kjvVerseEnd: 13,
    mtChapter: 2,
    mtVerseStart: 2,
  },
  {
    bookId: 39,
    kjvChapter: 4,
    kjvVerseStart: 1,
    kjvVerseEnd: 6,
    mtChapter: 3,
    mtVerseStart: 19,
  },
];

export function mapKjvToMt(ref: VerseRef): VerseRef {
  const { bookId, chapter, verse } = ref;

  if (bookId === 19) {
    if (PSALMS_OFFSET_PLUS_2.has(chapter)) {
      return { bookId, chapter, verse: verse + 2 };
    }
    if (PSALMS_OFFSET_PLUS_1.has(chapter)) {
      return { bookId, chapter, verse: verse + 1 };
    }
    return { bookId, chapter, verse };
  }

  for (const rule of BLOCK_RULES) {
    if (
      rule.bookId === bookId &&
      rule.kjvChapter === chapter &&
      verse >= rule.kjvVerseStart &&
      verse <= rule.kjvVerseEnd
    ) {
      const offset = verse - rule.kjvVerseStart;
      return {
        bookId,
        chapter: rule.mtChapter,
        verse: rule.mtVerseStart + offset,
      };
    }
  }

  return { bookId, chapter, verse };
}

export function mapMtToKjv(ref: VerseRef): VerseRef {
  const { bookId, chapter, verse } = ref;

  if (bookId === 19) {
    if (PSALMS_OFFSET_PLUS_2.has(chapter)) {
      return { bookId, chapter, verse: Math.max(1, verse - 2) };
    }
    if (PSALMS_OFFSET_PLUS_1.has(chapter)) {
      return { bookId, chapter, verse: Math.max(1, verse - 1) };
    }
    return { bookId, chapter, verse };
  }

  for (const rule of BLOCK_RULES) {
    const ruleCount = rule.kjvVerseEnd - rule.kjvVerseStart;
    const mtVerseEnd = rule.mtVerseStart + ruleCount;

    if (
      rule.bookId === bookId &&
      rule.mtChapter === chapter &&
      verse >= rule.mtVerseStart &&
      verse <= mtVerseEnd
    ) {
      const offset = verse - rule.mtVerseStart;
      return {
        bookId,
        chapter: rule.kjvChapter,
        verse: rule.kjvVerseStart + offset,
      };
    }
  }

  return { bookId, chapter, verse };
}

export function mapKjvToLxx(ref: VerseRef): VerseRef {
  const { bookId, chapter, verse } = ref;

  if (bookId === 19) {
    if (chapter <= 8) {
      return { bookId, chapter, verse };
    }
    if (chapter === 9 || chapter === 10) {
      return { bookId, chapter: 9, verse };
    }
    if (chapter >= 11 && chapter <= 113) {
      return { bookId, chapter: chapter - 1, verse };
    }
    if (chapter === 114 || chapter === 115) {
      return { bookId, chapter: 113, verse };
    }
    if (chapter === 116) {
      return verse <= 9
        ? { bookId, chapter: 114, verse }
        : { bookId, chapter: 115, verse: verse - 9 };
    }
    if (chapter >= 117 && chapter <= 146) {
      return { bookId, chapter: chapter - 1, verse };
    }
    if (chapter === 147) {
      return verse <= 11
        ? { bookId, chapter: 146, verse }
        : { bookId, chapter: 147, verse: verse - 11 };
    }
    return { bookId, chapter, verse };
  }

  return { bookId, chapter, verse };
}

export function mapLxxToKjv(ref: VerseRef): VerseRef {
  const { bookId, chapter, verse } = ref;

  if (bookId === 19) {
    if (chapter <= 8) {
      return { bookId, chapter, verse };
    }
    if (chapter === 9) {
      return { bookId, chapter: 9, verse };
    }
    if (chapter >= 10 && chapter <= 112) {
      return { bookId, chapter: chapter + 1, verse };
    }
    if (chapter === 113) {
      return { bookId, chapter: 114, verse };
    }
    if (chapter === 114) {
      return { bookId, chapter: 116, verse };
    }
    if (chapter === 115) {
      return { bookId, chapter: 116, verse: verse + 9 };
    }
    if (chapter >= 116 && chapter <= 145) {
      return { bookId, chapter: chapter + 1, verse };
    }
    if (chapter === 146) {
      return { bookId, chapter: 147, verse };
    }
    if (chapter === 147) {
      return { bookId, chapter: 147, verse: verse + 11 };
    }
    return { bookId, chapter, verse };
  }

  return { bookId, chapter, verse };
}

export function mapRef(
  ref: VerseRef,
  fromScheme: VersificationScheme,
  toScheme: VersificationScheme,
): VerseRef {
  if (fromScheme === toScheme) {
    return { ...ref };
  }

  let kjvRef = { ...ref };
  if (fromScheme === "MT") {
    kjvRef = mapMtToKjv(ref);
  } else if (fromScheme === "LXX") {
    kjvRef = mapLxxToKjv(ref);
  }

  if (toScheme === "KJV") {
    return kjvRef;
  }
  if (toScheme === "MT") {
    return mapKjvToMt(kjvRef);
  }
  if (toScheme === "LXX") {
    return mapKjvToLxx(kjvRef);
  }

  return kjvRef;
}

export function getVersificationScheme(
  translation?: string,
): VersificationScheme {
  if (!translation) return "KJV";
  const norm = translation.toUpperCase().trim();
  if (norm === "WLC") return "MT";
  if (norm === "LXX") return "LXX";
  return "KJV";
}

export function mapTranslationRef(
  ref: VerseRef,
  fromTranslation: string,
  toTranslation: string,
): VerseRef {
  const fromScheme = getVersificationScheme(fromTranslation);
  const toScheme = getVersificationScheme(toTranslation);
  return mapRef(ref, fromScheme, toScheme);
}
