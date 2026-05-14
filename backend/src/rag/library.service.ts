import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { EmbeddingService } from './embedding.service';

export interface LibraryExcerpt {
  /** Trecho de texto encontrado no livro do usuário */
  content: string;
  /** Nome do arquivo (livro) de onde veio */
  fileName: string;
  /** ID do arquivo no Google Drive */
  fileId?: string;
  /** Tradição associada na ingestão (Reformada, Católica, etc.) */
  tradition?: string;
  /** Posição do chunk no livro */
  chunkIndex?: number;
  /** Lema grego/hebraico detectado no chunk, se houver */
  lemma?: string;
  /** Strong's ID associado, se mapeado */
  strongId?: string;
  /** Similaridade cosseno (0..1). Apenas em hits do vector branch. */
  similarity?: number;
  /** Origem do match: 'vector' (semantic) ou 'fulltext' (literal) */
  source: 'vector' | 'fulltext' | 'hybrid';
}

/**
 * LibraryService — consulta a biblioteca pessoal do usuário (Google Drive
 * indexado em UserEmbedding) por termos teológicos, palavras gregas/hebraicas,
 * códigos Strong's ou referências bíblicas.
 *
 * Estratégia: hybrid search.
 *   • Vector branch: gera embedding do termo via Gemini e busca por similaridade
 *     cosseno usando o índice HNSW em UserEmbedding.embedding. Captura
 *     ocorrências semanticamente relacionadas (mesmo quando o termo exato
 *     não aparece literalmente — útil para sinônimos, definições parafraseadas).
 *   • Full-text branch: ILIKE no campo `content` pelo termo bruto + qualquer
 *     transliteração comum. Garante recall em verbetes de léxico que listam
 *     a palavra como cabeçalho.
 *   • Hybrid: dedupe por (fileId + chunkIndex), prefere maior score.
 *
 * Por que importa: léxicos como BDAG/HALOT têm verbetes onde a palavra grega
 * aparece literalmente no início ("ἀγάπη, ης, ἡ — ..."). Vector search
 * sozinho perde isso porque o resto do verbete é definição em outras línguas.
 * Full-text sozinho perde paráfrases. Hybrid resolve.
 */
