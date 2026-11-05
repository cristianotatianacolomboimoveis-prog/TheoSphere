import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { computeWordDiff, TextDiffResult } from './text-diff';
import { mapTranslationRef } from './versification';

export interface VerseVariantComparison {
  verse: number;
  base: {
    translation: string;
    text: string;
    language: string;
  };
  targets: Record<
    string,
    {
      text: string;
      language: string;
      isSameLanguage: boolean;
      diff?: TextDiffResult | null;
      note?: string | null;
    }
  >;
}

export interface ComparisonPassageResponse {
  reference: {
    bookId: number;
    chapter: number;
    verse: number | null;
    display: string;
  };
  baseTranslation: string;
  translations: string[];
  metrics: Record<
    string,
    {
      averageSimilarity: number | null;
      totalVerses: number;
      isSameLanguage: boolean;
      note?: string;
    }
  >;
  verses: VerseVariantComparison[];
}

export const ALLOWED_TRANSLATIONS = new Set([
  'BLIVRE',
  'NVA',
  'KJV',
  'WEB',
  'SBLGNT',
  'TR',
  'WLC',
  'LXX',
]);

export const TRANSLATION_LANGUAGES: Record<string, string> = {
  BLIVRE: 'pt',
  NVA: 'pt',
  KJV: 'en',
  WEB: 'en',
  SBLGNT: 'grc',
  TR: 'grc',
  LXX: 'grc',
  WLC: 'hbo',
};

const BOOK_NAMES: Record<number, string> = {
  1: 'Gênesis',
  2: 'Êxodo',
  3: 'Levítico',
  4: 'Números',
  5: 'Deuteronômio',
  6: 'Josué',
  7: 'Juízes',
  8: 'Rute',
  9: '1 Samuel',
  10: '2 Samuel',
  11: '1 Reis',
  12: '2 Reis',
  13: '1 Crônicas',
  14: '2 Crônicas',
  15: 'Esdras',
  16: 'Neemias',
  17: 'Ester',
  18: 'Jó',
  19: 'Salmos',
  20: 'Provérbios',
  21: 'Eclesiastes',
  22: 'Cânticos',
  23: 'Isaías',
  24: 'Jeremias',
  25: 'Lamentações',
  26: 'Ezequiel',
  27: 'Daniel',
  28: 'Oseias',
  29: 'Joel',
  30: 'Amós',
  31: 'Obadias',
  32: 'Jonas',
  33: 'Miqueias',
  34: 'Naum',
  35: 'Habacuque',
  36: 'Sofonias',
  37: 'Ageu',
  38: 'Zacarias',
  39: 'Malaquias',
  40: 'Mateus',
  41: 'Marcos',
  42: 'Lucas',
  43: 'João',
  44: 'Atos',
  45: 'Romanos',
  46: '1 Coríntios',
  47: '2 Coríntios',
  48: 'Gálatas',
  49: 'Efésios',
  50: 'Filipenses',
  51: 'Colossenses',
  52: '1 Tessalonicenses',
  53: '2 Tessalonicenses',
  54: '1 Timóteo',
  55: '2 Timóteo',
  56: 'Tito',
  57: 'Filemom',
  58: 'Hebreus',
  59: 'Tiago',
  60: '1 Pedro',
  61: '2 Pedro',
  62: '1 João',
  63: '2 João',
  64: '3 João',
  65: 'Judas',
  66: 'Apocalipse',
};

