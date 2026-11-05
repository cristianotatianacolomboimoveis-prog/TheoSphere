/**
 * versification.ts — Sistema de Mapeamento de Versificação Canônica
 *
 * Mapeia divergências entre os esquemas:
 * - KJV / Protestant (padrão ocidental: BLIVRE, NVA, KJV, WEB, SBLGNT, TR)
 * - MT (Masoretic Text: Westminster Leningrad Codex - WLC)
 * - LXX (Septuaginta Grega)
 *
 * Fonte de referência: Paratext / SIL Versification Tables e STEPBible Data (CC BY 4.0).
 */

export type VersificationScheme = 'KJV' | 'MT' | 'LXX';

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

// Salmos onde o MT inclui o título como versículo 1 (offset +1 no versículo)
const PSALMS_OFFSET_PLUS_1 = new Set([
  3, 4, 5, 6, 7, 8, 9, 12, 18, 19, 20, 21, 22, 30, 31, 34, 36, 38, 39, 40, 41,
  42, 44, 46, 47, 48, 49, 53, 55, 56, 57, 58, 59, 61, 62, 63, 64, 65, 67, 68,
  69, 70, 75, 76, 77, 80, 81, 83, 84, 85, 88, 89, 92, 102, 108, 140, 142,
]);

// Salmos onde o MT inclui o título longo como versículos 1 e 2 (offset +2 no versículo)
const PSALMS_OFFSET_PLUS_2 = new Set([51, 52, 54, 60]);

export const BLOCK_RULES: VersificationRule[] = [
  // Gênesis 31:55 e 32
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

  // Êxodo 7:26-29 e 8:1-32
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

  // Êxodo 21:37 e 22:1-31
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

  // Levítico 5:20-26 e 6:1-30
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

  // Números 16:36-50 e 17:1-13
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

  // 1 Samuel 23:29 e 24:1-22
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

  // 2 Samuel 18:33 e 19:1-43
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

  // 1 Reis 4:21-34 e 5:1-18
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

  // Neemias 3:33-38 e 4:1-23
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

  // Jó 40:25-32 e 41:1-34
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

  // Eclesiastes 4:17 e 5:1-20
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

  // Cantares 6:13 e 7:1-13
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

  // Isaías 8:23 e 9:1-21
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

  // Ezequiel 20:45-49 e 21:1-32
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

  // Daniel 3:31-33 e 4:1-37
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

  // Oséias 1:10-11 e 2:1-23
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

  // Oséias 11:12 e 12:1-14
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

  // Oséias 13:16 e 14:1-9
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

  // Joel 2:28-32 e 3:1-21
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

  // Jonas 1:17 e 2:1-10
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

  // Miquéias 4:14 e 5:1-15
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

  // Naum 1:15 e 2:1-13
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

  // Malaquias 3:19-24 / 4:1-6
  {
    bookId: 39,
    kjvChapter: 4,
    kjvVerseStart: 1,
    kjvVerseEnd: 6,
    mtChapter: 3,
    mtVerseStart: 19,
  },
];

/**
 * Converte uma referência de KJV para MT.
 */
