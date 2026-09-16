import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

/**
 * Palavra do interlinear (STEP Bible TAGNT/TAHOT, CC BY 4.0).
 * Tipos locais em vez do client gerado — mesmo racional do ArchaeologyService:
 * o client Prisma é regenerado no build de CI/produção.
 */
export interface InterlinearWordRow {
  id: string;
  bookId: number;
  chapter: number;
  verse: number;
  position: number;
  word: string;
  translit: string;
  gloss: string;
  glossEs: string | null;
  strongId: string;
  morph: string | null;
  lemma: string | null;
  lemmaGloss: string | null;
}

interface InterlinearWhere {
  bookId?: number;
  chapter?: number;
  strongId?: string;
  word?: string;
}

interface InterlinearDelegate {
  findMany(args: {
    where?: InterlinearWhere;
    orderBy?: Array<Record<string, 'asc' | 'desc'>>;
    take?: number;
  }): Promise<InterlinearWordRow[]>;
  count(args: { where?: InterlinearWhere }): Promise<number>;
}

export interface LemmatizationResult {
  original: string;
  normalized: string;
  language: 'hebrew' | 'greek';
  found: boolean;
  lemma: string | null;
  morphology: string | null;
  strongId: string | null;
  translit: string | null;
  gloss: string | null;
  candidates: Array<{
    form: string;
    lemma: string | null;
    morphology: string | null;
    strongId: string;
    translit: string;
    gloss: string;
    bookId: number;
    chapter: number;
    verse: number;
  }>;
  source: string | null;
}

@Injectable()
export class LinguisticsService {
  private readonly logger = new Logger(LinguisticsService.name);

  constructor(private prisma: PrismaService) {}

  private get interlinear(): InterlinearDelegate {
    return (this.prisma as unknown as Record<string, InterlinearDelegate>)[
      'interlinearWord'
    ];
  }

  /** Normaliza Unicode sem destruir diacríticos de grego/hebraico. */
  private normalizeOriginalWord(word: string): string {
    return word
      .normalize('NFKC')
      .trim()
      .replace(/^[\s\p{P}\p{S}]+|[\s\p{P}\p{S}]+$/gu, '');
  }

  /**
   * Interlinear palavra-a-palavra de um capítulo, agrupado por versículo.
   * Dados reais TAGNT (grego NT); OT retorna vazio até o TAHOT ser ingerido.
   */
  async getInterlinearChapter(bookId: number, chapter: number) {
    const words = await this.interlinear.findMany({
      where: { bookId, chapter },
      orderBy: [{ verse: 'asc' }, { position: 'asc' }],
    });

    const verses: Record<number, InterlinearWordRow[]> = {};
    for (const w of words) {
      (verses[w.verse] ??= []).push(w);
    }
    const dataset = bookId < 40 ? 'TAHOT' : 'TAGNT';
    return {
      bookId,
      chapter,
      available: words.length > 0,
      source:
        words.length > 0
          ? `STEP Bible ${dataset} (Tyndale House, CC BY 4.0)`
          : null,
      verses,
    };
  }

  /**
   * Ocorrências reais de um Strong's no texto original (busca por raiz).
   */
  async getOccurrences(strongId: string, limit = 100) {
    const normalized = strongId.toUpperCase().trim();
    const [total, rows] = await Promise.all([
      this.interlinear.count({ where: { strongId: normalized } }),
      this.interlinear.findMany({
        where: { strongId: normalized },
        orderBy: [{ bookId: 'asc' }, { chapter: 'asc' }, { verse: 'asc' }],
        take: Math.min(limit, 200),
      }),
    ]);
    return {
      strongId: normalized,
      total,
      occurrences: rows.map((r) => ({
        bookId: r.bookId,
        chapter: r.chapter,
        verse: r.verse,
        word: r.word,
        translit: r.translit,
        gloss: r.gloss,
        morph: r.morph,
      })),
    };
  }

