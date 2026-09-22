import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SearchService } from '../search/search.service';
import { EmbeddingService } from './embedding.service';
import { UserContextService } from './user-context.service';
import { TheologicalSourcesService } from './theological-sources.service';
import { RerankerService } from './reranker.service';
import { CLASSIC_COMMENTARIES } from './classic-commentaries';

export interface RagSource {
  type:
    | 'bible'
    | 'theology'
    | 'lexicon'
    | 'commentary'
    | 'classic'
    | 'personal'
    | 'sefaria';
  title: string;
  reference?: string;
  snippet: string;
  score?: number;
}

@Injectable()
export class RagContextBuilderService {
  private readonly logger = new Logger(RagContextBuilderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly search: SearchService,
    private readonly embeddingService: EmbeddingService,
    private readonly userContext: UserContextService,
    private readonly theologicalSources: TheologicalSourcesService,
    private readonly reranker: RerankerService,
  ) {}

  private get LIBRARY_DIRECT_THRESHOLD(): number {
    const v = Number(process.env.LIBRARY_DIRECT_THRESHOLD ?? 0.79);
    return Number.isFinite(v) && v > 0 && v <= 1 ? v : 0.79;
  }

  private get LIBRARY_DIRECT_MIN_HITS(): number {
    const v = Number(process.env.LIBRARY_DIRECT_MIN_HITS ?? 3);
    return Number.isFinite(v) && v >= 1 ? Math.floor(v) : 3;
  }

  /**
   * Monta uma resposta usando SOMENTE os trechos da biblioteca do usuário,
   * sem chamar a IA. Devolve null quando o acervo não tem nada suficientemente relevante.
   */
  async tentarRespostaDaBiblioteca(
    query: string,
    userId: string | undefined,
  ): Promise<{ content: string; sources: RagSource[] } | null> {
    const hits = await this.userContext.searchDriveLibrary(query, userId);
    const relevantes = hits.filter(
      (h) => h.similarity >= this.LIBRARY_DIRECT_THRESHOLD,
    );

    if (relevantes.length < this.LIBRARY_DIRECT_MIN_HITS) return null;

    const sources: RagSource[] = relevantes.map((h) => ({
      type: 'classic',
      title: h.title,
      snippet: h.content.slice(0, 150),
      score: h.similarity,
    }));

    const corpo = relevantes
      .slice(0, 5)
      .map(
        (h, i) =>
          `**${i + 1}. ${h.title}** _(relevância ${(h.similarity * 100).toFixed(0)}%)_\n\n> ${h.content.trim().replace(/\n+/g, '\n> ')}`,
      )
      .join('\n\n');

    const content = [
      '**Da sua biblioteca**',
      '',
      `Encontrei ${relevantes.length} trecho(s) do seu acervo que respondem diretamente a esta pergunta:`,
      '',
      corpo,
      '',
      '_Estes são excertos literais das suas obras, sem interpretação da IA. Para uma síntese redigida, refaça a pergunta pedindo uma análise._',
    ].join('\n');

    this.logger.log(
      `[RAG] Respondido pela biblioteca (${relevantes.length} trechos) — nenhuma chamada de IA.`,
    );

    return { content, sources };
  }

  /**
   * Monta o bloco de contexto prioritário da Biblioteca RAG do Drive.
   */
  async buildDriveLibraryContext(
    query: string,
    userId: string | undefined,
    sources: RagSource[],
  ): Promise<string> {
    const hits = await this.userContext.searchDriveLibrary(query, userId);
    if (hits.length === 0) return '';

    for (const h of hits) {
      sources.push({
        type: 'classic',
        title: h.title,
        snippet: h.content.slice(0, 150),
        score: h.similarity,
      });
    }

    return [
      '=== BIBLIOTECA RAG (GOOGLE DRIVE) — FONTE PRIORITÁRIA ===',
      ...hits.map(
        (h) =>
          `[Obra: ${h.title} | relevância: ${(h.similarity * 100).toFixed(0)}%]\n${h.content}`,
      ),
      '=== FIM DA BIBLIOTECA ===',
    ].join('\n\n');
  }

