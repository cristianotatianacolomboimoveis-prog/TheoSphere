import { BadRequestException } from '@nestjs/common';
import { EvidenceController } from './evidence.controller';
import type { HybridHit, SearchService } from '../search/search.service';
import { EvidencePackContextService } from './evidence-pack-context.service';
import { EvidencePackService } from './evidence-pack.service';

describe('EvidenceController', () => {
  const search = {
    hybridSearchVerses: jest.fn(),
  } as unknown as jest.Mocked<SearchService>;

  const packs = new EvidencePackService();
  const context = new EvidencePackContextService();
  const controller = new EvidenceController(search, packs, context);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds a deterministic bible EvidencePack without calling an LLM', async () => {
    const hits: HybridHit[] = [
      {
        id: 'v1',
        bookId: 43,
        chapter: 3,
        verse: 16,
        translation: 'BLIVRE',
        text: 'Porque Deus amou o mundo...',
        score: 0.91,
        vectorRank: 1,
        keywordRank: 1,
      },
    ];
    search.hybridSearchVerses.mockResolvedValue(hits);

    const result = await controller.preview('João 3:16', 'blivre', '5');

    expect(search.hybridSearchVerses).toHaveBeenCalledWith('João 3:16', {
      limit: 5,
      translation: 'BLIVRE',
    });
    expect(result.success).toBe(true);
    expect(result.data.pack.primaryCount).toBe(1);
    expect(result.data.pack.items[0]).toEqual(
      expect.objectContaining({
        provenance: 'bible',
        kind: 'primary',
        reference: '43:3:16',
      }),
    );
    expect(result.data.context).toContain('EVIDENCE PACK');
  });

  it('rejects missing, too-short, or oversized queries', async () => {
    await expect(controller.preview('')).rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.preview('a')).rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.preview('x'.repeat(1001))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects invalid limits', async () => {
    await expect(controller.preview('Jesus', undefined, '0')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(controller.preview('Jesus', undefined, '51')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(controller.preview('Jesus', undefined, 'abc')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
