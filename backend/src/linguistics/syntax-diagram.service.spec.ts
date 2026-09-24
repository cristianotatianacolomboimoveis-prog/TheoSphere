import { Test, TestingModule } from '@nestjs/testing';
import { SyntaxDiagramService } from './syntax-diagram.service';
import { PrismaService } from '../prisma.service';

describe('SyntaxDiagramService', () => {
  let service: SyntaxDiagramService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      bibleVerse: {
        findFirst: jest.fn(),
      },
      $queryRawUnsafe: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyntaxDiagramService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SyntaxDiagramService>(SyntaxDiagramService);
  });

  describe('getCanonicalDiagramsList', () => {
    it('deve listar todos os diagramas canônicos catalogados', () => {
      const list = service.getCanonicalDiagramsList();
      expect(list.length).toBeGreaterThanOrEqual(5);
      const eph = list.find((d) => d.id === 'EPH.1.3-6');
      expect(eph).toBeDefined();
      expect(eph?.testament).toBe('NT');
      expect(eph?.clauseCount).toBe(7);
    });
  });

  describe('getCanonicalDiagram', () => {
    it('deve retornar o diagrama detalhado de Efésios 1:3-6 com orações subordinadas', () => {
      const diagram = service.getCanonicalDiagram('EPH.1.3-6');
      expect(diagram).not.toBeNull();
      expect(diagram?.reference).toBe('Efésios 1:3-6');
      expect(diagram?.isCanonicalPreset).toBe(true);
      expect(diagram?.rootClauses.length).toBeGreaterThan(0);
      const root = diagram?.rootClauses[0];
      expect(root?.clauseType).toBe('main');
      expect(root?.children).toBeDefined();
      expect(root?.children?.[0].clauseType).toBe('participial');
    });

    it('deve retornar o diagrama detalhado de Romanos 8:28-30 com a cadeia salutis', () => {
      const diagram = service.getCanonicalDiagram('ROM.8.28-30');
      expect(diagram).not.toBeNull();
      expect(diagram?.titlePt).toContain('Cadeia Dourada');
      expect(diagram?.rootClauses.length).toBe(3);
    });

    it('deve retornar o diagrama de Gênesis 1:1-3 em Hebraico', () => {
      const diagram = service.getCanonicalDiagram('GEN.1.1-3');
      expect(diagram).not.toBeNull();
      expect(diagram?.rootClauses[0].textOriginal).toContain('בָּרָא');
    });

    it('deve retornar null se o diagrama não existir', () => {
      const diagram = service.getCanonicalDiagram('INEXISTENTE_99');
      expect(diagram).toBeNull();
    });
  });

  describe('getVerseDiagram', () => {
    it('deve delegar diretamente para o preset se a referência for canônica', async () => {
      const diagram = await service.getVerseDiagram('EPH', 1, 3);
      expect(diagram).toBeDefined();
      expect(diagram.isCanonicalPreset).toBe(true);
      expect(diagram.reference).toContain('Efésios');
    });

    it('deve construir diagrama a partir de palavras interlineares quando disponíveis', async () => {
      mockPrisma.bibleVerse.findFirst.mockResolvedValue({
        text: 'Porque Deus amou o mundo de tal maneira...',
      });

      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        {
          id: '1',
          bookId: 43,
          chapter: 3,
          verse: 16,
          position: 1,
          word: 'Οὕτως',
          translit: 'Houtos',
          gloss: 'De tal maneira',
          glossEs: null,
          strongId: 'G3779',
          morph: 'ADV',
          lemma: 'οὕτως',
          lemmaGloss: null,
        },
        {
          id: '2',
          bookId: 43,
          chapter: 3,
          verse: 16,
          position: 2,
          word: 'γὰρ',
          translit: 'gar',
          gloss: 'porque',
          glossEs: null,
          strongId: 'G1063',
          morph: 'CONJ',
          lemma: 'γάρ',
          lemmaGloss: null,
        },
        {
          id: '3',
          bookId: 43,
          chapter: 3,
          verse: 16,
          position: 3,
          word: 'ἠγάπησεν',
          translit: 'egapesen',
          gloss: 'amou',
          glossEs: null,
          strongId: 'G25',
          morph: 'V-AAI-3S',
          lemma: 'ἀγαπάω',
          lemmaGloss: null,
        },
        {
          id: '4',
          bookId: 43,
          chapter: 3,
          verse: 16,
          position: 4,
          word: 'ὁ',
          translit: 'ho',
          gloss: 'o',
          glossEs: null,
          strongId: 'G3588',
          morph: 'T-NSM',
          lemma: 'ὁ',
          lemmaGloss: null,
        },
        {
          id: '5',
          bookId: 43,
          chapter: 3,
          verse: 16,
          position: 5,
          word: 'θεὸς',
          translit: 'theos',
          gloss: 'Deus',
          glossEs: null,
          strongId: 'G2316',
          morph: 'N-NSM',
          lemma: 'θεός',
          lemmaGloss: null,
        },
        {
          id: '6',
          bookId: 43,
          chapter: 3,
          verse: 16,
          position: 6,
          word: 'ἵνα',
          translit: 'hina',
          gloss: 'para que',
          glossEs: null,
          strongId: 'G2443',
          morph: 'CONJ',
          lemma: 'ἵνα',
          lemmaGloss: null,
        },
        {
          id: '7',
          bookId: 43,
          chapter: 3,
          verse: 16,
          position: 7,
          word: 'πᾶς',
          translit: 'pas',
          gloss: 'todo',
          glossEs: null,
          strongId: 'G3956',
          morph: 'A-NSM',
          lemma: 'πᾶς',
          lemmaGloss: null,
        },
        {
          id: '8',
          bookId: 43,
          chapter: 3,
          verse: 16,
          position: 8,
          word: 'πιστεύων',
          translit: 'pisteuon',
          gloss: 'o que crê',
          glossEs: null,
          strongId: 'G4100',
          morph: 'V-PAP-NSM',
          lemma: 'πιστεύω',
          lemmaGloss: null,
        },
        {
          id: '9',
          bookId: 43,
          chapter: 3,
          verse: 16,
          position: 9,
          word: 'ἔχῃ',
          translit: 'eche',
          gloss: 'tenha',
          glossEs: null,
          strongId: 'G2192',
          morph: 'V-PAS-3S',
          lemma: 'ἔχω',
          lemmaGloss: null,
        },
        {
          id: '10',
          bookId: 43,
          chapter: 3,
          verse: 16,
          position: 10,
          word: 'ζωὴν',
          translit: 'zoen',
          gloss: 'vida',
          glossEs: null,
          strongId: 'G2222',
          morph: 'N-ASF',
          lemma: 'ζωή',
          lemmaGloss: null,
        },
        {
          id: '11',
          bookId: 43,
          chapter: 3,
          verse: 16,
          position: 11,
          word: 'αἰώνιον.',
          translit: 'aionion',
          gloss: 'eterna.',
          glossEs: null,
          strongId: 'G166',
          morph: 'A-ASF',
          lemma: 'αἰώνιος',
          lemmaGloss: null,
        },
      ]);

      const diagram = await service.getVerseDiagram('JHN', 3, 16);
      expect(diagram).toBeDefined();
      expect(diagram.totalClauses).toBeGreaterThanOrEqual(2);
      expect(diagram.rootClauses[0].children).toBeDefined();
      expect(diagram.rootClauses[0].children?.[0].clauseType).toBe(
        'subordinate_purpose',
      );
    });

    it('deve usar heurística de texto quando não houver interlinear', async () => {
      mockPrisma.bibleVerse.findFirst.mockResolvedValue({
        text: 'Porque pela graça sois salvos, mediante a fé; e isto não vem de vós, é dom de Deus.',
      });
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

      const diagram = await service.getVerseDiagram('EPH', 2, 8);
      expect(diagram).toBeDefined();
      expect(diagram.rootClauses.length).toBeGreaterThan(1);
    });
  });
});
