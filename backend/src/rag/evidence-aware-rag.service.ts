import { Injectable } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';
import { SemanticCacheService } from './semantic-cache.service';
import { UserContextService } from './user-context.service';
import { PrismaService } from '../prisma.service';
import { SearchService, type HybridHit } from '../search/search.service';
import { TheologicalSourcesService } from './theological-sources.service';
import { RerankerService } from './reranker.service';
import { AiQuotaService } from './ai-quota.service';
import { RagService, type ChatMessage } from './rag.service';
import { EvidencePackService, type EvidenceInput } from './evidence-pack.service';
import { EvidencePackContextService } from './evidence-pack-context.service';

type BuilderParams = Record<string, unknown>;
type BuilderResult = Record<string, unknown>;
type Builder = (params: BuilderParams) => BuilderResult;

/**
 * Compatibility adapter that injects the formal EvidencePack at the existing
 * RAG generation boundary without rewriting RagService. It preserves the
 * current RagService contract and can be removed once the large service is
 * incrementally decomposed into explicit pipeline stages.
 */
@Injectable()
export class EvidenceAwareRagService extends RagService {
  private activeEvidenceContext = '';

  constructor(
    embeddingService: EmbeddingService,
    semanticCache: SemanticCacheService,
    userContext: UserContextService,
    prisma: PrismaService,
    search: SearchService,
    theologicalSources: TheologicalSourcesService,
    reranker: RerankerService,
    aiQuota: AiQuotaService,
    private readonly evidencePacks: EvidencePackService,
    private readonly evidenceContext: EvidencePackContextService,
  ) {
    super(
      embeddingService,
      semanticCache,
      userContext,
      prisma,
      search,
      theologicalSources,
      reranker,
      aiQuota,
    );

    this.installBuilderAdapters();
  }

  async chat(
    query: string,
    userId?: string,
    tradition?: string,
    conversationHistory: ChatMessage[] = [],
    jsonMode = false,
  ) {
    await this.prepareEvidence(query);
    try {
      return await super.chat(
        query,
        userId,
        tradition,
        conversationHistory,
        jsonMode,
      );
    } finally {
      this.activeEvidenceContext = '';
    }
  }

  private installBuilderAdapters(): void {
    const self = this as unknown as {
      buildGeminiRequest: Builder;
      buildOpenAiRequest: Builder;
    };

    const originalGemini = self.buildGeminiRequest.bind(this);
    const originalOpenAi = self.buildOpenAiRequest.bind(this);

    self.buildGeminiRequest = (params: BuilderParams) =>
      originalGemini({
        ...params,
        bibleContext: this.mergeEvidence(
          params.bibleContext,
          this.activeEvidenceContext,
        ),
      });

    self.buildOpenAiRequest = (params: BuilderParams) =>
      originalOpenAi({
        ...params,
        bibleContext: this.mergeEvidence(
          params.bibleContext,
          this.activeEvidenceContext,
        ),
      });
  }

  private async prepareEvidence(query: string): Promise<void> {
    this.activeEvidenceContext = '';
    const normalizedQuery = query?.trim() ?? '';
    if (normalizedQuery.length < 2) return;

    try {
      const hits = await this.searchHybridBible(normalizedQuery);
      if (hits.length === 0) return;

      const inputs: EvidenceInput[] = hits.map((hit) => ({
        source: {
          type: 'bible',
          title: `${hit.translation} — ${hit.bookId}:${hit.chapter}:${hit.verse}`,
          reference: `${hit.bookId}:${hit.chapter}:${hit.verse}`,
          snippet: hit.text,
          score: this.clampScore(hit.score),
        },
        kind: 'primary',
        provenance: 'bible',
      }));

      const pack = this.evidencePacks.build(normalizedQuery, inputs, 12);
      this.activeEvidenceContext = this.evidenceContext.render(pack, 9000);
    } catch {
      // Evidence is an enhancement boundary. A retrieval failure must not
      // break the existing RAG path, which already has independent fallbacks.
      this.activeEvidenceContext = '';
    }
  }

  private async searchHybridBible(query: string): Promise<HybridHit[]> {
    return this.search.hybridSearchVerses(query, { limit: 12 });
  }

  private mergeEvidence(value: unknown, evidence: string): string {
    const base = typeof value === 'string' ? value.trim() : '';
    if (!evidence) return base;
    return base ? `${evidence}\n\n${base}` : evidence;
  }

  private clampScore(value: number): number {
    if (!Number.isFinite(value)) return 0.5;
    return Math.min(Math.max(value, 0), 1);
  }
}