export function mapKjvToMt(ref: VerseRef): VerseRef {
  const { bookId, chapter, verse } = ref;

  // 1. Tratamento específico dos Salmos (Livro 19)
  if (bookId === 19) {
    if (PSALMS_OFFSET_PLUS_2.has(chapter)) {
      return { bookId, chapter, verse: verse + 2 };
    }
    if (PSALMS_OFFSET_PLUS_1.has(chapter)) {
      return { bookId, chapter, verse: verse + 1 };
    }
    return { bookId, chapter, verse };
  }

  // 2. Busca nas regras de bloco
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

/**
 * Converte uma referência de MT para KJV (inversa).
 */
export function mapMtToKjv(ref: VerseRef): VerseRef {
  const { bookId, chapter, verse } = ref;

  // 1. Tratamento de Salmos
  if (bookId === 19) {
    if (PSALMS_OFFSET_PLUS_2.has(chapter)) {
      // Se for título (versículos 1 e 2 no MT), mapeia para versículo 1 no KJV
      return { bookId, chapter, verse: Math.max(1, verse - 2) };
    }
    if (PSALMS_OFFSET_PLUS_1.has(chapter)) {
      return { bookId, chapter, verse: Math.max(1, verse - 1) };
    }
    return { bookId, chapter, verse };
  }

  // 2. Busca inversa nas regras de bloco
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

/**
 * Converte uma referência de KJV para LXX.
 */
export function mapKjvToLxx(ref: VerseRef): VerseRef {
  const { bookId, chapter, verse } = ref;

  // Nos Salmos (Livro 19)
  if (bookId === 19) {
    // Salmos 1 a 8 são idênticos
    if (chapter <= 8) {
      return { bookId, chapter, verse };
    }
    // Salmos 9 e 10 (KJV) viram Salmo 9 na LXX
    if (chapter === 9 || chapter === 10) {
      return { bookId, chapter: 9, verse };
    }
    // Salmos 11 a 113 viram Salmos 10 a 112 (offset -1 no capítulo)
    if (chapter >= 11 && chapter <= 113) {
      return { bookId, chapter: chapter - 1, verse };
    }
    // Salmos 114 e 115 viram Salmo 113 na LXX
    if (chapter === 114 || chapter === 115) {
      return { bookId, chapter: 113, verse };
    }
    // Salmo 116 vira 114 e 115 na LXX
    if (chapter === 116) {
      return verse <= 9
        ? { bookId, chapter: 114, verse }
        : { bookId, chapter: 115, verse: verse - 9 };
    }
    // Salmos 117 a 146 viram Salmos 116 a 145 (offset -1 no capítulo)
    if (chapter >= 117 && chapter <= 146) {
      return { bookId, chapter: chapter - 1, verse };
    }
    // Salmo 147 vira 146 e 147 na LXX
    if (chapter === 147) {
      return verse <= 11
        ? { bookId, chapter: 146, verse }
        : { bookId, chapter: 147, verse: verse - 11 };
    }
    // Salmos 148 a 150 são idênticos
    return { bookId, chapter, verse };
  }

  return { bookId, chapter, verse };
}

/**
 * Converte uma referência de LXX para KJV (inversa).
 */
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

/**
 * Função central bidirecional: converte referências entre quaisquer esquemas suportados.
 */
export function mapRef(
  ref: VerseRef,
  fromScheme: VersificationScheme,
  toScheme: VersificationScheme,
): VerseRef {
  if (fromScheme === toScheme) {
    return { ...ref };
  }

  // 1. Normaliza para o esquema KJV
  let kjvRef = { ...ref };
  if (fromScheme === 'MT') {
    kjvRef = mapMtToKjv(ref);
  } else if (fromScheme === 'LXX') {
    kjvRef = mapLxxToKjv(ref);
  }

  // 2. Converte de KJV para o esquema de destino
  if (toScheme === 'KJV') {
    return kjvRef;
  }
  if (toScheme === 'MT') {
    return mapKjvToMt(kjvRef);
  }
  if (toScheme === 'LXX') {
    return mapKjvToLxx(kjvRef);
  }

  return kjvRef;
}

/**
 * Identifica o esquema de versificação a partir do código da tradução.
 */
export function getVersificationScheme(
  translation?: string,
): VersificationScheme {
  if (!translation) return 'KJV';
  const norm = translation.toUpperCase().trim();
  if (norm === 'WLC') return 'MT';
  if (norm === 'LXX') return 'LXX';
  return 'KJV';
}

/**
 * Converte referência entre duas traduções bíblicas quaisquer.
 */
export function mapTranslationRef(
  ref: VerseRef,
  fromTranslation: string,
  toTranslation: string,
): VerseRef {
  const fromScheme = getVersificationScheme(fromTranslation);
  const toScheme = getVersificationScheme(toTranslation);
  return mapRef(ref, fromScheme, toScheme);
}
