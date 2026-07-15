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
   */
  async findOccurrencesByRoot(strongId: string) {
    this.logger.log(`Buscando todas as ocorrências da raiz: ${strongId}`);

    // Busca versículos que mencionam este Strong ID em seus metadados ou interlinear
    // No schema atual, assumimos que as palavras estão indexadas ou buscamos via texto
    const verses = await this.prisma.bibleVerse.findMany({
      where: {
        text: { contains: strongId }, // Fallback de busca textual para Strong IDs se indexados no texto
      },
      take: 50, // Limite para performance PhD
      orderBy: { id: 'asc' },
    });

    return verses.map((v) => ({
      reference: `${v.bookId} ${v.chapter}:${v.verse}`,
      text: v.text,
      bookId: v.bookId,
      chapter: v.chapter,
      verse: v.verse,
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
