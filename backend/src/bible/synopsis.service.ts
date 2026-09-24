import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  GOSPEL_PERICOPES,
  PericopeDefinition,
  ParallelType,
  SynopsisSection,
  SYNOPSIS_SECTION_TITLES,
} from './synopsis-catalog';
import { computeWordDiff, TextDiffResult } from './text-diff';

export type GospelKey = 'matthew' | 'mark' | 'luke' | 'john';

export interface GospelColumnData {
  bookId: number;
  bookName: string;
  referenceDisplay: string;
  wordCount: number;
  verses: Array<{ verse: number; text: string }>;
  fullText: string;
  diffWithBase?: TextDiffResult;
}

export interface SynopsisAgreementPair {
  gospelA: GospelKey;
  gospelB: GospelKey;
  labelA: string;
  labelB: string;
  similarity: number;
}

export interface GospelSynopsisDetailResponse {
  pericope: PericopeDefinition;
  translation: string;
  baseGospel: GospelKey;
  availableTranslations: string[];
  gospels: {
    matthew?: GospelColumnData;
    mark?: GospelColumnData;
    luke?: GospelColumnData;
    john?: GospelColumnData;
  };
  agreementMatrix: SynopsisAgreementPair[];
}

const ALLOWED_TRANSLATIONS = new Set(['BLIVRE', 'NVA', 'KJV', 'WEB', 'TR']);

const GOSPEL_META: Record<
  GospelKey,
  { bookId: number; name: string; shortName: string }
> = {
  matthew: { bookId: 40, name: 'Mateus', shortName: 'Mt' },
  mark: { bookId: 41, name: 'Marcos', shortName: 'Mc' },
  luke: { bookId: 42, name: 'Lucas', shortName: 'Lc' },
  john: { bookId: 43, name: 'João', shortName: 'Jo' },
};

@Injectable()
export class SynopsisService {
  private readonly logger = new Logger(SynopsisService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retorna a lista de perícopas catalogadas com suporte a filtros e busca.
   */
  listPericopes(options?: {
    section?: string;
    search?: string;
    parallelType?: string;
  }): Array<
    PericopeDefinition & {
      participatingGospels: GospelKey[];
    }
  > {
    let result = GOSPEL_PERICOPES;

    if (options?.section) {
      result = result.filter((p) => p.section === options.section);
    }

    if (options?.parallelType) {
      result = result.filter((p) => p.parallelType === options.parallelType);
    }

    if (options?.search) {
      const q = options.search.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          Object.values(p.passages).some((pass) =>
            pass?.display.toLowerCase().includes(q),
          ),
      );
    }

    return result.map((p) => {
      const participating: GospelKey[] = [];
      if (p.passages.matthew) participating.push('matthew');
      if (p.passages.mark) participating.push('mark');
      if (p.passages.luke) participating.push('luke');
      if (p.passages.john) participating.push('john');

      return {
        ...p,
        participatingGospels: participating,
      };
    });
  }

  /**
   * Retorna as seções catalogadas da vida de Cristo.
   */
  getSections(): Array<{ key: SynopsisSection; title: string }> {
    return (Object.keys(SYNOPSIS_SECTION_TITLES) as SynopsisSection[]).map(
      (key) => ({
        key,
        title: SYNOPSIS_SECTION_TITLES[key],
      }),
    );
  }

  /**
   * Encontra a perícopa sinótica correspondente a uma referência bíblica (livro, capítulo, versículo).
   */
  findPericopeByReference(
    bookId: number,
    chapter: number,
    verse?: number,
  ): PericopeDefinition | null {
    if (bookId < 40 || bookId > 43) {
      return null;
    }

    const gospelKey =
      bookId === 40
        ? 'matthew'
        : bookId === 41
          ? 'mark'
          : bookId === 42
            ? 'luke'
            : 'john';

    for (const pericope of GOSPEL_PERICOPES) {
      const passage = pericope.passages[gospelKey];
      if (passage && passage.chapter === chapter) {
        if (!verse) {
          return pericope;
        }
        if (verse >= passage.startVerse && verse <= passage.endVerse) {
          return pericope;
        }
      }
    }

    return null;
  }

