import { Test, TestingModule } from '@nestjs/testing';
import { HomileticsService } from './homiletics.service';
import { PrismaService } from '../prisma.service';
import { CrossReferencesService } from './cross-references.service';
import { LinguisticsService } from '../linguistics/linguistics.service';

describe('HomileticsService', () => {
  let service: HomileticsService;
  let prisma: {
    bibleVerse: {
      findMany: jest.Mock;
    };
  };
  let crossRefs: {
    list: jest.Mock;
  };
  let linguistics: {
    getWordStudyDetails: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      bibleVerse: {
        findMany: jest.fn(),
      },
    };

    crossRefs = {
      list: jest.fn(),
    };

    linguistics = {
      getWordStudyDetails: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HomileticsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CrossReferencesService, useValue: crossRefs },
        { provide: LinguisticsService, useValue: linguistics },
      ],
    }).compile();

    service = module.get<HomileticsService>(HomileticsService);
  });

  it('deve gerar um esboço expositivo homilético completo estruturado para João 3:16', async () => {
    prisma.bibleVerse.findMany.mockResolvedValue([
      {
        verse: 16,
        text: 'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito...',
      },
    ]);

    crossRefs.list.mockResolvedValue([
      { target: 'Romans 5:8' },
      { target: '1 John 4:9' },
    ]);

    linguistics.getWordStudyDetails.mockResolvedValue({
      lemma: 'ἀγάπη',
      translit: 'agápē',
      strongId: 'G26',
      totalOccurrences: 116,
      canonicalDistribution: [],
      bookDistribution: [],
      inflectedForms: [
        {
          form: 'ἀγάπη',
          translit: 'agápē',
          morph: 'N-NSF',
          gloss: 'amor sacrificial incondicional',
          count: 86,
          sampleRef: 'John 3:16',
        },
      ],
      lexical: null,
    });

    const result = await service.generateOutline({
      bookId: 43, // John
      chapter: 3,
      startVerse: 16,
      endVerse: 16,
      theme: 'O Amor Soberano de Deus',
    });

    expect(result).toBeDefined();
    expect(result.passage).toBe('João 3:16');
    expect(result.title).toBe('O Amor Soberano de Deus');
    expect(result.bigIdea).toContain('João 3:16');
    expect(result.context.author).toBe('João, o discípulo amado');
    expect(result.context.canonicalDivision).toBe('Evangelhos');
    expect(result.sections).toHaveLength(3);
    expect(result.classicQuotes).toHaveLength(3);
    expect(result.crossReferences).toContain('Romans 5:8');
    expect(result.originalLanguageInsights[0].term).toBe('ἀγάπη');
    expect(result.markdown).toContain('# O Amor Soberano de Deus');
    expect(result.markdown).toContain('João 3:16');
  });

  it('deve suportar geração com intervalo de versículos e tema padrão automático', async () => {
    prisma.bibleVerse.findMany.mockResolvedValue([
      { verse: 1, text: 'No princípio era o Verbo...' },
      { verse: 2, text: 'Ele estava no princípio com Deus.' },
      { verse: 3, text: 'Todas as coisas foram feitas por ele...' },
    ]);

    crossRefs.list.mockResolvedValue([]);
    linguistics.getWordStudyDetails.mockResolvedValue(null);

    const result = await service.generateOutline({
      bookId: 43,
      chapter: 1,
      startVerse: 1,
      endVerse: 3,
    });

    expect(result.passage).toBe('João 1:1-3');
    expect(result.title).toContain('João 1:1-3');
    expect(result.sections).toHaveLength(3);
    expect(result.conclusion.summary).toBeDefined();
    expect(result.markdown).toContain('João 1:1-3');
  });
});
