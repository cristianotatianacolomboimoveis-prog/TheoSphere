import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { LruCache } from '../common/lru-cache';
import { BOOK_ID_TO_NAME_PT, getCanonicalDivision } from '../common/book-map';

export interface WordStudyCanonicalGroup {
  name: string;
  count: number;
  percentage: number;
}

export interface WordStudyBookDistribution {
  bookId: number;
  bookName: string;
  count: number;
}

export interface WordStudyInflectedForm {
  word: string;
  translit: string;
  morph: string | null;
  gloss: string;
  count: number;
  sampleRef: string;
}

export interface WordStudyData {
  strongId: string;
  lemma: string | null;
  translit: string | null;
  totalOccurrences: number;
  canonicalDistribution: WordStudyCanonicalGroup[];
  bookDistribution: WordStudyBookDistribution[];
  inflectedForms: WordStudyInflectedForm[];
  lexical: Record<string, unknown> | null;
}

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
  private readonly interlinearChapterCache = new LruCache<
    string,
    {
      bookId: number;
      chapter: number;
      available: boolean;
      source: string | null;
      verses: Record<number, InterlinearWordRow[]>;
    }
  >({
    maxSize: 150,
    ttlMs: 1000 * 60 * 60, // 1 hora
  });

  private readonly occurrencesCache = new LruCache<
    string,
    {
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
    }
  >({
    maxSize: 500,
    ttlMs: 1000 * 60 * 60, // 1 hora
  });

  private readonly rootAnalysisCache = new LruCache<
    string,
    Record<string, unknown> | null
  >({
    maxSize: 1000,
    ttlMs: 1000 * 60 * 60 * 2, // 2 horas
  });

  private readonly wordStudyCache = new LruCache<string, WordStudyData>({
    maxSize: 500,
    ttlMs: 1000 * 60 * 60 * 2, // 2 horas
  });

  constructor(private prisma: PrismaService) {}

  getCacheStats() {
    return {
      interlinearChapters: this.interlinearChapterCache.stats,
      occurrences: this.occurrencesCache.stats,
      rootAnalysis: this.rootAnalysisCache.stats,
      wordStudies: this.wordStudyCache.stats,
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
      orderBy: [
        { strongId: 'asc' },
        { bookId: 'asc' },
        { chapter: 'asc' },
        { verse: 'asc' },
      ],
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
      source:
        candidates.length > 0 ? 'STEP Bible TAGNT/TAHOT indexed corpus' : null,
    };
  }

  /**
   * Estudo aprofundado de palavra original (padrão Logos Bible Software):
   * - Distribuição canônica por agrupamento bíblico
   * - Ocorrências detalhadas por livro
   * - Agrupamento e contagem de formas flexionadas encontradas
   * - Conexão lexical (Strong / BDAG / HALOT)
   */
  async getWordStudyDetails(strongId: string): Promise<WordStudyData> {
    const normalized = strongId.toUpperCase().trim();
    const cached = this.wordStudyCache.get(normalized);
    if (cached) return cached;

    const [rows, lexical] = await Promise.all([
      this.interlinear.findMany({
        where: { strongId: normalized },
        orderBy: [{ bookId: 'asc' }, { chapter: 'asc' }, { verse: 'asc' }],
      }),
      this.getRootAnalysis(normalized),
    ]);

    const totalOccurrences = rows.length;
    const bookCountMap = new Map<number, number>();
    const formMap = new Map<
      string,
      {
        translit: string;
        morph: string | null;
        gloss: string;
        count: number;
        sampleRef: string;
      }
    >();
    const canonicalCountMap = new Map<string, number>();

    let detectedLemma = rows[0]?.lemma ?? null;
    let detectedTranslit = rows[0]?.translit ?? null;

    for (const r of rows) {
      if (!detectedLemma && r.lemma) detectedLemma = r.lemma;
      if (!detectedTranslit && r.translit) detectedTranslit = r.translit;

      // Distribuição por livro
      bookCountMap.set(r.bookId, (bookCountMap.get(r.bookId) || 0) + 1);

      // Agrupamento canônico
      const group = getCanonicalDivision(r.bookId);
      canonicalCountMap.set(group, (canonicalCountMap.get(group) || 0) + 1);

      // Agrupamento por forma flexionada
      const existing = formMap.get(r.word);
      if (!existing) {
        const bookName = BOOK_ID_TO_NAME_PT[r.bookId] || `Livro ${r.bookId}`;
        formMap.set(r.word, {
          translit: r.translit,
          morph: r.morph,
          gloss: r.gloss,
          count: 1,
          sampleRef: `${bookName} ${r.chapter}:${r.verse}`,
        });
      } else {
        existing.count += 1;
      }
    }

    const CANONICAL_ORDER = [
      'Pentateuco',
      'Históricos (AT)',
      'Poéticos & Sabedoria',
      'Profetas Maiores',
      'Profetas Menores',
      'Evangelhos',
      'Atos dos Apóstolos',
      'Epístolas Paulinas',
      'Epístolas Gerais',
      'Apocalipse',
    ];

    const canonicalDistribution: WordStudyCanonicalGroup[] =
      CANONICAL_ORDER.filter((name) => canonicalCountMap.has(name)).map(
        (name) => {
          const count = canonicalCountMap.get(name) || 0;
          const percentage =
            totalOccurrences > 0
              ? Math.round((count / totalOccurrences) * 1000) / 10
              : 0;
          return { name, count, percentage };
        },
      );

    const bookDistribution: WordStudyBookDistribution[] = Array.from(
      bookCountMap.entries(),
    )
      .sort(([a], [b]) => a - b)
      .map(([bookId, count]) => ({
        bookId,
        bookName: BOOK_ID_TO_NAME_PT[bookId] || `Livro ${bookId}`,
        count,
      }));

    const inflectedForms: WordStudyInflectedForm[] = Array.from(
      formMap.entries(),
    )
      .sort(([, a], [, b]) => b.count - a.count)
      .map(([word, item]) => ({
        word,
        translit: item.translit,
        morph: item.morph,
        gloss: item.gloss,
        count: item.count,
        sampleRef: item.sampleRef,
      }));

    const result: WordStudyData = {
      strongId: normalized,
      lemma: detectedLemma || ((lexical as any)?.word ?? null),
      translit: detectedTranslit,
      totalOccurrences,
      canonicalDistribution,
      bookDistribution,
      inflectedForms,
      lexical: (lexical as Record<string, unknown> | null) ?? null,
    };

    this.wordStudyCache.set(normalized, result);
    return result;
  }
}
