import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { SearchService } from '../search/search.service';
import { EvidencePackService } from './evidence-pack.service';
import { EvidencePackContextService } from './evidence-pack-context.service';
import type { EvidenceInput } from './evidence-pack.service';

@Controller('api/v1/rag')
export class EvidenceController {
  constructor(
    private readonly search: SearchService,
    private readonly evidencePacks: EvidencePackService,
    private readonly evidenceContext: EvidencePackContextService,
  ) {}

  /**
   * Deterministic retrieval -> EvidencePack -> bounded context preview.
   * This endpoint does not call an LLM and is intended for diagnostics,
   * client integration and future RAG orchestration.
   */
  @Get('evidence')
  async preview(
    @Query('q') query: string,
    @Query('translation') translation?: string,
    @Query('limit') limit?: string,
  ) {
    const normalizedQuery = query?.trim() ?? '';
    if (normalizedQuery.length < 2 || normalizedQuery.length > 1000) {
      throw new BadRequestException(
        'q é obrigatório e deve ter entre 2 e 1000 caracteres',
      );
    }

    const parsedLimit = limit ? Number.parseInt(limit, 10) : 12;
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
      throw new BadRequestException('limit deve ser um inteiro entre 1 e 50');
    }

    const hits = await this.search.hybridSearchVerses(normalizedQuery, {
      limit: parsedLimit,
      translation: translation?.toUpperCase().trim() || undefined,
    });

    const inputs: EvidenceInput[] = hits.map((hit) => ({
      source: {
        type: 'bible',
        title: `${hit.translation} — ${hit.bookId}:${hit.chapter}:${hit.verse}`,
        reference: `${hit.bookId}:${hit.chapter}:${hit.verse}`,
        snippet: hit.text,
        score: Math.min(Math.max(hit.score, 0), 1),
      },
      kind: 'primary',
      provenance: 'bible',
    }));

    const pack = this.evidencePacks.build(normalizedQuery, inputs, parsedLimit);

    return {
      success: true,
      data: {
        pack,
        context: this.evidenceContext.render(pack),
      },
    };
  }
}