  /**
   * Monta o bloco SECUNDÁRIO de respostas validadas por humanos (👍).
   */
  async buildValidatedQaContext(
    query: string,
    sources: RagSource[],
  ): Promise<string> {
    const hits = await this.userContext.searchValidatedQa(query);
    if (hits.length === 0) return '';

    for (const h of hits) {
      sources.push({
        type: 'theology',
        title: 'TheoAI — Resposta validada',
        reference: h.question.slice(0, 80),
        snippet: h.answer.slice(0, 150),
        score: h.similarity,
      });
    }

    return [
      '=== RESPOSTAS ANTERIORES VALIDADAS DO THEOAI (CONTEXTO SECUNDÁRIO) ===',
      'Material auxiliar validado por usuários. NUNCA sobrepõe a Biblioteca do Drive nem as fontes acadêmicas; use apenas como apoio de consistência.',
      ...hits.map(
        (h) =>
          `[Pergunta anterior: "${h.question}" | relevância: ${(h.similarity * 100).toFixed(0)}%]\n${h.answer}`,
      ),
      '=== FIM DAS RESPOSTAS VALIDADAS ===',
    ].join('\n\n');
  }

  /**
   * Busca contexto teológico e coleta fontes para atribuição.
   */
  async getTheologicalContextWithSources(
    query: string,
    tradition: string | undefined,
    sources: RagSource[],
  ): Promise<string> {
    const queryEmbedding = await this.embeddingService.createEmbedding(query);

    try {
      let docs: any[];

      if (tradition) {
        docs = await this.prisma.$queryRaw`
          SELECT content, tradition,
                 1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
          FROM "TheologyEmbedding"
          WHERE tradition = ${tradition}
          ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
          LIMIT 12;
        `;
      } else {
        docs = await this.prisma.$queryRaw`
          SELECT content, tradition,
                 1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
          FROM "TheologyEmbedding"
          ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
          LIMIT 15;
        `;
      }

      const topDocs = await this.rerankContext(query, docs, 4);

      if (!topDocs || topDocs.length === 0) {
        return this.getFallbackCommentaryContextWithSources(query, sources);
      }

      for (const d of topDocs) {
        sources.push({
          type: 'theology',
          title: `Base Teológica (${d.tradition || 'Geral'})`,
          snippet: (d.content || '').slice(0, 150),
          score: d.similarity ? Number(d.similarity) : undefined,
        });
      }

      return [
        '=== BASE DE CONHECIMENTO TEOLÓGICO ===',
        ...topDocs.map(
          (d: any) =>
            `[${d.tradition}] (relevância: ${(d.similarity * 100).toFixed(0)}%)\n${d.content}`,
        ),
        '=== FIM DA BASE DE CONHECIMENTO ===',
      ].join('\n\n');
    } catch (err: any) {
      this.logger.debug(
        `[RAG] Vector search failed: ${err.message} — using classic commentary fallback`,
      );
      return this.getFallbackCommentaryContextWithSources(query, sources);
    }
  }

  /**
   * Busca versículos bíblicos e coleta fontes para atribuição.
   */
  async getBibleContextWithSources(
    query: string,
    sources: RagSource[],
  ): Promise<string> {
    try {
      const hits = await this.search.hybridSearchVerses(query, { limit: 10 });
      const topHits = await this.rerankContext(query, hits, 4);

      if (topHits.length === 0) return '';

      for (const h of topHits) {
        sources.push({
          type: 'bible',
          title: `${h.bookId} ${h.chapter}:${h.verse}`,
          reference: `${h.bookId} ${h.chapter}:${h.verse} (${h.translation})`,
          snippet: (h.text || '').slice(0, 150),
        });
      }

      return [
        '=== VERSÍCULOS BÍBLICOS RELEVANTES ===',
        ...topHits.map((h) => {
          const ranks: string[] = [];
          if (h.vectorRank !== null) ranks.push(`vec#${h.vectorRank}`);
          if (h.keywordRank !== null) ranks.push(`kw#${h.keywordRank}`);
          const meta = `[${h.translation}] ${h.bookId}:${h.chapter}:${h.verse} (${ranks.join(', ')})`;
          return `${meta}\n${h.text}`;
        }),
        '=== FIM DOS VERSÍCULOS ===',
      ].join('\n\n');
    } catch (err) {
      this.logger.error(
        `Bible hybrid search failed: ${(err as Error).message}`,
      );
      return '';
    }
  }

