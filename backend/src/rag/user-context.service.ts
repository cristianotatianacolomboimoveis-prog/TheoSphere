import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EmbeddingService } from './embedding.service';
import Redis from 'ioredis';

/**
 * UserContextService — Gerencia o contexto pessoal do usuário para RAG.
 *
 * Indexa e busca no conteúdo do usuário:
 * - Notas de estudo
 * - Sermões
 * - Destaques/highlights
 * - Planos de estudo
 *
 * Quando o usuário faz uma pergunta, o sistema busca no seu próprio conteúdo
 * para enriquecer o contexto enviado à IA, gerando respostas personalizadas
 * baseadas no que o usuário já estudou.
 *
 * Isso significa que dois usuários podem fazer a mesma pergunta e receber
 * respostas diferentes, baseadas no seu histórico de estudo pessoal.
 */

export interface UserDocument {
  id: string;
  userId: string;
  type: 'note' | 'sermon' | 'highlight' | 'study' | 'bookmark';
  content: string;
  metadata: Record<string, any>;
  embedding?: number[];
  createdAt: number;
}

interface IndexedDocument extends UserDocument {
  embedding: number[];
}

@Injectable()
export class UserContextService implements OnModuleInit {
  private readonly logger = new Logger(UserContextService.name);
  private redis: Redis | null = null;

  // Índice em memória por usuário (carregado do Redis/DB)
  private userIndex = new Map<string, IndexedDocument[]>();

  // Track de documentos já indexados por usuário
  private indexedDocIds = new Map<string, Set<string>>();

  private readonly MAX_IN_MEMORY_DOCS_PER_USER = 50;
  private readonly MAX_CONTEXT_DOCS = 6;

