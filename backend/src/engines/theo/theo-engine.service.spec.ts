import { TheologyEngineService } from './theo-engine.service';

describe('TheologyEngineService', () => {
  it('builds a deterministic evidence pack from hybrid Bible hits', async () => {
    const prisma = {} as any;
    const search = { hybridSearchVerses: jest.fn(async () => [
      { id: 'v1', bookId: 43, chapter: 3, verse: 16, translation: 'WEB', text: 'For God so loved the world', score: 0.91, vectorRank: 1, keywordRank: 1 },
    ]) } as any;
    const evidencePacks = { build: jest.fn((query: string, inputs: any[], limit: number) => ({ query, inputs, limit })) } as any;
    const service = new TheologyEngineService(prisma, search, evidencePacks);
    const result = await service.research('João 3:16', 12);
    expect(result.query).toBe('João 3:16');
    expect(result.items[0].reference).toBe('43:3:16');
    expect(result.items[0].kind).toBe('primary');
    expect(evidencePacks.build).toHaveBeenCalled();
  });

  it('clamps research limits and handles empty queries', async () => {
    const evidencePacks = { build: jest.fn((query: string, inputs: any[]) => ({ query, inputs })) } as any;
    const search = { hybridSearchVerses: jest.fn(async () => []) } as any;
    const service = new TheologyEngineService({} as any, search, evidencePacks);
    await service.research('   ', 999);
    expect(evidencePacks.build).toHaveBeenCalledWith('', []);
    await service.research('tema', 999);
    expect(search.hybridSearchVerses).toHaveBeenCalledWith('tema', { limit: 50 });
  });
});
