import { EvidenceAwareRagService } from './evidence-aware-rag.service';
import { EvidencePackService } from './evidence-pack.service';
import { EvidencePackContextService } from './evidence-pack-context.service';
import { RagService } from './rag.service';
import type { HybridHit, SearchService } from '../search/search.service';

class TestableEvidenceAwareRagService extends EvidenceAwareRagService {
  public buildEvidenceForTest(query: string): Promise<string> {
    return this.buildEvidenceContext(query);
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
    const search = { hybridSearchVerses } as unknown as jest.Mocked<SearchService>;
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
        buildGeminiRequest: (params: Record<string, unknown>) => Record<string, unknown>;
      }
    ).buildGeminiRequest.bind(service);

    const result = service.withEvidenceContext(evidence, () =>
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
        buildOpenAiRequest: (params: Record<string, unknown>) => Record<string, unknown>;
      }
    ).buildOpenAiRequest.bind(service);

    const result = service.withEvidenceContext(evidence, () =>
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
        buildGeminiRequest: (params: Record<string, unknown>) => Record<string, unknown>;
      }
    ).buildGeminiRequest.bind(service);

    const makeRequest = async (evidence: string, delayMs: number) =>
      service.withEvidenceContext(evidence, async () => {
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
        return (result.config as { systemInstruction: string }).systemInstruction;
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

  it('mantém o contrato de RagService', () => {
    const service = makeService({} as SearchService);
    expect(service).toBeInstanceOf(RagService);
  });
});