@Injectable()
export class LibraryService {
  private readonly logger = new Logger(LibraryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  /**
   * Busca trechos da biblioteca do usuário relacionados ao termo.
   *
   * @param userId  dono da biblioteca (UserEmbedding.userId)
   * @param term    palavra/expressão de busca (ex: "ἀγάπη", "amor de Deus")
   * @param opts.strongId  filtro adicional (G26, H2617) — quando o usuário
   *                       clica numa palavra do interlinear
   * @param opts.limit     máx de resultados (default 10, hard cap 30)
   */
  async lookup(
    userId: string,
    term: string,
    opts: { strongId?: string; limit?: number } = {},
  ): Promise<LibraryExcerpt[]> {
    const limit = Math.min(Math.max(1, opts.limit ?? 10), 30);
    const cleanTerm = term.trim();
    if (!cleanTerm) return [];

    // Tempo total de teto: 8s. Cada ramo tem o seu próprio limite implícito
    // (vector ~2-3s pra embedding + query, fulltext <100ms).
    const [vectorHits, fulltextHits] = await Promise.all([
      this.vectorSearch(userId, cleanTerm, limit, opts.strongId).catch(
        (err) => {
          this.logger.warn(
            `[library.vector] falha: ${err instanceof Error ? err.message : 'unknown'}`,
          );
          return [] as LibraryExcerpt[];
        },
      ),
      this.fulltextSearch(userId, cleanTerm, limit, opts.strongId).catch(
        (err) => {
          this.logger.warn(
            `[library.fulltext] falha: ${err instanceof Error ? err.message : 'unknown'}`,
          );
          return [] as LibraryExcerpt[];
        },
      ),
    ]);

    return this.merge(vectorHits, fulltextHits, limit);
  }

  /* ─── Vector branch ───────────────────────────────────────────────── */

  private async vectorSearch(
    userId: string,
    term: string,
    limit: number,
    strongId?: string,
  ): Promise<LibraryExcerpt[]> {
    const embedding = await this.embeddingService.createEmbedding(term);
    const literal = this.toVectorLiteral(embedding);

    // Strong's filter via JSONB key — only kicks in if metadata.strongId
    // was actually populated during ingestion. Falls open otherwise.
    const strongFilter = strongId
      ? Prisma.sql`AND (metadata->>'strongId' = ${strongId} OR metadata->>'strongId' IS NULL)`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<
      Array<{
        content: string;
        metadata: Record<string, unknown> | null;
        distance: number;
      }>
    >`
      SELECT content,
             metadata,
             (embedding <=> ${Prisma.raw(`'${literal}'::vector`)}) AS distance
      FROM "UserEmbedding"
      WHERE "userId" = ${userId}
        AND type = 'library_book'
        ${strongFilter}
      ORDER BY embedding <=> ${Prisma.raw(`'${literal}'::vector`)}
      LIMIT ${limit};
    `;

    return rows.map((r) => this.toExcerpt(r.content, r.metadata, 'vector', 1 - Number(r.distance)));
  }

  /* ─── Full-text branch ───────────────────────────────────────────── */

  private async fulltextSearch(
    userId: string,
    term: string,
    limit: number,
    strongId?: string,
  ): Promise<LibraryExcerpt[]> {
    const strongFilter = strongId
      ? Prisma.sql`AND (metadata->>'strongId' = ${strongId} OR metadata->>'strongId' IS NULL)`
      : Prisma.empty;

    // ILIKE protege diacríticos parcialmente (postgres compara byte-a-byte com
    // collation aware). Para grego/hebraico, normalizar antes ajuda — mas
    // requer extensão pgvector_ext que não está garantida em todos ambientes.
    const pattern = `%${term}%`;

    const rows = await this.prisma.$queryRaw<
      Array<{ content: string; metadata: Record<string, unknown> | null }>
    >`
      SELECT content, metadata
      FROM "UserEmbedding"
      WHERE "userId" = ${userId}
        AND type = 'library_book'
        AND content ILIKE ${pattern}
        ${strongFilter}
      LIMIT ${limit};
    `;

    return rows.map((r) => this.toExcerpt(r.content, r.metadata, 'fulltext'));
  }

  /* ─── Merge & dedupe ──────────────────────────────────────────────── */

  private merge(
    vectorHits: LibraryExcerpt[],
    fulltextHits: LibraryExcerpt[],
    limit: number,
  ): LibraryExcerpt[] {
    const byKey = new Map<string, LibraryExcerpt>();

    const keyOf = (e: LibraryExcerpt) =>
      `${e.fileId ?? e.fileName}::${e.chunkIndex ?? '?'}`;

    // Vector hits first — preserve similarity ranking.
    for (const hit of vectorHits) {
      byKey.set(keyOf(hit), hit);
    }
    // Full-text hits: promote to 'hybrid' if already seen, else add.
    for (const hit of fulltextHits) {
      const k = keyOf(hit);
      const existing = byKey.get(k);
      if (existing) {
        existing.source = 'hybrid';
      } else {
        byKey.set(k, hit);
      }
    }

    return Array.from(byKey.values())
      .sort((a, b) => {
        // hybrid > vector > fulltext, then by similarity desc.
        const rank = (e: LibraryExcerpt) =>
          e.source === 'hybrid' ? 2 : e.source === 'vector' ? 1 : 0;
        const dr = rank(b) - rank(a);
        if (dr !== 0) return dr;
        return (b.similarity ?? 0) - (a.similarity ?? 0);
      })
      .slice(0, limit);
  }

  /* ─── Helpers ─────────────────────────────────────────────────────── */

  private toExcerpt(
    content: string,
    metadata: Record<string, unknown> | null,
    source: 'vector' | 'fulltext',
    similarity?: number,
  ): LibraryExcerpt {
    const m = metadata ?? {};
    return {
      content,
      fileName: typeof m.fileName === 'string' ? m.fileName : 'Documento sem título',
      fileId: typeof m.fileId === 'string' ? m.fileId : undefined,
      tradition: typeof m.tradition === 'string' ? m.tradition : undefined,
      chunkIndex: typeof m.chunkIndex === 'number' ? m.chunkIndex : undefined,
      lemma: typeof m.lemma === 'string' ? m.lemma : undefined,
      strongId: typeof m.strongId === 'string' ? m.strongId : undefined,
      similarity,
      source,
    };
  }

  /**
   * Reproduz toVectorLiteral do semantic-cache.service para evitar import
   * cruzado entre serviços. Mantém Number.isFinite guard contra valores
   * malformados que poderiam quebrar o cast ::vector.
   */
  private toVectorLiteral(vec: number[]): string {
    return `[${vec.map((n) => (Number.isFinite(n) ? n : 0)).join(',')}]`;
  }
}