  constructor(
    private prisma: PrismaService,
    private embeddingService: EmbeddingService,
  ) {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      this.redis = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
      });

      this.redis.on('error', (err) => {
        if (this.redis && !this.redis['hasLoggedError']) {
          this.logger.warn(
            `Redis connection failed (local cache persistence disabled): ${err.message}`,
          );
          this.redis['hasLoggedError'] = true;
        }
      });
    }
  }

  async onModuleInit() {
    this.logger.log('Inicializando contexto do usuário...');
  }

  /**
   * Indexa documentos do usuário (notas, sermões, etc.)
   * Implementa Memory Eviction: mantém apenas os últimos N no mapa local (Hot),
   * enquanto o pgvector no banco de dados armazena o histórico total (Cold).
   */
  async indexUserDocuments(
    userId: string,
    documents: UserDocument[],
  ): Promise<{
    indexed: number;
    skipped: number;
    total: number;
  }> {
    if (!this.indexedDocIds.has(userId)) {
      this.indexedDocIds.set(userId, new Set<string>());
    }
    const userDocIds = this.indexedDocIds.get(userId)!;
    const newDocs = documents.filter((d) => !userDocIds.has(d.id));

    if (newDocs.length === 0) {
      return {
        indexed: 0,
        skipped: documents.length,
        total: this.getUserDocCount(userId),
      };
    }

    const texts = newDocs.map((doc) => this.buildDocumentText(doc));
    const embeddings = await this.embeddingService.createBatchEmbeddings(texts);

    const existing = this.userIndex.get(userId) || [];

    for (let i = 0; i < newDocs.length; i++) {
      const indexedDoc: IndexedDocument = {
        ...newDocs[i],
        embedding: embeddings[i],
      };
      existing.push(indexedDoc);
      userDocIds.add(newDocs[i].id);
    }

    // Memory Eviction: mantém apenas os 50 mais recentes em RAM
    if (existing.length > this.MAX_IN_MEMORY_DOCS_PER_USER) {
      existing.sort((a, b) => b.createdAt - a.createdAt);
      existing.splice(this.MAX_IN_MEMORY_DOCS_PER_USER);
    }

    this.userIndex.set(userId, existing);

    // Persiste TODOS no banco (Cold Storage / Scalable Search)
    await this.persistToDatabase(userId, newDocs, embeddings);

    return {
      indexed: newDocs.length,
      skipped: documents.length - newDocs.length,
      total: existing.length,
    };
  }

  /**
   * Busca documentos do usuário semanticamente relevantes para uma query.
   * Implementa Tiered Storage (SEC-010):
   * 1. Busca no Cache em Memória (Hot - documentos recém indexados)
   * 2. Busca no Banco de Dados (Cold - pgvector para escala)
   */
  async searchUserContext(
    userId: string,
    query: string,
    maxResults: number = this.MAX_CONTEXT_DOCS,
  ): Promise<{ document: UserDocument; similarity: number }[]> {
    const queryEmbedding = await this.embeddingService.createEmbedding(query);

    // 1. Busca em Memória (Tier 1 - Ultrarápido)
    const userDocs = this.userIndex.get(userId) || [];
    const memoryResults = userDocs.map((doc) => ({
      document: doc,
      similarity: this.embeddingService.cosineSimilarity(
        queryEmbedding,
        doc.embedding,
      ),
    }));

    // 2. Busca no Banco de Dados (Tier 2 - Escalonável)
    let dbResults: { document: UserDocument; similarity: number }[] = [];
    try {
      // Usamos JSON.stringify para garantir que o array vire uma string compatível com o cast de ::vector
      const rows = await this.prisma.$queryRaw<any[]>`
        SELECT id, type, content, metadata, "createdAt",
               1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
        FROM "UserEmbedding"
        WHERE "userId" = ${userId} AND type != 'library_book'
        ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
        LIMIT ${maxResults};
      `;

      dbResults = rows.map((r) => ({
        document: {
          id: r.id,
          userId: userId,
          type: r.type,
          content: r.content,
          metadata:
            typeof r.metadata === 'string'
              ? JSON.parse(r.metadata)
              : r.metadata,
          createdAt: new Date(r.createdAt).getTime(),
        },
        similarity: r.similarity,
      }));
    } catch (err) {
      this.logger.debug(
        `Database context search failed: ${(err as Error).message}`,
      );
    }

    // 3. Merge, Deduplicação e Ranking
    const allResults = [...memoryResults, ...dbResults];
    const uniqueResults = new Map<
      string,
      { document: UserDocument; similarity: number }
    >();

    for (const res of allResults) {
      const existing = uniqueResults.get(res.document.id);
      if (!existing || existing.similarity < res.similarity) {
        uniqueResults.set(res.document.id, res);
      }
    }

    const finalResults = Array.from(uniqueResults.values())
      .filter((s) => s.similarity > 0.3)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxResults);

    if (finalResults.length > 0) {
      this.logger.debug(
        `[Tiered Search] User ${userId} | ${finalResults.length} hits | ` +
          `Best: ${finalResults[0].similarity.toFixed(3)}`,
      );
    }

    return finalResults;
  }

  /**
   * Constrói o contexto enriquecido do usuário para enviar à IA.
   * Formata os documentos relevantes como texto estruturado.
   */
  async buildUserContext(userId: string, query: string): Promise<string> {
    const results = await this.searchUserContext(userId, query);

    if (results.length === 0) return '';

    const contextParts = results.map((r, i) => {
      const doc = r.document;
      const typeLabels: Record<string, string> = {
        note: '📝 Nota de Estudo',
        sermon: '📖 Sermão',
        highlight: '🖍️ Destaque',
        study: '📚 Plano de Estudo',
        bookmark: '🔖 Favorito',
      };

      const header = typeLabels[doc.type] || '📄 Documento';
      const similarity = `(relevância: ${(r.similarity * 100).toFixed(0)}%)`;

      let meta = '';
      if (doc.metadata.reference)
        meta += `Referência: ${doc.metadata.reference}\n`;
      if (doc.metadata.title) meta += `Título: ${doc.metadata.title}\n`;
      if (doc.metadata.passage) meta += `Passagem: ${doc.metadata.passage}\n`;

      const docContent = doc.metadata?.parentText || doc.content;
      return `--- ${header} ${similarity} ---\n${meta}${docContent}`;
    });

    // 2. Busca na Biblioteca do Google Drive do Usuário (via pgvector)
    let libraryContextParts: string[] = [];
    try {
      const queryEmbedding = await this.embeddingService.createEmbedding(query);
      const libraryDocs = await this.prisma.$queryRaw<any[]>`
        SELECT content, metadata, 
               1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
        FROM "UserEmbedding"
        WHERE "userId" = ${userId} AND type = 'library_book'
        ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
        LIMIT 3;
      `;

      libraryContextParts = libraryDocs
        .filter((d) => d.similarity > 0.3)
        .map((doc) => {
          const sim = `(relevância: ${(doc.similarity * 100).toFixed(0)}%)`;
          const meta =
            typeof doc.metadata === 'string'
              ? JSON.parse(doc.metadata)
              : doc.metadata || {};
          const title = meta.fileName || 'Livro da Biblioteca';
          const contentToUse = meta.parentText || doc.content;
          return `--- 📚 Biblioteca Pessoal: ${title} ${sim} ---\n${contentToUse}`;
        });
    } catch (err) {
      this.logger.error(
        `Erro ao buscar na biblioteca do drive do usuário: ${(err as Error).message}`,
      );
    }

    const allParts = [...contextParts, ...libraryContextParts];
    if (allParts.length === 0) return '';

    return [
      '=== CONTEXTO PESSOAL E BIBLIOTECA DO USUÁRIO ===',
      'Os seguintes documentos são do histórico de estudo e da biblioteca pessoal (Google Drive) do usuário.',
      'Estas são as anotações pessoais do usuário. Referencie-as quando relevante para personalizar a resposta, mas mantenha sempre o rigor acadêmico e a precisão exegética. Se as notas do usuário contiverem imprecisões teológicas, apresente gentilmente a perspectiva acadêmica sem invalidar a experiência pessoal do usuário.',
      '',
      ...allParts,
      '',
      '=== FIM DO CONTEXTO PESSOAL ===',
    ].join('\n');
  }

  /**
   * Busca SEMPRE na Biblioteca RAG do Google Drive (chunks type='library_book').
   * Cobre tanto a biblioteca do próprio usuário quanto a biblioteca
   * compartilhada ('public-guest' — obras ingeridas sem userId), que antes
   * nunca era consultada por usuários logados. Fonte prioritária do chat:
   * se retornar hits, a IA responde com base neles; se vazio, o RagService
   * aciona a IA com conhecimento geral (feature 2026-07-20).
   */
  async searchDriveLibrary(
    query: string,
    userId?: string,
    maxResults: number = 5,
  ): Promise<
    { title: string; content: string; similarity: number; fileName: string }[]
  > {
    try {
      const queryEmbedding = await this.embeddingService.createEmbedding(query);
      const owner = userId || 'public-guest';

      const rows = await this.prisma.$queryRaw<any[]>`
        SELECT content, metadata,
               1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
        FROM "UserEmbedding"
        WHERE type = 'library_book'
          AND ("userId" = ${owner} OR "userId" = 'public-guest')
        ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
        LIMIT ${maxResults * 2};
      `;

      // Dedup por parentText (vários child chunks podem apontar pro mesmo pai)
      const seen = new Set<string>();
      const results: {
        title: string;
        content: string;
        similarity: number;
        fileName: string;
      }[] = [];

      for (const r of rows) {
        if (r.similarity <= 0.3) continue;
        const meta =
          typeof r.metadata === 'string'
            ? JSON.parse(r.metadata)
            : r.metadata || {};
        const content: string = meta.parentText || r.content;
        const key = content.slice(0, 120);
        if (seen.has(key)) continue;
        seen.add(key);
        results.push({
          title: meta.title || meta.fileName || 'Obra da Biblioteca',
          fileName: meta.fileName || 'desconhecido',
          content,
          similarity: r.similarity,
        });
        if (results.length >= maxResults) break;
      }

      if (results.length > 0) {
        this.logger.log(
          `[Drive Library] ${results.length} hits | Best: ${results[0].similarity.toFixed(3)}`,
        );
      }
      return results;
    } catch (err) {
      this.logger.debug(
        `[Drive Library] Busca falhou: ${(err as Error).message}`,
      );
      return [];
    }
  }

  /**
   * Promove uma resposta validada por humano (👍) à coleção `validated_qa`.
   * Regras anti-feedback-loop (2026-07-20):
   *  - chave de recuperação = a PERGUNTA (embedding); a resposta fica no metadata
   *  - dedup semântico: similaridade ≥ 0.95 com pergunta já validada → descarta
   *  - a coleção é sempre contexto SECUNDÁRIO, rotulado, abaixo da Biblioteca
   */
  async promoteValidatedAnswer(
    query: string,
    answer: string,
    validatedBy: string,
  ): Promise<{ promoted: boolean; reason?: string; votes?: number }> {
    // Nº mínimo de validações independentes para ativar (default 1 no beta;
    // subir para 2+ via env quando a base de usuários crescer).
    const minVotesRaw = Number(process.env.VALIDATED_QA_MIN_VOTES ?? 1);
    const minVotes =
      Number.isFinite(minVotesRaw) && minVotesRaw >= 1 ? minVotesRaw : 1;

    try {
      const queryEmbedding = await this.embeddingService.createEmbedding(query);

      // Pergunta validada quase idêntica já existe? → conta como VOTO, não duplicata cega
      const existing = await this.prisma.$queryRaw<any[]>`
        SELECT id, metadata,
               1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
        FROM "UserEmbedding"
        WHERE type = 'validated_qa'
        ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
        LIMIT 1;
      `;

      if (existing.length > 0 && existing[0].similarity >= 0.95) {
        const row = existing[0];
        const meta =
          typeof row.metadata === 'string'
            ? JSON.parse(row.metadata)
            : row.metadata || {};
        const votes: string[] = Array.isArray(meta.votes)
          ? meta.votes
          : [meta.validatedBy].filter(Boolean);

        if (votes.includes(validatedBy)) {
          // Mesmo usuário não vota duas vezes na mesma pergunta
          return { promoted: false, reason: 'duplicate', votes: votes.length };
        }

        votes.push(validatedBy);
        const status = votes.length >= minVotes ? 'active' : 'pending';
        const newMeta = { ...meta, votes, status };

        await this.prisma.$executeRaw`
          UPDATE "UserEmbedding"
          SET metadata = ${JSON.stringify(newMeta)}::jsonb
          WHERE id = ${row.id};
        `;
        this.logger.log(
          `[Validated QA] Voto de ${validatedBy} (${votes.length}/${minVotes}) → ${status}`,
        );
        return {
          promoted: status === 'active',
          reason: status === 'pending' ? 'pending' : undefined,
          votes: votes.length,
        };
      }

      // Primeira validação desta pergunta
      const status = 1 >= minVotes ? 'active' : 'pending';
      const metadata = {
        query,
        answer,
        validatedBy,
        votes: [validatedBy],
        status,
        validatedAt: new Date().toISOString(),
        origin: 'theoai',
      };

      await this.prisma.$executeRaw`
        INSERT INTO "UserEmbedding" (id, "userId", type, content, metadata, embedding, "createdAt")
        VALUES (
          gen_random_uuid()::text,
          ${validatedBy},
          'validated_qa',
          ${query},
          ${JSON.stringify(metadata)}::jsonb,
          ${JSON.stringify(queryEmbedding)}::vector,
          NOW()
        );
      `;
      this.logger.log(
        `[Validated QA] Registrada por ${validatedBy} (1/${minVotes}) → ${status}`,
      );
      return {
        promoted: status === 'active',
        reason: status === 'pending' ? 'pending' : undefined,
        votes: 1,
      };
    } catch (err) {
      this.logger.error(
        `[Validated QA] Falha na promoção: ${(err as Error).message}`,
      );
      return { promoted: false, reason: 'error' };
    }
  }

  /** Lista paginada das Q&A validadas (painel de moderação). */
  async listValidatedQa(
    page: number = 1,
    pageSize: number = 20,
  ): Promise<{ items: any[]; total: number; page: number; pageSize: number }> {
    const skip = (Math.max(1, page) - 1) * pageSize;
    const [rows, total] = await Promise.all([
      this.prisma.$queryRaw<any[]>`
        SELECT id, content, metadata, "createdAt"
        FROM "UserEmbedding"
        WHERE type = 'validated_qa'
        ORDER BY "createdAt" DESC
        LIMIT ${pageSize} OFFSET ${skip};
      `,
      this.prisma.userEmbedding.count({ where: { type: 'validated_qa' } }),
    ]);

    const items = rows.map((r) => {
      const meta =
        typeof r.metadata === 'string'
          ? JSON.parse(r.metadata)
          : r.metadata || {};
      return {
        id: r.id,
        query: meta.query || r.content,
        answer: (meta.answer || '').slice(0, 300),
        status: meta.status || 'active',
        votes: Array.isArray(meta.votes) ? meta.votes.length : 1,
        validatedAt: meta.validatedAt || r.createdAt,
      };
    });

    return { items, total, page, pageSize };
  }

  /** Remove uma Q&A validada (moderação). Retorna quantos registros saíram. */
  async deleteValidatedQa(id: string): Promise<number> {
    const result = await this.prisma.userEmbedding.deleteMany({
      where: { id, type: 'validated_qa' },
    });
    if (result.count > 0) {
      this.logger.log(`[Validated QA] Removida por moderação: ${id}`);
    }
    return result.count;
  }

  /**
   * Busca respostas validadas semelhantes à pergunta atual (contexto
   * secundário do chat — compartilhado entre todos os usuários).
   */
  async searchValidatedQa(
    query: string,
    maxResults: number = 2,
  ): Promise<{ question: string; answer: string; similarity: number }[]> {
    try {
      const queryEmbedding = await this.embeddingService.createEmbedding(query);
      // Só entradas 'active' (quórum de votos atingido) alimentam o chat;
      // 'pending' aguarda mais validações. IS NULL cobre entradas legadas.
      const rows = await this.prisma.$queryRaw<any[]>`
        SELECT content, metadata,
               1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
        FROM "UserEmbedding"
        WHERE type = 'validated_qa'
          AND (metadata->>'status' = 'active' OR metadata->>'status' IS NULL)
        ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
        LIMIT ${maxResults};
      `;
      return rows
        .filter((r) => r.similarity > 0.5)
        .map((r) => {
          const meta =
            typeof r.metadata === 'string'
              ? JSON.parse(r.metadata)
              : r.metadata || {};
          return {
            question: meta.query || r.content,
            answer: meta.answer || '',
            similarity: r.similarity,
          };
        })
        .filter((r) => r.answer.length > 0);
    } catch (err) {
      this.logger.debug(
        `[Validated QA] Busca falhou: ${(err as Error).message}`,
      );
      return [];
    }
  }

  /**
   * Transforma um documento do usuário em texto para embedding.
   */
  private buildDocumentText(doc: UserDocument): string {
    const parts = [doc.content];

    if (doc.metadata.title) parts.unshift(`Título: ${doc.metadata.title}`);
    if (doc.metadata.reference)
      parts.unshift(`Referência: ${doc.metadata.reference}`);
    if (doc.metadata.passage)
      parts.unshift(`Passagem: ${doc.metadata.passage}`);
    if (doc.metadata.tags?.length)
      parts.push(`Tags: ${doc.metadata.tags.join(', ')}`);

    // Para sermões, inclui os pontos
    if (doc.type === 'sermon' && doc.metadata.points?.length) {
      const pointsText = doc.metadata.points
        .map((p: any, i: number) => `${i + 1}. ${p.title}: ${p.content}`)
        .join('\n');
      parts.push(`Pontos:\n${pointsText}`);
    }

    return parts.join('\n');
  }

  /**
   * Tenta persistir embeddings no banco de dados (pgvector).
   * Falha silenciosamente se a extensão não estiver disponível.
   */
  private async persistToDatabase(
    userId: string,
    documents: UserDocument[],
    embeddings: number[][],
  ): Promise<void> {
    try {
      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        const embedding = embeddings[i];

        await this.prisma.$executeRaw`
          INSERT INTO "UserEmbedding" (id, "userId", type, content, metadata, embedding, "createdAt")
          VALUES (
            ${doc.id},
            ${userId},
            ${doc.type},
            ${doc.content},
            ${JSON.stringify(doc.metadata)}::jsonb,
            ${JSON.stringify(embedding)}::vector,
            NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            content = EXCLUDED.content,
            metadata = EXCLUDED.metadata,
            embedding = EXCLUDED.embedding;
        `;
      }
    } catch (error) {
      // Falha silenciosa — o índice em memória já funciona
      this.logger.debug(
        `Persistência no banco falhou (esperado em dev): ${(error as Error).message}`,
      );
    }
  }

  /** Obtém contagem de documentos do usuário */
  private getUserDocCount(userId: string): number {
    return this.userIndex.get(userId)?.length || 0;
  }

  /** Remove todos os dados do usuário */
  clearUserData(userId: string): void {
    this.indexedDocIds.delete(userId);
    this.userIndex.delete(userId);
    this.logger.log(`[Clear] Dados do usuário ${userId} removidos do índice.`);
  }

  /** Retorna estatísticas gerais */
  getStats(): {
    totalUsers: number;
    totalDocuments: number;
    avgDocsPerUser: number;
  } {
    let totalDocs = 0;
    for (const [, docs] of this.userIndex) {
      totalDocs += docs.length;
    }
    return {
      totalUsers: this.userIndex.size,
      totalDocuments: totalDocs,
      avgDocsPerUser:
        this.userIndex.size > 0
          ? Math.round(totalDocs / this.userIndex.size)
          : 0,
    };
  }
}