@Injectable()
export class BibleComparisonService {
  private readonly logger = new Logger(BibleComparisonService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Compara uma passagem bíblica entre uma tradução base e múltiplas traduções alvo.
   * T0.5: Restringe o diff LCS e % de similaridade a versões do mesmo idioma.
   */
  async comparePassage(
    bookId: number,
    chapter: number,
    baseTranslation = 'BLIVRE',
    requestedTranslations: string[] = ['BLIVRE', 'NVA', 'KJV'],
    verse?: number,
  ): Promise<ComparisonPassageResponse> {
    const baseUpper = (baseTranslation || 'BLIVRE').toUpperCase().trim();
    const validBase = ALLOWED_TRANSLATIONS.has(baseUpper)
      ? baseUpper
      : 'BLIVRE';

    const baseLang = TRANSLATION_LANGUAGES[validBase] || 'unknown';

    // Normaliza e deduplica as versões solicitadas garantindo que a base faça parte
    const targetsSet = new Set<string>();
    targetsSet.add(validBase);

    for (const t of requestedTranslations) {
      const clean = (t || '').toUpperCase().trim();
      if (ALLOWED_TRANSLATIONS.has(clean)) {
        targetsSet.add(clean);
      }
    }

    const allTranslations = Array.from(targetsSet);
    const targetTranslationsOnly = allTranslations.filter(
      (t) => t !== validBase,
    );

    // Identifica capítulos a consultar (incluindo possíveis divergências de versificação entre esquemas)
    const chaptersToFetch = new Set<number>([chapter]);
    for (const t of targetTranslationsOnly) {
      const sampleVerses = verse ? [verse] : [1, 5, 10, 20, 30, 40, 50];
      for (const v of sampleVerses) {
        const mapped = mapTranslationRef(
          { bookId, chapter, verse: v },
          validBase,
          t,
        );
        chaptersToFetch.add(mapped.chapter);
      }
    }

    const whereClause: any = {
      translation: { in: allTranslations },
      bookId,
      chapter: { in: Array.from(chaptersToFetch) },
    };
    if (verse && chaptersToFetch.size === 1) {
      whereClause.verse = verse;
    }

    const rows = await this.prisma.bibleVerse.findMany({
      where: whereClause,
      select: {
        chapter: true,
        verse: true,
        text: true,
        translation: true,
      },
      orderBy: [{ chapter: 'asc' }, { verse: 'asc' }, { translation: 'asc' }],
    });

    // Mapa composto: translation:chapter:verse -> text
    const lookupMap = new Map<string, string>();
    const baseVersesSet = new Set<number>();

    for (const row of rows) {
      const rowChapter = row.chapter ?? chapter;
      const key = `${row.translation}:${rowChapter}:${row.verse}`;
      lookupMap.set(key, row.text);
      if (row.translation === validBase && rowChapter === chapter) {
        if (!verse || row.verse === verse) {
          baseVersesSet.add(row.verse);
        }
      }
    }

    const sortedVerseNums = Array.from(baseVersesSet).sort((a, b) => a - b);
    const versesResult: VerseVariantComparison[] = [];
    const similaritySums: Record<string, number> = {};
    const countSums: Record<string, number> = {};

    for (const t of targetTranslationsOnly) {
      similaritySums[t] = 0;
      countSums[t] = 0;
    }

    for (const vNum of sortedVerseNums) {
      const baseKey = `${validBase}:${chapter}:${vNum}`;
      const baseText = lookupMap.get(baseKey) || '';

      const targetComparisons: Record<
        string,
        {
          text: string;
          language: string;
          isSameLanguage: boolean;
          diff?: TextDiffResult | null;
          note?: string | null;
        }
      > = {};

      for (const targetTrans of targetTranslationsOnly) {
        // Alinha a referência da tradução alvo segundo o esquema de versificação
        const mapped = mapTranslationRef(
          { bookId, chapter, verse: vNum },
          validBase,
          targetTrans,
        );
        const targetKey = `${targetTrans}:${mapped.chapter}:${mapped.verse}`;
        const targetText = lookupMap.get(targetKey) || '';
        const targetLang = TRANSLATION_LANGUAGES[targetTrans] || 'unknown';
        const isSameLanguage = baseLang === targetLang;

        let diff: TextDiffResult | null = null;
        let note: string | null = null;

        if (isSameLanguage) {
          diff = computeWordDiff(baseText, targetText);
          if (targetText) {
            similaritySums[targetTrans] += diff.similarity;
            countSums[targetTrans] += 1;
          }
        } else {
          note = `Comparação textual (diff/similaridade) restrita a versões no mesmo idioma (${baseLang.toUpperCase()} ≠ ${targetLang.toUpperCase()}). Textos exibidos lado a lado para análise sinótica.`;
        }

        if (mapped.chapter !== chapter || mapped.verse !== vNum) {
          const versificationNote = `[Versificação alinhada: ref original ${mapped.chapter}:${mapped.verse}]`;
          note = note ? `${note} ${versificationNote}` : versificationNote;
        }

        targetComparisons[targetTrans] = {
          text: targetText,
          language: targetLang,
          isSameLanguage,
          diff,
          note,
        };
      }

      versesResult.push({
        verse: vNum,
        base: {
          translation: validBase,
          text: baseText,
          language: baseLang,
        },
        targets: targetComparisons,
      });
    }

    // Calcula médias de similaridade léxica (apenas para versões no mesmo idioma)
    const metrics: Record<
      string,
      {
        averageSimilarity: number | null;
        totalVerses: number;
        isSameLanguage: boolean;
        note?: string;
      }
    > = {};

    for (const t of targetTranslationsOnly) {
      const targetLang = TRANSLATION_LANGUAGES[t] || 'unknown';
      const isSameLanguage = baseLang === targetLang;
      const total = countSums[t] || 0;
      const avg =
        isSameLanguage && total > 0
          ? Math.round(similaritySums[t] / total)
          : null;

      metrics[t] = {
        averageSimilarity: avg,
        totalVerses: total,
        isSameLanguage,
        note: isSameLanguage
          ? undefined
          : `Comparação percentual indisponível entre idiomas distintos (${baseLang.toUpperCase()} vs ${targetLang.toUpperCase()}).`,
      };
    }

    const bookName = BOOK_NAMES[bookId] || `Livro ${bookId}`;
    const displayRef = verse
      ? `${bookName} ${chapter}:${verse}`
      : `${bookName} ${chapter}`;

    return {
      reference: {
        bookId,
        chapter,
        verse: verse ?? null,
        display: displayRef,
      },
      baseTranslation: validBase,
      translations: allTranslations,
      metrics,
      verses: versesResult,
    };
  }
}
