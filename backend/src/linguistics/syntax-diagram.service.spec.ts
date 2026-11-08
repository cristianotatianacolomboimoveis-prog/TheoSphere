import { Test, TestingModule } from '@nestjs/testing';
import {
  SyntaxDiagramService,
  assertValidMaculaTreebankDiagram,
} from './syntax-diagram.service';
import { PrismaService } from '../prisma.service';
import { SyntaxDiagramResponse } from './syntax-diagram.dto';

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
    it('deve delegar para preset canônico no AT quando fora do treebank NT (GEN 1:1)', async () => {
      const diagram = await service.getVerseDiagram('GEN', 1, 1);
      expect(diagram).toBeDefined();
      expect(diagram.isCanonicalPreset).toBe(true);
      expect(diagram.reference).toContain('Gênesis');
    });

    it('deve construir diagrama a partir de palavras interlineares quando fora do treebank (ex: ACT 8:37)', async () => {
      mockPrisma.bibleVerse.findFirst.mockResolvedValue({
        text: 'E disse Filipe: É lícito, se crês de todo o coração...',
      });

      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        {
          id: '1',
          bookId: 44,
          chapter: 8,
          verse: 37,
          position: 1,
          word: 'Εἶπεν',
          translit: 'Eipen',
          gloss: 'Disse',
          glossEs: null,
          strongId: 'G2036',
          morph: 'V-2AAI-3S',
          lemma: 'λέγω',
          lemmaGloss: null,
        },
        {
          id: '2',
          bookId: 44,
          chapter: 8,
          verse: 37,
          position: 2,
          word: 'δὲ',
          translit: 'de',
          gloss: 'porém',
          glossEs: null,
          strongId: 'G1161',
          morph: 'CONJ',
          lemma: 'δέ',
          lemmaGloss: null,
        },
        {
          id: '3',
          bookId: 44,
          chapter: 8,
          verse: 37,
          position: 3,
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
          id: '4',
          bookId: 44,
          chapter: 8,
          verse: 37,
          position: 4,
          word: 'Φίλιππος',
          translit: 'Philippos',
          gloss: 'Filipe',
          glossEs: null,
          strongId: 'G5376',
          morph: 'N-NSM',
          lemma: 'Φίλιππος',
          lemmaGloss: null,
        },
        {
          id: '5',
          bookId: 44,
          chapter: 8,
          verse: 37,
          position: 5,
          word: 'εἰ',
          translit: 'ei',
          gloss: 'se',
          glossEs: null,
          strongId: 'G1487',
          morph: 'CONJ',
          lemma: 'εἰ',
          lemmaGloss: null,
        },
        {
          id: '6',
          bookId: 44,
          chapter: 8,
          verse: 37,
          position: 6,
          word: 'πιστεύεις',
          translit: 'pisteueis',
          gloss: 'crês',
          glossEs: null,
          strongId: 'G4100',
          morph: 'V-PAI-2S',
          lemma: 'πιστεύω',
          lemmaGloss: null,
        },
      ]);

      const diagram = await service.getVerseDiagram('ACT', 8, 37);
      expect(diagram).toBeDefined();
      expect(diagram.totalClauses).toBeGreaterThanOrEqual(2);
      expect(diagram.method).toBe('heuristic-interlinear');
      expect(diagram.methodLabelPt).toBe(
        'Segmentação aproximada (não é árvore sintática anotada)',
      );
      expect(diagram.rootClauses[0].children).toBeDefined();
      expect(diagram.rootClauses[0].children?.[0].clauseType).toBe(
        'subordinate_conditional',
      );
    });

    it('deve usar heurística de texto quando não houver treebank nem interlinear (ex: ACT 8:37 sem interlinear)', async () => {
      mockPrisma.bibleVerse.findFirst.mockResolvedValue({
        text: 'E disse Filipe: É lícito, se crês de todo o coração; e respondendo ele, disse: Creio.',
      });
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

      const diagram = await service.getVerseDiagram('ACT', 8, 37);
      expect(diagram).toBeDefined();
      expect(diagram.isAnnotatedTree).toBe(false);
      expect(diagram.method).toBe('heuristic-text');
      expect(diagram.methodLabelPt).toBe(
        'Segmentação aproximada (não é árvore sintática anotada)',
      );
      expect(diagram.rootClauses.length).toBeGreaterThan(1);
    });

    it('João 1:1 vem do Treebank MACULA Lowfat com 3 cláusulas coordenadas e IDs n43001001001..n43001001017', async () => {
      const diagram = await service.getVerseDiagram('JHN', 1, 1);

      expect(diagram.isAnnotatedTree).toBe(true);
      expect(diagram.method).toBe('treebank');
      expect(diagram.methodLabelPt).toBe('✓ Árvore Anotada (Treebank)');
      expect(diagram.source).toMatch(/MACULA Greek/i);
      expect(diagram.rootClauses).toHaveLength(3);
      expect(diagram.rootClauses[0].id).toBe('n43001001001');
      expect(diagram.rootClauses[1].id).toBe('n43001001006');
      expect(diagram.rootClauses[2].id).toBe('n43001001013');
      expect(diagram.rootClauses[0].words?.[0].id).toBe('n43001001001');
      expect(diagram.rootClauses[0].words?.[0].maculaRole).toBe('P');
      expect(diagram.rootClauses[0].words?.[2].id).toBe('n43001001003');
      expect(diagram.rootClauses[0].words?.[2].maculaRole).toBe('VC');
      expect(diagram.rootClauses[2].words?.[4].id).toBe('n43001001017');
      expect(diagram.rootClauses[2].words?.[4].maculaRole).toBe('S');
    });

    it('Romanos 8:28 vem do Treebank MACULA Lowfat com subordinação ὅτι e duas cláusulas participiais nominalizadas', async () => {
      const diagram = await service.getVerseDiagram('ROM', 8, 28);

      expect(diagram.isAnnotatedTree).toBe(true);
      expect(diagram.method).toBe('treebank');
      expect(diagram.totalClauses).toBe(4);
      expect(diagram.maxNestingDepth).toBe(2);
      expect(diagram.rootClauses[0].id).toBe('n45008028001');
      const hotiClause = diagram.rootClauses[0].children?.[0];
      expect(hotiClause?.id).toBe('n45008028003');
      expect(hotiClause?.clauseType).toBe('subordinate_causal');
      expect(hotiClause?.children).toHaveLength(2);
      expect(hotiClause?.children?.[0].id).toBe('n45008028004');
      expect(hotiClause?.children?.[0].clauseType).toBe('participial');
      expect(hotiClause?.children?.[1].id).toBe('n45008028012');
      expect(hotiClause?.children?.[1].clauseType).toBe('participial');
    });

    it('Efésios 2:8 vem do Treebank MACULA Lowfat com 3 cláusulas e IDs n49002008001..n49002008015', async () => {
      const diagram = await service.getVerseDiagram('EPH', 2, 8);

      expect(diagram.isAnnotatedTree).toBe(true);
      expect(diagram.method).toBe('treebank');
      expect(diagram.methodLabelPt).toBe('✓ Árvore Anotada (Treebank)');
      expect(diagram.rootClauses).toHaveLength(3);
      expect(diagram.rootClauses[0].id).toBe('n49002008001');
      expect(diagram.rootClauses[0].words?.map((w) => w.id)).toEqual([
        'n49002008001',
        'n49002008002',
        'n49002008003',
        'n49002008004',
        'n49002008005',
        'n49002008006',
        'n49002008007',
      ]);
      expect(diagram.rootClauses[1].id).toBe('n49002008008');
      expect(diagram.rootClauses[2].id).toBe('n49002008013');
    });

    it('invariante T1.5 (positivo): todos os 7.945 diagramas do treebank possuem IDs MACULA válidos em cláusulas e palavras', () => {
      const allTrees = service.getMaculaTrees();
      const keys = Object.keys(allTrees);
      expect(keys.length).toBeGreaterThanOrEqual(7939);

      for (const key of keys) {
        const diagram = allTrees[key];
        expect(() => assertValidMaculaTreebankDiagram(diagram)).not.toThrow();
      }
    });

    it('invariante T1.5 (caminho de falha): rejeita diagrama treebank cujo nó de cláusula ou palavra não possui ID MACULA válido', () => {
      const invalidClauseIdDiagram: SyntaxDiagramResponse = {
        reference: 'João 1:1',
        titlePt: 'Teste Inválido',
        authorPt: 'Teste',
        totalClauses: 1,
        maxNestingDepth: 0,
        isCanonicalPreset: false,
        method: 'treebank',
        methodLabelPt: '✓ Árvore Anotada (Treebank)',
        isAnnotatedTree: true,
        rootClauses: [
          {
            id: 'jhn-1-1a', // ID manual inválido (não segue /^n\d{11}$/)
            level: 0,
            clauseType: 'main',
            labelPt: 'Cláusula Principal',
            textOriginal: 'Ἐν ἀρχῇ',
            textTranslation: 'In beginning',
            words: [{ id: 'n43001001001', word: 'Ἐν' }],
          },
        ],
      };

      expect(() =>
        assertValidMaculaTreebankDiagram(invalidClauseIdDiagram),
      ).toThrow(/Invariante T1\.5 violado: cláusula sem ID MACULA válido/);

      const invalidWordIdDiagram: SyntaxDiagramResponse = {
        ...invalidClauseIdDiagram,
        rootClauses: [
          {
            id: 'n43001001001',
            level: 0,
            clauseType: 'main',
            labelPt: 'Cláusula Principal',
            textOriginal: 'Ἐν ἀρχῇ',
            textTranslation: 'In beginning',
            words: [
              { id: 'n43001001001', word: 'Ἐν' },
              { word: 'ἀρχῇ' }, // palavra sem ID MACULA
            ],
          },
        ],
      };

      expect(() =>
        assertValidMaculaTreebankDiagram(invalidWordIdDiagram),
      ).toThrow(/Invariante T1\.5 violado: palavra "ἀρχῇ"/);
    });
  });
});
