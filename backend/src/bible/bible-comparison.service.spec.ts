import { BibleComparisonService } from './bible-comparison.service';
import { PrismaService } from '../prisma.service';

describe('BibleComparisonService (T0.5 Language-Restricted Comparison)', () => {
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

  it('deve comparar versículos no mesmo idioma calculando diff e métricas', async () => {
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
    expect(verse1.base.language).toBe('pt');
    expect(verse1.targets.NVA).toBeDefined();
    expect(verse1.targets.NVA.isSameLanguage).toBe(true);
    expect(verse1.targets.NVA.diff?.similarity).toBeGreaterThan(0);
    expect(verse1.targets.NVA.diff?.tokens.length).toBeGreaterThan(0);

    // Métricas de similaridade média
    expect(result.metrics.NVA).toBeDefined();
    expect(result.metrics.NVA.isSameLanguage).toBe(true);
    expect(result.metrics.NVA.totalVerses).toBe(1);
    expect(result.metrics.NVA.averageSimilarity).toBe(
      verse1.targets.NVA.diff?.similarity,
    );
  });

  it('deve restringir diff e % de similaridade para versões de idiomas distintos', async () => {
    mockPrisma.bibleVerse.findMany.mockResolvedValue([
      {
        verse: 1,
        translation: 'BLIVRE',
        text: 'No princípio era o Verbo.',
      },
      {
        verse: 1,
        translation: 'TR',
        text: 'Ἐν ἀρχῇ ἦν ὁ λόγος.',
      },
    ]);

    const result = await service.comparePassage(
      43, // João
      1,
      'BLIVRE',
      ['BLIVRE', 'TR'],
      1,
    );

    const target = result.verses[0].targets.TR;
    expect(target).toBeDefined();
    expect(target.isSameLanguage).toBe(false);
    expect(target.diff).toBeNull();
    expect(target.note).toContain('restrita a versões no mesmo idioma');
    expect(target.text).toBe('Ἐν ἀρχῇ ἦν ὁ λόγος.');

    // Métrica percentual nula para idiomas diferentes
    expect(result.metrics.TR.isSameLanguage).toBe(false);
    expect(result.metrics.TR.averageSimilarity).toBeNull();
    expect(result.metrics.TR.note).toContain(
      'indisponível entre idiomas distintos',
    );
  });

  it('deve usar BLIVRE como fallback se base for inválida', async () => {
    mockPrisma.bibleVerse.findMany.mockResolvedValue([]);

    const result = await service.comparePassage(1, 1, 'INVALIDA', ['NVA']);

    expect(result.baseTranslation).toBe('BLIVRE');
  });
});