  /**
   * Busca a análise morfológica e lexical de uma raiz específica.
   * Suporta Hebrew (Strong's H) e Greek (Strong's G).
   */
  async getRootAnalysis(strongId: string) {
    const normalized = strongId.toUpperCase().trim();
    this.logger.log(`Analisando raiz lexical para: ${normalized}`);

    const entry = await this.prisma.lexicalEntry.findFirst({
      where: { strongId: normalized },
    });

    if (entry) {
      return {
        ...entry,
        lemma: entry.word,
        source: 'Database (lexical entry)',
      };
    }

    return null;
  }

  /**
   * Encontra todas as ocorrências de uma raiz no texto bíblico.
   */
  async findOccurrencesByRoot(strongId: string, translation = 'BLIVRE') {
    const normalized = strongId.toUpperCase().trim();
    const words = await this.interlinear.findMany({
      where: { strongId: normalized },
      orderBy: [{ bookId: 'asc' }, { chapter: 'asc' }, { verse: 'asc' }],
      take: 50,
    });
    if (words.length === 0) return [];

    const refs = Array.from(
      new Map(
        words.map((w) => [
          `${w.bookId}:${w.chapter}:${w.verse}`,
          { bookId: w.bookId, chapter: w.chapter, verse: w.verse },
        ]),
      ).values(),
    );
    const verses = await this.prisma.bibleVerse.findMany({
      where: { translation: translation.toUpperCase().trim(), OR: refs },
    });
    const textByRef = new Map(
      verses.map((v) => [`${v.bookId}:${v.chapter}:${v.verse}`, v.text]),
    );

    return words.map((w) => ({
      reference: `${w.bookId} ${w.chapter}:${w.verse}`,
      bookId: w.bookId,
      chapter: w.chapter,
      verse: w.verse,
      word: w.word,
      translit: w.translit,
      gloss: w.gloss,
      morph: w.morph,
      text: textByRef.get(`${w.bookId}:${w.chapter}:${w.verse}`) ?? null,
    }));
  }

  /**
   * Deterministic form-to-lemma lookup over the actual interlinear corpus.
   * This intentionally does not invent a lemma with an LLM. It returns only
   * analyses present in the indexed source data, preserving academic
   * provenance and making ambiguity visible to the caller.
   */
  async lemmatize(
    word: string,
    language: 'hebrew' | 'greek',
  ): Promise<LemmatizationResult> {
    const original = String(word ?? '');
    const normalized = this.normalizeOriginalWord(original);
    const prefix = language === 'greek' ? 'G' : 'H';

    if (!normalized) {
      return {
        original,
        normalized,
        language,
        found: false,
        lemma: null,
        morphology: null,
        strongId: null,
        translit: null,
        gloss: null,
        candidates: [],
        source: null,
      };
    }

    const rows = await this.interlinear.findMany({
      where: { word: normalized },
      orderBy: [{ strongId: 'asc' }, { bookId: 'asc' }, { chapter: 'asc' }, { verse: 'asc' }],
      take: 100,
    });

    const languageRows = rows.filter((row) =>
      row.strongId.toUpperCase().startsWith(prefix),
    );

    const candidates = languageRows.map((row) => ({
      form: row.word,
      lemma: row.lemma,
      morphology: row.morph,
      strongId: row.strongId,
      translit: row.translit,
      gloss: row.gloss,
      bookId: row.bookId,
      chapter: row.chapter,
      verse: row.verse,
    }));

    const first = candidates[0];
    return {
      original,
      normalized,
      language,
      found: candidates.length > 0,
      lemma: first?.lemma ?? null,
      morphology: first?.morphology ?? null,
      strongId: first?.strongId ?? null,
      translit: first?.translit ?? null,
      gloss: first?.gloss ?? null,
      candidates,
      source: candidates.length > 0 ? 'STEP Bible TAGNT/TAHOT indexed corpus' : null,
    };
  }
}
