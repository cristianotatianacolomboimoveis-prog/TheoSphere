import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { LruCache } from '../common/lru-cache';

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

  // ── L1 In-Memory Caches (latência < 2ms para lemas e capítulos frequentes) ──
  private readonly interlinearChapterCache = new LruCache<string, {
    bookId: number;
    chapter: number;
    available: boolean;
    source: string | null;
    verses: Record<number, InterlinearWordRow[]>;
  }>({
    maxSize: 150,
    ttlMs: 1000 * 60 * 60, // 1 hora
  });

  private readonly occurrencesCache = new LruCache<string, {
    strongId: string;
    total: number;
    occurrences: Array<{
      bookId: number;
      chapter: number;
      verse: number;
      word: string;
      translit: string;
      gloss: string;
      morph: string | null;
    }>;
  }>({
    maxSize: 500,
    ttlMs: 1000 * 60 * 60, // 1 hora
  });

  private readonly rootAnalysisCache = new LruCache<string, Record<string, unknown> | null>({
    maxSize: 1000,
    ttlMs: 1000 * 60 * 60 * 2, // 2 horas
  });

  constructor(private prisma: PrismaService) {}

  getCacheStats() {
    return {
      interlinearChapters: this.interlinearChapterCache.stats,
      occurrences: this.occurrencesCache.stats,
      rootAnalysis: this.rootAnalysisCache.stats,
    };
  }

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
    const cacheKey = `${bookId}:${chapter}`;
    const cached = this.interlinearChapterCache.get(cacheKey);
    if (cached) return cached;

    const words = await this.interlinear.findMany({
      where: { bookId, chapter },
      orderBy: [{ verse: 'asc' }, { position: 'asc' }],
    });

    const verses: Record<number, InterlinearWordRow[]> = {};
    for (const w of words) {
      (verses[w.verse] ??= []).push(w);
    }
    const dataset = bookId < 40 ? 'TAHOT' : 'TAGNT';
    const result = {
      bookId,
      chapter,
      available: words.length > 0,
      source:
        words.length > 0
          ? `STEP Bible ${dataset} (Tyndale House, CC BY 4.0)`
          : null,
      verses,
    };

    this.interlinearChapterCache.set(cacheKey, result);
    return result;
  }

  /**
   * Ocorrências reais de um Strong's no texto original (busca por raiz).
   */
  async getOccurrences(strongId: string, limit = 100) {
    const normalized = strongId.toUpperCase().trim();
    const cacheKey = `${normalized}:${limit}`;
    const cached = this.occurrencesCache.get(cacheKey);
    if (cached) return cached;

    const [total, rows] = await Promise.all([
      this.interlinear.count({ where: { strongId: normalized } }),
      this.interlinear.findMany({
        where: { strongId: normalized },
        orderBy: [{ bookId: 'asc' }, { chapter: 'asc' }, { verse: 'asc' }],
        take: Math.min(limit, 200),
      }),
    ]);
    const result = {
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

    this.occurrencesCache.set(cacheKey, result);
    return result;
  }

  /**
   * Busca a análise morfológica e lexical de uma raiz específica.
   * Suporta Hebrew (Strong's H) e Greek (Strong's G).
   */
  async getRootAnalysis(strongId: string) {
    const normalized = strongId.toUpperCase().trim();
    if (this.rootAnalysisCache.has(normalized)) {
      return this.rootAnalysisCache.get(normalized);
    }

    this.logger.log(`Analisando raiz lexical para: ${normalized}`);

    const entry = await this.prisma.lexicalEntry.findFirst({
      where: { strongId: normalized },
    });

    if (entry) {
      const result = {
        ...entry,
        lemma: entry.word,
        source: 'Database (lexical entry)',
      };
      this.rootAnalysisCache.set(normalized, result);
      return result;
    }

    this.rootAnalysisCache.set(normalized, null);
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
