import { Test, TestingModule } from '@nestjs/testing';
import { ConstructSearchService } from './construct-search.service';
import { PrismaService } from '../prisma.service';
import { InterlinearWordRow } from './linguistics.service';

describe('ConstructSearchService', () => {
  let service: ConstructSearchService;
  let prisma: {
    interlinearWord: {
      findMany: jest.Mock;
    };
    bibleVerse: {
      findFirst: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      interlinearWord: {
        findMany: jest.fn(),
      },
      bibleVerse: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConstructSearchService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ConstructSearchService>(ConstructSearchService);
  });

  describe('getPresets', () => {
    it('deve retornar presets clássicos de exegese grega', () => {
      const presets = service.getPresets();
      expect(presets.length).toBeGreaterThanOrEqual(4);
      expect(presets.some((p) => p.id === 'granville-sharp-rule')).toBe(true);
      expect(presets.some((p) => p.id === 'genitive-absolute')).toBe(true);
      expect(presets.some((p) => p.id === 'hina-subjunctive-purpose')).toBe(
        true,
      );
    });
  });

  describe('matchWord', () => {
    const sampleWord: InterlinearWordRow = {
      id: '1',
      bookId: 40,
      chapter: 1,
      verse: 18,
      position: 3,
      word: 'Ἰησοῦ',
      translit: 'Iēsou',
      gloss: 'Jesus',
      glossEs: 'Jesús',
      strongId: 'G2424',
      morph: 'N-GSM',
      lemma: 'Ἰησοῦς',
      lemmaGloss: 'Jesus',
    };

    it('deve casar por classe gramatical Substantivo (N)', () => {
      expect(
        service.matchWord(sampleWord, { id: 'b1', partOfSpeech: 'N' }),
      ).toBe(true);
      expect(
        service.matchWord(sampleWord, { id: 'b1', partOfSpeech: 'V' }),
      ).toBe(false);
    });

    it('deve casar por caso Genitivo (G)', () => {
      expect(
        service.matchWord(sampleWord, { id: 'b1', grammaticalCase: 'G' }),
      ).toBe(true);
      expect(
        service.matchWord(sampleWord, { id: 'b1', grammaticalCase: 'N' }),
      ).toBe(false);
    });

    it('deve casar por Strong ID', () => {
      expect(
        service.matchWord(sampleWord, { id: 'b1', strongId: 'G2424' }),
      ).toBe(true);
      expect(
        service.matchWord(sampleWord, { id: 'b1', strongId: 'G3056' }),
      ).toBe(false);
    });

    it('deve casar por modo verbal Particípio (P)', () => {
      const participleWord: InterlinearWordRow = {
        ...sampleWord,
        word: 'λέγων',
        morph: 'V-PAP-NSM',
      };
      expect(
        service.matchWord(participleWord, {
          id: 'b1',
          partOfSpeech: 'V',
          mood: 'P',
        }),
      ).toBe(true);
      expect(
        service.matchWord(participleWord, {
          id: 'b1',
          partOfSpeech: 'V',
          mood: 'I',
        }),
      ).toBe(false);
    });
  });

  describe('executeQuery', () => {
    it('deve retornar vazio se não houver blocos na consulta', async () => {
      const result = await service.executeQuery({
        language: 'greek',
        blocks: [],
        distance: 'adjacent',
      });
      expect(result.totalMatches).toBe(0);
      expect(result.verses).toEqual([]);
    });

    it('deve encontrar uma construção sintática em sequência adjacente', async () => {
      // Simula versículo Mt 1:18 com Genitivo Absoluto (Substantivo no Genitivo + Particípio no Genitivo)
      const mockWords: InterlinearWordRow[] = [
        {
          id: 'w1',
          bookId: 40,
          chapter: 1,
          verse: 18,
          position: 1,
          word: 'Μνηστευθείσης',
          translit: 'Mnēsteutheisēs',
          gloss: 'having been betrothed',
          glossEs: 'estando desposada',
          strongId: 'G3423',
          morph: 'V-APP-GSF',
          lemma: 'μνηστεύω',
          lemmaGloss: 'to betroth',
        },
        {
          id: 'w2',
          bookId: 40,
          chapter: 1,
          verse: 18,
          position: 2,
          word: 'Μαρίας',
          translit: 'Marias',
          gloss: 'Mary',
          glossEs: 'María',
          strongId: 'G3137',
          morph: 'N-GSF',
          lemma: 'Μαρία',
          lemmaGloss: 'Mary',
        },
      ];

      prisma.interlinearWord.findMany
        .mockResolvedValueOnce([mockWords[0]]) // Busca candidatas do primeiro bloco
        .mockResolvedValueOnce(mockWords); // Busca palavras completas do versículo

      prisma.bibleVerse.findFirst.mockResolvedValueOnce({
        text: 'Ora, o nascimento de Jesus Cristo foi assim: Estando Maria, sua mãe, desposada com José...',
      });

      const result = await service.executeQuery({
        language: 'greek',
        blocks: [
          { id: 'b1', partOfSpeech: 'V', mood: 'P', grammaticalCase: 'G' }, // Particípio no Genitivo
          { id: 'b2', partOfSpeech: 'N', grammaticalCase: 'G' }, // Substantivo no Genitivo
        ],
        distance: 'adjacent',
      });

      expect(result.totalMatches).toBe(1);
      expect(result.verses[0].bookName).toBe('Mateus');
      expect(result.verses[0].chapter).toBe(1);
      expect(result.verses[0].verse).toBe(18);
      expect(result.verses[0].matchedWords.length).toBe(2);
      expect(result.verses[0].matchedWords[0].word).toBe('Μνηστευθείσης');
      expect(result.verses[0].matchedWords[1].word).toBe('Μαρίας');
      expect(result.distributionByBook['Mateus']).toBe(1);
    });
  });
});
