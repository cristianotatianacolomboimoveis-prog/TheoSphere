import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { computeWordDiff, TextDiffResult } from './text-diff';

export interface VerseVariantComparison {
  verse: number;
  base: {
    translation: string;
    text: string;
  };
  targets: Record<
    string,
    {
      text: string;
      diff: TextDiffResult;
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
      averageSimilarity: number;
      totalVerses: number;
    }
  >;
  verses: VerseVariantComparison[];
}

const ALLOWED_TRANSLATIONS = new Set([
  'BLIVRE',
  'NVA',
  'KJV',
  'WEB',
  'TR',
  'WLC',
  'LXX',
]);

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

    // Consulta os versículos no banco de dados Supabase
    const whereClause: any = {
      translation: { in: allTranslations },
      bookId,
      chapter,
    };
    if (verse) {
      whereClause.verse = verse;
    }

    const rows = await this.prisma.bibleVerse.findMany({
      where: whereClause,
      select: {
        verse: true,
        text: true,
        translation: true,
      },
      orderBy: [{ verse: 'asc' }, { translation: 'asc' }],
    });

    // Agrupa por número de versículo
    const verseMap = new Map<number, Record<string, string>>();
    for (const row of rows) {
      if (!verseMap.has(row.verse)) {
        verseMap.set(row.verse, {});
      }
      verseMap.get(row.verse)![row.translation] = row.text;
    }

    const sortedVerseNums = Array.from(verseMap.keys()).sort((a, b) => a - b);
    const versesResult: VerseVariantComparison[] = [];
    const similaritySums: Record<string, number> = {};
    const countSums: Record<string, number> = {};

    for (const t of targetTranslationsOnly) {
      similaritySums[t] = 0;
      countSums[t] = 0;
    }

    for (const vNum of sortedVerseNums) {
      const translationsForVerse = verseMap.get(vNum)!;
      const baseText = translationsForVerse[validBase] || '';

      const targetComparisons: Record<
        string,
        { text: string; diff: TextDiffResult }
      > = {};

      for (const targetTrans of targetTranslationsOnly) {
        const targetText = translationsForVerse[targetTrans] || '';
        const diff = computeWordDiff(baseText, targetText);

        targetComparisons[targetTrans] = {
          text: targetText,
          diff,
        };

        if (targetText) {
          similaritySums[targetTrans] += diff.similarity;
          countSums[targetTrans] += 1;
        }
      }

      versesResult.push({
        verse: vNum,
        base: {
          translation: validBase,
          text: baseText,
        },
        targets: targetComparisons,
      });
    }

    // Calcula médias de similaridade léxica
    const metrics: Record<
      string,
      { averageSimilarity: number; totalVerses: number }
    > = {};

    for (const t of targetTranslationsOnly) {
      const total = countSums[t] || 0;
      const avg = total > 0 ? Math.round(similaritySums[t] / total) : 0;
      metrics[t] = {
        averageSimilarity: avg,
        totalVerses: total,
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
