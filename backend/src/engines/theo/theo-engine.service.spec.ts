import { TheologyEngineService } from './theo-engine.service';

describe('TheologyEngineService', () => {
  it('builds a deterministic evidence pack from hybrid Bible hits and cross-references', async () => {
    const prisma = {
      book: { findMany: jest.fn(async () => [{ id: 43, nameEn: 'John' }]) },
      technicalCommentary: { findMany: jest.fn(async () => []) },
    } as any;
    const search = { hybridSearchVerses: jest.fn(async () => [
      { id: 'v1', bookId: 43, chapter: 3, verse: 16, translation: 'WEB', text: 'For God so loved the world', score: 0.91, vectorRank: 1, keywordRank: 1 },
    ]) } as any;
    const crossReferences = { list: jest.fn(async () => [{ target: 'Romans 5:8', rank: 1, votes: 50 }]) } as any;
    const linguistics = { getInterlinearChapter: jest.fn(async () => ({ verses: {} })) } as any;
    const evidencePacks = { build: jest.fn((query: string, inputs: any[], limit: number) => ({ query, items: inputs.map((input) => ({ reference: input.source.reference, kind: input.kind })), limit })) } as any;
    const service = new TheologyEngineService(prisma, search, evidencePacks, crossReferences, linguistics);
    const result = await service.research('João 3:16', 12);
    expect(result.query).toBe('João 3:16');
    expect(result.items).toEqual([
      { reference: 'John 3:16', kind: 'primary' },
      { reference: 'Romans 5:8', kind: 'cross_reference' },
    ]);
    expect(crossReferences.list).toHaveBeenCalledWith('John 3:16', 8);
    expect(linguistics.getInterlinearChapter).toHaveBeenCalledWith(43, 3);
    expect(evidencePacks.build).toHaveBeenCalled();
  });

  it('clamps research limits and handles empty queries', async () => {
    const evidencePacks = { build: jest.fn((query: string, inputs: any[]) => ({ query, inputs })) } as any;
    const search = { hybridSearchVerses: jest.fn(async () => []) } as any;
    const prisma = { book: { findMany: jest.fn(async () => []) }, technicalCommentary: { findMany: jest.fn(async () => []) } } as any;
    const crossReferences = { list: jest.fn(async () => []) } as any;
    const linguistics = { getInterlinearChapter: jest.fn(async () => ({ verses: {} })) } as any;
    const service = new TheologyEngineService(prisma, search, evidencePacks, crossReferences, linguistics);
    await service.research('   ', 999);
    expect(evidencePacks.build).toHaveBeenCalledWith('', []);
    await service.research('tema', 999);
    expect(search.hybridSearchVerses).toHaveBeenCalledWith('tema', { limit: 50 });
  });
});