  /**
   * Busca dados léxicos e coleta fontes para atribuição.
   */
  async getLexicalContextWithSources(
    query: string,
    sources: RagSource[],
  ): Promise<string> {
    try {
      const entries = await this.prisma.lexicalEntry.findMany({
        where: {
          OR: [
            { word: { contains: query, mode: 'insensitive' } },
            { definition: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 3,
      });

      if (entries.length === 0) return '';

      for (const e of entries) {
        sources.push({
          type: 'lexicon',
          title: `${e.word} (${e.strongId})`,
          reference: e.strongId,
          snippet: (e.definition || '').slice(0, 150),
        });
      }

      return [
        '=== DADOS LÉXICOS ACADÊMICOS ===',
        ...entries.map(
          (e) =>
            `[${e.strongId}] ${e.word}: ${e.definition} (Ref: ${e.academicRef})`,
        ),
        '=== FIM DOS DADOS LÉXICOS ===',
      ].join('\n');
    } catch {
      return '';
    }
  }

  /**
   * Busca comentários técnicos e coleta fontes para atribuição.
   */
  async getTechnicalCommentaryContextWithSources(
    query: string,
    sources: RagSource[],
  ): Promise<string> {
    try {
      const commentaries = await this.prisma.technicalCommentary.findMany({
        where: {
          content: { contains: query, mode: 'insensitive' },
        },
        take: 2,
      });

      if (commentaries.length === 0) return '';

      for (const c of commentaries) {
        sources.push({
          type: 'commentary',
          title: `${c.author} — ${c.source}`,
          snippet: (c.content || '').slice(0, 150),
        });
      }

      return [
        '=== COMENTÁRIOS TÉCNICOS/CRÍTICOS ===',
        ...commentaries.map((c) => `[${c.author} - ${c.source}] ${c.content}`),
        '=== FIM DOS COMENTÁRIOS ===',
      ].join('\n');
    } catch {
      return '';
    }
  }

  /**
   * Fallback de comentários clássicos com coleta de fontes.
   */
  getFallbackCommentaryContextWithSources(
    query: string,
    sources: RagSource[],
  ): string {
    const context = this.getFallbackCommentaryContext(query);

    const queryWords = query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3);

    if (queryWords.length > 0) {
      const scored = CLASSIC_COMMENTARIES.map((c) => {
        const haystack =
          `${c.reference} ${c.author} ${c.work} ${c.text} ${c.tradition} ${c.keywords?.join(' ') || ''}`.toLowerCase();
        let score = queryWords.reduce(
          (acc, word) => acc + (haystack.includes(word) ? 1 : 0),
          0,
        );
        const normalizedQuery = query
          .toLowerCase()
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '');
        const normalizedRef = c.reference
          .toLowerCase()
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '');
        if (normalizedQuery.includes(normalizedRef)) score += 15;
        return { entry: c, score };
      });

      const top = scored
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
      for (const s of top) {
        sources.push({
          type: 'classic',
          title: `${s.entry.author} — ${s.entry.work} (${s.entry.year})`,
          reference: s.entry.reference,
          snippet: s.entry.text.slice(0, 150),
          score: s.score,
        });
      }
    }

    return context;
  }

  /**
   * Contexto fallback baseado em keyword matching nos comentários clássicos.
   */
  getFallbackCommentaryContext(query: string): string {
    const queryWords = query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3);

    if (queryWords.length === 0) return '';

    const scored = CLASSIC_COMMENTARIES.map((c) => {
      const haystack =
        `${c.reference} ${c.author} ${c.work} ${c.text} ${c.tradition} ${c.keywords?.join(' ') || ''}`.toLowerCase();

      let score = queryWords.reduce(
        (acc, word) => acc + (haystack.includes(word) ? 1 : 0),
        0,
      );

      const normalizedQuery = query
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      const normalizedRef = c.reference
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

      if (normalizedQuery.includes(normalizedRef)) {
        score += 15;
      }

      return { entry: c, score };
    });

    const top = scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((s) => s.entry);

    if (top.length === 0) return '';

    return [
      '=== COMENTARISTAS CLÁSSICOS (FALLBACK) ===',
      ...top.map(
        (c) =>
          `[${c.author} — ${c.work}, ${c.year}] (${c.tradition})\nPassagem: ${c.reference}\n"${c.text}"`,
      ),
      '=== FIM DOS COMENTARISTAS CLÁSSICOS ===',
    ].join('\n\n');
  }

  /**
   * Remove fontes duplicadas (mesmo reference ou title) e ordena por score.
   */
  deduplicateSources(sources: RagSource[]): RagSource[] {
    const seen = new Set<string>();
    const unique: RagSource[] = [];

    const sorted = [...sources].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    for (const s of sorted) {
      const key = s.reference
        ? `${s.type}:${s.reference}`
        : `${s.type}:${s.title}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(s);
      }
    }

    return unique;
  }

  async rerankContext(
    query: string,
    documents: any[],
    limit: number,
  ): Promise<any[]> {
    if (!documents || documents.length === 0) return [];
    return this.reranker.rerank(query, documents, limit);
  }
}
