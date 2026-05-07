import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class LinguisticsService {
  private readonly logger = new Logger(LinguisticsService.name);

  constructor(private prisma: PrismaService) {}

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
