import { EvidenceAwareRagService } from './evidence-aware-rag.service';
import { EvidencePackService } from './evidence-pack.service';
import { EvidencePackContextService } from './evidence-pack-context.service';
import { RagService } from './rag.service';
import type { HybridHit, SearchService } from '../search/search.service';

class TestableEvidenceAwareRagService extends EvidenceAwareRagService {
  public buildEvidenceForTest(query: string): Promise<string> {
    return this.buildEvidenceContext(query);
  }

  public bypassCacheForTest(): boolean {
    return this.bypassSemanticCache();
  }

  public withEvidenceForTest<T>(
    evidence: string,
    callback: () => Promise<T> | T,
  ): Promise<T> | T {
    return this.withEvidenceContext(evidence, callback);
  }
}

describe('EvidenceAwareRagService', () => {
  const makeService = (search: SearchService) =>
    new TestableEvidenceAwareRagService(
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
    const hybridSearchVerses = jest.fn().mockResolvedValue([hit()]);
    const search = {
      hybridSearchVerses,
    } as unknown as jest.Mocked<SearchService>;
    const service = makeService(search);

    const evidence = await service.buildEvidenceForTest('João 3:16');

    expect(hybridSearchVerses).toHaveBeenCalledWith('João 3:16', {
      limit: 12,
    });
    expect(evidence).toContain('EVIDENCE PACK');
    expect(evidence).toContain('PRIMARY_SOURCES: 1');
    expect(evidence).toContain('BLIVRE — 43:3:16');
  });

  it('injeta o EvidencePack no builder Gemini dentro do contexto da requisição', () => {
    const service = makeService({} as SearchService);
    const evidence =
      '=== EVIDENCE PACK ===\nPRIMARY_SOURCES: 1\n=== END EVIDENCE PACK ===';

    const builder = (
      service as unknown as {
        buildGeminiRequest: (
          params: Record<string, unknown>,
        ) => Record<string, unknown>;
      }
    ).buildGeminiRequest.bind(service);

    const result = service.withEvidenceForTest(evidence, () =>
      builder({
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
      }),
    );

    const config = (result as Record<string, unknown>).config as {
      systemInstruction: string;
    };
    expect(config.systemInstruction).toContain('EVIDENCE PACK');
    expect(config.systemInstruction).toContain('PRIMARY_SOURCES: 1');
  });

  it('injeta o EvidencePack no builder OpenAI dentro do contexto da requisição', () => {
    const service = makeService({} as SearchService);
    const evidence =
      '=== EVIDENCE PACK ===\nPRIMARY_SOURCES: 2\n=== END EVIDENCE PACK ===';

    const builder = (
      service as unknown as {
        buildOpenAiRequest: (
          params: Record<string, unknown>,
        ) => Record<string, unknown>;
      }
    ).buildOpenAiRequest.bind(service);

    const result = service.withEvidenceForTest(evidence, () =>
      builder({
        conversationHistory: [],
        sanitizedQuery: 'Jesus',
        jsonMode: false,
        driveLibraryContext: '',
        theologicalContext: '',
        bibleContext: '',
        userContextText: '',
        libraryHasHits: false,
        validatedQaContext: '',
      }),
    );

    const messages = (result as Record<string, unknown>).messages as Array<{
      role: string;
      content: string;
    }>;
    expect(messages.at(-1)?.content).toContain('EVIDENCE PACK');
    expect(messages.at(-1)?.content).toContain('PRIMARY_SOURCES: 2');
  });

  it('isola contextos de requisições concorrentes', async () => {
    const service = makeService({} as SearchService);
    const builder = (
      service as unknown as {
        buildGeminiRequest: (
          params: Record<string, unknown>,
        ) => Record<string, unknown>;
      }
    ).buildGeminiRequest.bind(service);

    const makeRequest = async (evidence: string, delayMs: number) =>
      service.withEvidenceForTest(evidence, async () => {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        const result = builder({
          conversationHistory: [],
          sanitizedQuery: 'pergunta',
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
        return (result.config as { systemInstruction: string })
          .systemInstruction;
      });

    const [first, second] = await Promise.all([
      makeRequest('EVIDENCE_A', 15),
      makeRequest('EVIDENCE_B', 1),
    ]);

    expect(first).toContain('EVIDENCE_A');
    expect(first).not.toContain('EVIDENCE_B');
    expect(second).toContain('EVIDENCE_B');
    expect(second).not.toContain('EVIDENCE_A');
  });

  it('injeta EvidencePack durante a execução real do iterator de streaming', async () => {
    const service = makeService({} as SearchService);
    const evidence = '=== EVIDENCE PACK ===\nPRIMARY_SOURCES: 3';
    const evidenceSpy = jest
      .spyOn(
        service as unknown as {
          buildEvidenceContext: (query: string) => Promise<string>;
        },
        'buildEvidenceContext',
      )
      .mockResolvedValue(evidence);
    const streamSpy = jest
      .spyOn(RagService.prototype, 'chatStream')
      .mockImplementation(async function* (this: RagService) {
        const builder = (
          this as unknown as {
            buildGeminiRequest: (
              params: Record<string, unknown>,
            ) => Record<string, unknown>;
          }
        ).buildGeminiRequest.bind(this);
        const result = builder({
          conversationHistory: [],
          sanitizedQuery: 'stream query',
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
        yield result;
      });

    try {
      const iterator = service.chatStream('stream query');
      const result = await iterator.next();
      const context = result.value as unknown as {
        config: { systemInstruction: string };
      };

      expect(evidenceSpy).toHaveBeenCalledWith('stream query');
      expect(context.config.systemInstruction).toContain('PRIMARY_SOURCES: 3');
      expect(streamSpy).toHaveBeenCalledWith(
        'stream query',
        undefined,
        undefined,
        [],
        false,
      );
    } finally {
      evidenceSpy.mockRestore();
      streamSpy.mockRestore();
    }
  });

  it('mantém o contrato de RagService', () => {
    const service = makeService({} as SearchService);
    expect(service).toBeInstanceOf(RagService);
  });
  describe('semantic cache and explicit EvidencePacks', () => {
    const pack = new EvidencePackService().build('graça', [
      {
        source: {
          type: 'bible',
          title: 'BLIVRE',
          reference: 'Efésios 2:8',
          snippet: 'Pela graça sois salvos.',
          score: 0.9,
        },
      },
    ]);

    it('bypasses the query-keyed cache for chatWithEvidencePack', async () => {
      const seen: boolean[] = [];
      jest.spyOn(RagService.prototype, 'chat').mockImplementation(function (
        this: TestableEvidenceAwareRagService,
      ) {
        seen.push(this.bypassCacheForTest());
        return Promise.resolve({} as never);
      });
      const service = makeService({} as SearchService);

      await service.chatWithEvidencePack('graça', pack);

      expect(seen).toEqual([true]);
      expect(service.bypassCacheForTest()).toBe(false);
      jest.restoreAllMocks();
    });

    it('keeps the cache for evidence the adapter derives from the query itself', async () => {
      const seen: boolean[] = [];
      jest.spyOn(RagService.prototype, 'chat').mockImplementation(function (
        this: TestableEvidenceAwareRagService,
      ) {
        seen.push(this.bypassCacheForTest());
        return Promise.resolve({} as never);
      });
      const service = makeService({
        hybridSearchVerses: jest.fn().mockResolvedValue([]),
      } as unknown as SearchService);

      await service.chat('graça');

      expect(seen).toEqual([false]);
      jest.restoreAllMocks();
    });
  });
});
