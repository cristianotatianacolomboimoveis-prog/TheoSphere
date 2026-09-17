import { EvidenceAwareRagService } from './evidence-aware-rag.service';
import { EvidencePackService } from './evidence-pack.service';
import { EvidencePackContextService } from './evidence-pack-context.service';
import { RagService } from './rag.service';
import type { HybridHit, SearchService } from '../search/search.service';

describe('EvidenceAwareRagService', () => {
  const makeService = (search: SearchService) =>
    new EvidenceAwareRagService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      search,
      {} as never,
      {} as never,
      {} as never,
      new EvidencePackService(),
      new EvidencePackContextService(),
    );

  const hit = (overrides: Partial<HybridHit> = {}): HybridHit => ({
    id: 'v1',
    bookId: 43,
    chapter: 3,
    verse: 16,
    translation: 'BLIVRE',
    text: 'Porque Deus amou o mundo...',
    score: 0.91,
    vectorRank: 1,
    keywordRank: 1,
    ...overrides,
  });

  it('constrói EvidencePack a partir da busca bíblica e renderiza contexto formal', async () => {
    const search = {
      hybridSearchVerses: jest.fn().mockResolvedValue([hit()]),
    } as unknown as jest.Mocked<SearchService>;
    const service = makeService(search);

    await Reflect.apply(
      Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(service),
        'prepareEvidence',
      )?.value as (...args: unknown[]) => Promise<void>,
      service,
      ['João 3:16'],
    );

    const state = service as unknown as { activeEvidenceContext: string };
    expect(search.hybridSearchVerses).toHaveBeenCalledWith('João 3:16', {
      limit: 12,
    });
    expect(state.activeEvidenceContext).toContain('EVIDENCE PACK');
    expect(state.activeEvidenceContext).toContain('PRIMARY_SOURCES: 1');
    expect(state.activeEvidenceContext).toContain('BLIVRE — 43:3:16');
  });

  it('injeta o EvidencePack no builder Gemini sem reimplementar o RAG original', () => {
    const service = makeService({} as SearchService);
    (service as unknown as { activeEvidenceContext: string }).activeEvidenceContext =
      '=== EVIDENCE PACK ===\nPRIMARY_SOURCES: 1\n=== END EVIDENCE PACK ===';

    const builder = (
      Reflect.get(service, 'buildGeminiRequest') as (
        params: Record<string, unknown>,
      ) => Record<string, unknown>
    ).bind(service);
    const result = builder({
      conversationHistory: [],
      sanitizedQuery: 'João 3:16',
      jsonMode: false,
      driveLibraryContext: '',
      theologicalContext: '',
      bibleContext: '',
      userContextText: '',
      openSourceContext: '',
      libraryHasHits: false,
      validatedQaContext: '',
      tradition: undefined,
    });

    const config = result.config as { systemInstruction: string };
    expect(config.systemInstruction).toContain('EVIDENCE PACK');
    expect(config.systemInstruction).toContain('PRIMARY_SOURCES: 1');
  });

  it('injeta o EvidencePack no builder OpenAI', () => {
    const service = makeService({} as SearchService);
    (service as unknown as { activeEvidenceContext: string }).activeEvidenceContext =
      '=== EVIDENCE PACK ===\nPRIMARY_SOURCES: 2\n=== END EVIDENCE PACK ===';

    const builder = (
      Reflect.get(service, 'buildOpenAiRequest') as (
        params: Record<string, unknown>,
      ) => Record<string, unknown>
    ).bind(service);
    const result = builder({
      conversationHistory: [],
      sanitizedQuery: 'Jesus',
      jsonMode: false,
      driveLibraryContext: '',
      theologicalContext: '',
      bibleContext: '',
      userContextText: '',
      libraryHasHits: false,
      validatedQaContext: '',
    });

    const messages = result.messages as Array<{ role: string; content: string }>;
    expect(messages.at(-1)?.content).toContain('EVIDENCE PACK');
    expect(messages.at(-1)?.content).toContain('PRIMARY_SOURCES: 2');
  });

  it('mantém o contrato de RagService', () => {
    const service = makeService({} as SearchService);
    expect(service).toBeInstanceOf(RagService);
  });
});