  /**
   * Obtém os versículos sinóticos em paralelo, executa o diff léxico e computa a matriz de concordância.
   */
  async getSynopsis(
    pericopeId: string,
    translation = 'BLIVRE',
    requestedBase: GospelKey = 'mark',
  ): Promise<GospelSynopsisDetailResponse> {
    const pericope = GOSPEL_PERICOPES.find((p) => p.id === pericopeId);
    if (!pericope) {
      throw new NotFoundException(`Perícopa '${pericopeId}' não encontrada.`);
    }

    const cleanTranslation = (translation || 'BLIVRE').toUpperCase().trim();
    const validTranslation = ALLOWED_TRANSLATIONS.has(cleanTranslation)
      ? cleanTranslation
      : 'BLIVRE';

    const gospelKeys: GospelKey[] = ['matthew', 'mark', 'luke', 'john'];
    const columns: Partial<Record<GospelKey, GospelColumnData>> = {};

    // 1. Carrega os versículos de cada evangelho presente no banco de dados
    for (const key of gospelKeys) {
      const passageRef = pericope.passages[key];
      if (!passageRef) continue;

      const rows = await this.prisma.bibleVerse.findMany({
        where: {
          translation: validTranslation,
          bookId: passageRef.bookId,
          chapter: passageRef.chapter,
          verse: {
            gte: passageRef.startVerse,
            lte: passageRef.endVerse,
          },
        },
        orderBy: { verse: 'asc' },
        select: { verse: true, text: true },
      });

      const fullText = rows.map((r) => r.text).join(' ');
      const words = fullText.trim().split(/\s+/).filter(Boolean);

      columns[key] = {
        bookId: passageRef.bookId,
        bookName: GOSPEL_META[key].name,
        referenceDisplay: passageRef.display,
        wordCount: words.length,
        verses: rows,
        fullText,
      };
    }

    // 2. Determina o Evangelho Base efetivo
    const presentKeys = gospelKeys.filter((k) => !!columns[k]);
    let activeBase = requestedBase;
    if (!columns[activeBase]) {
      // Prioridade Marcaniana padrão ou primeiro disponível
      activeBase = columns.mark ? 'mark' : presentKeys[0] || 'matthew';
    }

    const baseColumn = columns[activeBase];
    const baseText = baseColumn ? baseColumn.fullText : '';

    // 3. Executa diff LCS em relação ao Evangelho Base
    for (const key of presentKeys) {
      const col = columns[key]!;
      if (key === activeBase) {
        col.diffWithBase = {
          similarity: 100,
          tokens: col.fullText
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .map((w) => ({ type: 'equal', text: w })),
          addedCount: 0,
          removedCount: 0,
          equalCount: col.wordCount,
        };
      } else {
        col.diffWithBase = computeWordDiff(baseText, col.fullText);
      }
    }

    // 4. Computa a Matriz de Concordância Léxica entre todos os pares presentes
    const agreementMatrix: SynopsisAgreementPair[] = [];
    for (let i = 0; i < presentKeys.length; i++) {
      for (let j = i + 1; j < presentKeys.length; j++) {
        const keyA = presentKeys[i];
        const keyB = presentKeys[j];
        const textA = columns[keyA]?.fullText || '';
        const textB = columns[keyB]?.fullText || '';

        const pairDiff = computeWordDiff(textA, textB);
        agreementMatrix.push({
          gospelA: keyA,
          gospelB: keyB,
          labelA: GOSPEL_META[keyA].shortName,
          labelB: GOSPEL_META[keyB].shortName,
          similarity: pairDiff.similarity,
        });
      }
    }

    return {
      pericope,
      translation: validTranslation,
      baseGospel: activeBase,
      availableTranslations: Array.from(ALLOWED_TRANSLATIONS),
      gospels: columns,
      agreementMatrix,
    };
  }
}
