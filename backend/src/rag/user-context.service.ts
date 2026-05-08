import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EmbeddingService } from './embedding.service';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

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

  private readonly MAX_DOCS_PER_USER = 500;
  private readonly MAX_CONTEXT_DOCS = 5; // Máximo de documentos para incluir no contexto

  constructor(
    private prisma: PrismaService,
    private embeddingService: EmbeddingService,
    private configService: ConfigService,
  ) {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (redisUrl) {
      this.redis = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
      });

      this.redis.on('error', (err) => {
        // Solo logeamos una vez para evitar inundar los logs
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
    // Em um cenário real, carregaríamos o índice do Redis ou do DB aqui
  }

  /**
   * Indexa documentos do usuário (notas, sermões, etc.)
   * Chamado quando o frontend sincroniza dados do localStorage.
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

    // Prepara textos para embedding em batch
    const texts = newDocs.map((doc) => this.buildDocumentText(doc));

    // Gera embeddings em batch (mais eficiente e barato)
    const embeddings = await this.embeddingService.createBatchEmbeddings(texts);

    // Indexa os documentos
    const existing = this.userIndex.get(userId) || [];

    for (let i = 0; i < newDocs.length; i++) {
      const indexedDoc: IndexedDocument = {
        ...newDocs[i],
        embedding: embeddings[i],
      };
      existing.push(indexedDoc);
      userDocIds.add(newDocs[i].id);
    }

    // Aplica limite por usuário
    if (existing.length > this.MAX_DOCS_PER_USER) {
      // Remove os mais antigos
      existing.sort((a, b) => b.createdAt - a.createdAt);
      const removed = existing.splice(this.MAX_DOCS_PER_USER);
      removed.forEach((d) => userDocIds.delete(d.id));
    }

    this.userIndex.set(userId, existing);

    // Tenta persistir no banco (pgvector) se disponível
    await this.persistToDatabase(userId, newDocs, embeddings);

    this.logger.log(
      `[Index] Usuário ${userId}: ${newDocs.length} novos docs indexados, ` +
        `${documents.length - newDocs.length} já existentes. Total: ${existing.length}`,
    );

    return {
      indexed: newDocs.length,
      skipped: documents.length - newDocs.length,
      total: existing.length,
    };
  }

  /**
   * Busca documentos do usuário semanticamente relevantes para uma query.
   * Retorna os TOP-N documentos mais relevantes para usar como contexto.
   */
  async searchUserContext(
    userId: string,
    query: string,
    maxResults: number = this.MAX_CONTEXT_DOCS,
  ): Promise<{ document: UserDocument; similarity: number }[]> {
    const userDocs = this.userIndex.get(userId);

    if (!userDocs || userDocs.length === 0) {
      return [];
    }

    const queryEmbedding = await this.embeddingService.createEmbedding(query);

    // Calcula similaridade com todos os docs do usuário
    const scored = userDocs.map((doc) => ({
      document: doc,
      similarity: this.embeddingService.cosineSimilarity(
        queryEmbedding,
        doc.embedding,
      ),
    }));

    // Ordena por similaridade e retorna os top resultados
    scored.sort((a, b) => b.similarity - a.similarity);

    // Filtra por threshold mínimo de relevância (0.3 é bem baixo, inclui contexto vagamente relevante)
    const relevant = scored
      .filter((s) => s.similarity > 0.3)
      .slice(0, maxResults);

    if (relevant.length > 0) {
      this.logger.debug(
        `[Context Search] User ${userId} | Query: "${query.slice(0, 40)}..." | ` +
          `${relevant.length} docs relevantes (melhor: ${relevant[0].similarity.toFixed(3)})`,
      );
    }

    return relevant;
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

      return `--- ${header} ${similarity} ---\n${meta}${doc.content}`;
    });

    return [
      '=== CONTEXTO PESSOAL DO USUÁRIO ===',
      'Os seguintes documentos são do histórico de estudo pessoal do usuário.',
      'Use-os para personalizar sua resposta quando relevante:',
      '',
      ...contextParts,
      '',
      '=== FIM DO CONTEXTO PESSOAL ===',
    ].join('\n');
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
        `Persistência no banco falhou (esperado em dev): ${error.message}`,
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
