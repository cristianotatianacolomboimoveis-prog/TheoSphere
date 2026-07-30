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

interface InterlinearDelegate {
  findMany(args: {
    where?: { bookId?: number; chapter?: number; strongId?: string };
    orderBy?: Array<Record<string, 'asc' | 'desc'>>;
    take?: number;
  }): Promise<InterlinearWordRow[]>;
  count(args: { where?: { strongId?: string } }): Promise<number>;
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
    // Rótulo da fonte por testamento: TAHOT (AT hebraico) / TAGNT (NT grego)
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
   * Ocorrências reais de um Strong's no texto original (busca por raiz),
   * a partir da tabela interlinear.
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
    this.logger.log(`Analisando raiz lexical para: ${strongId}`);

    // Busca no banco de dados por entradas léxicas pré-existentes
    const entry = await this.prisma.lexicalEntry.findFirst({
      where: { strongId },
    });

    if (entry) {
      return {
        ...entry,
        lemma: entry.word,
        source: 'Database (BDAG/HALOT Cache)',
      };
    }

    // Se não houver no banco, poderíamos disparar uma análise via IA ou retornar null
    return null;
  }

  /**
   * Encontra todas as ocorrências de uma raiz no texto bíblico.
   * Essencial para a funcionalidade 'Search by Root' estilo Accordance.
   *
   * Reescrito na auditoria 2026-07-21: a versão anterior fazia
   * `text contains strongId` — um full scan em BibleVerse que era também
   * semanticamente errado (o texto dos versículos não contém Strong IDs).
   * Agora delega à tabela InterlinearWord (índice em strongId) e anexa o
   * texto do versículo na tradução pedida.
   */
  async findOccurrencesByRoot(strongId: string, translation = 'BLIVRE') {
    const normalized = strongId.toUpperCase().trim();
    const words = await this.interlinear.findMany({
      where: { strongId: normalized },
      orderBy: [{ bookId: 'asc' }, { chapter: 'asc' }, { verse: 'asc' }],
      take: 50,
    });
    if (words.length === 0) return [];

    // Uma query única para os textos (evita N+1): OR de refs distintas.
    const refs = Array.from(
      new Map(
        words.map((w) => [
          `${w.bookId}:${w.chapter}:${w.verse}`,
          { bookId: w.bookId, chapter: w.chapter, verse: w.verse },
        ]),
      ).values(),
    );
    const verses = await this.prisma.bibleVerse.findMany({
      where: { translation, OR: refs },
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
   * Realiza o parsing de uma forma flexionada para encontrar sua raiz (Lemmatization).
   */
  async lemmatize(word: string, language: 'hebrew' | 'greek') {
    // Implementação futura usando ferramentas como OpenGNT ou similar
    return {
      original: word,
      lemma: '',
      morphology: '',
    };
  }
}
