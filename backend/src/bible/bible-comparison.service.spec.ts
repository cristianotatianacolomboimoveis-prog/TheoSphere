import { BibleComparisonService } from './bible-comparison.service';
import { PrismaService } from '../prisma.service';

describe('BibleComparisonService', () => {
  let service: BibleComparisonService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      bibleVerse: {
        findMany: jest.fn(),
      },
    };
    service = new BibleComparisonService(mockPrisma);
  });

  it('deve comparar versículos entre tradução base e alvos calculando diff e métricas', async () => {
    mockPrisma.bibleVerse.findMany.mockResolvedValue([
      {
        verse: 1,
        translation: 'BLIVRE',
        text: 'Portanto agora nenhuma condenação há para os que estão em Cristo Jesus, que não andam segundo a carne.',
      },
      {
        verse: 1,
        translation: 'NVA',
        text: 'Agora, pois, já não há nenhuma condenação para os que estão em Cristo Jesus.',
      },
    ]);

    const result = await service.comparePassage(
      45, // Romanos
      8,
      'BLIVRE',
      ['BLIVRE', 'NVA'],
      1,
    );

    expect(result.reference.display).toBe('Romanos 8:1');
    expect(result.baseTranslation).toBe('BLIVRE');
    expect(result.translations).toEqual(['BLIVRE', 'NVA']);
    expect(result.verses).toHaveLength(1);

    const verse1 = result.verses[0];
    expect(verse1.verse).toBe(1);
    expect(verse1.base.translation).toBe('BLIVRE');
    expect(verse1.targets.NVA).toBeDefined();
    expect(verse1.targets.NVA.diff.similarity).toBeGreaterThan(0);
    expect(verse1.targets.NVA.diff.tokens.length).toBeGreaterThan(0);

    // Métricas de similaridade média
    expect(result.metrics.NVA).toBeDefined();
    expect(result.metrics.NVA.totalVerses).toBe(1);
    expect(result.metrics.NVA.averageSimilarity).toBe(
      verse1.targets.NVA.diff.similarity,
    );
  });

  it('deve usar BLIVRE como fallback se base for inválida', async () => {
    mockPrisma.bibleVerse.findMany.mockResolvedValue([]);

    const result = await service.comparePassage(1, 1, 'INVALIDA', ['NVA']);

    expect(result.baseTranslation).toBe('BLIVRE');
  });
});
