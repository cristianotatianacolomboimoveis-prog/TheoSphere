import { Test, TestingModule } from '@nestjs/testing';
import { LinguisticsService } from './linguistics.service';
import { PrismaService } from '../prisma.service';

describe('LinguisticsService', () => {
  let service: LinguisticsService;
  let prisma: {
    interlinearWord: { findMany: jest.Mock; count: jest.Mock };
    lexicalEntry: { findFirst: jest.Mock };
    bibleVerse: { findMany: jest.Mock };
  };

  const word = (over: Partial<Record<string, unknown>> = {}) => ({
    id: 'w1',
    bookId: 43,
    chapter: 3,
    verse: 16,
    position: 1,
    word: 'ἠγάπησεν',
    translit: 'ēgapēsen',
    gloss: 'loved',
    glossEs: 'amó',
    strongId: 'G25',
    morph: 'V-AAI-3S',
    lemma: 'ἀγαπάω',
    lemmaGloss: 'to love',
    ...over,
  });

  beforeEach(async () => {
    prisma = {
      interlinearWord: { findMany: jest.fn(), count: jest.fn() },
      lexicalEntry: { findFirst: jest.fn() },
      bibleVerse: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinguisticsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(LinguisticsService);
  });

  describe('getInterlinearChapter', () => {
    it('agrupa palavras por versículo e rotula a fonte do NT como TAGNT', async () => {
      prisma.interlinearWord.findMany.mockResolvedValue([
        word({ verse: 16, position: 1 }),
        word({ id: 'w2', verse: 16, position: 2 }),
        word({ id: 'w3', verse: 17, position: 1 }),
      ]);

      const res = await service.getInterlinearChapter(43, 3);

      expect(res.available).toBe(true);
      expect(res.source).toContain('TAGNT');
      expect(res.verses[16]).toHaveLength(2);
      expect(res.verses[17]).toHaveLength(1);
    });

    it('AT (bookId < 40) rotula TAHOT', async () => {
      prisma.interlinearWord.findMany.mockResolvedValue([
        word({ bookId: 19, chapter: 23, verse: 1, strongId: 'H3068' }),
      ]);
      const res = await service.getInterlinearChapter(19, 23);
      expect(res.source).toContain('TAHOT');
    });

    it('capítulo sem dados → available false e source null', async () => {
      prisma.interlinearWord.findMany.mockResolvedValue([]);
      const res = await service.getInterlinearChapter(1, 1);
      expect(res.available).toBe(false);
      expect(res.source).toBeNull();
    });
  });

  describe('getOccurrences', () => {
    it('normaliza strongId e limita a 200', async () => {
      prisma.interlinearWord.count.mockResolvedValue(1);
      prisma.interlinearWord.findMany.mockResolvedValue([word()]);

      const res = await service.getOccurrences('  g25 ', 999);

      expect(res.strongId).toBe('G25');
      expect(prisma.interlinearWord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { strongId: 'G25' },
          take: 200,
        }),
      );
      expect(res.total).toBe(1);
      expect(res.occurrences[0]).toMatchObject({
        bookId: 43,
        gloss: 'loved',
        morph: 'V-AAI-3S',
      });
    });
  });

  describe('findOccurrencesByRoot', () => {
    it('busca via InterlinearWord (não via text contains)', async () => {
      prisma.interlinearWord.findMany.mockResolvedValue([word()]);
      prisma.bibleVerse.findMany.mockResolvedValue([
        {
          bookId: 43,
          chapter: 3,
          verse: 16,
          text: 'Porque Deus amou o mundo...',
        },
      ]);

      const res = await service.findOccurrencesByRoot('g25');

      expect(prisma.interlinearWord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { strongId: 'G25' } }),
      );
      expect(prisma.bibleVerse.findMany).toHaveBeenCalledTimes(1);
      expect(res).toHaveLength(1);
      expect(res[0]).toMatchObject({
        reference: '43 3:16',
        word: 'ἠγάπησεν',
        text: 'Porque Deus amou o mundo...',
      });
    });

    it('normaliza translation e retorna null quando a tradução não possui o versículo', async () => {
      prisma.interlinearWord.findMany.mockResolvedValue([word()]);
      prisma.bibleVerse.findMany.mockResolvedValue([]);

      const res = await service.findOccurrencesByRoot('G25', 'kjv');

      expect(res[0].text).toBeNull();
      expect(prisma.bibleVerse.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ translation: 'KJV' }),
        }),
      );
    });

    it('sem ocorrências → [] sem consultar BibleVerse', async () => {
      prisma.interlinearWord.findMany.mockResolvedValue([]);
      const res = await service.findOccurrencesByRoot('G9999');
      expect(res).toEqual([]);
      expect(prisma.bibleVerse.findMany).not.toHaveBeenCalled();
    });
  });

  describe('getRootAnalysis', () => {
    it('retorna entrada léxica com lemma derivado quando existe', async () => {
      prisma.lexicalEntry.findFirst.mockResolvedValue({
        strongId: 'G25',
        word: 'ἀγαπάω',
        language: 'GK',
        definition: 'amar',
      });
      const res = await service.getRootAnalysis('G25');
      expect(res).toMatchObject({
        lemma: 'ἀγαπάω',
        source: expect.any(String),
      });
    });

    it('retorna null quando não há entrada', async () => {
      prisma.lexicalEntry.findFirst.mockResolvedValue(null);
      expect(await service.getRootAnalysis('G0')).toBeNull();
    });
  });

  describe('lemmatize', () => {
    it('resolve forma grega real para lema, morfologia e Strong sem inventar dados', async () => {
      prisma.interlinearWord.findMany.mockResolvedValue([
        word(),
        word({ id: 'w2', strongId: 'H1961', lemma: 'היה' }),
      ]);

      const res = await service.lemmatize('  ἠγάπησεν,  ', 'greek');

      expect(res).toMatchObject({
        original: '  ἠγάπησεν,  ',
        normalized: 'ἠγάπησεν',
        language: 'greek',
        found: true,
        lemma: 'ἀγαπάω',
        morphology: 'V-AAI-3S',
        strongId: 'G25',
        source: 'STEP Bible TAGNT/TAHOT indexed corpus',
      });
      expect(res.candidates).toHaveLength(1);
      expect(prisma.interlinearWord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { word: 'ἠγάπησεν' },
          take: 100,
        }),
      );
    });

    it('faz distinção entre grego e hebraico quando a forma possui candidatos de ambos', async () => {
      prisma.interlinearWord.findMany.mockResolvedValue([
        word(),
        word({ id: 'w2', strongId: 'H9999', word: 'ἠγάπησεν', lemma: 'אחר' }),
      ]);

      const greek = await service.lemmatize('ἠγάπησεν', 'greek');
      const hebrew = await service.lemmatize('ἠγάπησεν', 'hebrew');

      expect(greek.candidates).toHaveLength(1);
      expect(greek.strongId).toBe('G25');
      expect(hebrew.candidates).toHaveLength(1);
      expect(hebrew.strongId).toBe('H9999');
    });

    it('retorna found=false e não força um lema quando a forma não está no corpus', async () => {
      prisma.interlinearWord.findMany.mockResolvedValue([]);

      const res = await service.lemmatize('λέξη-inexistente', 'greek');

      expect(res).toMatchObject({
        found: false,
        lemma: null,
        morphology: null,
        strongId: null,
        candidates: [],
        source: null,
      });
    });

    it('entrada vazia não consulta o banco', async () => {
      const res = await service.lemmatize('   ', 'greek');

      expect(res.found).toBe(false);
      expect(res.normalized).toBe('');
      expect(prisma.interlinearWord.findMany).not.toHaveBeenCalled();
    });
  });

  describe('L1 in-memory cache', () => {
    it('evita consultas duplicadas no banco para o mesmo capítulo interlinear', async () => {
      prisma.interlinearWord.findMany.mockResolvedValue([
        word({ verse: 1, position: 1 }),
      ]);

      const first = await service.getInterlinearChapter(43, 3);
      const second = await service.getInterlinearChapter(43, 3);

      expect(first).toEqual(second);
      expect(prisma.interlinearWord.findMany).toHaveBeenCalledTimes(1);

      const stats = service.getCacheStats().interlinearChapters;
      expect(stats.hits).toBe(1);
      expect(stats.size).toBe(1);
    });

    it('evita consultas duplicadas no banco para a mesma raiz em getOccurrences', async () => {
      prisma.interlinearWord.count.mockResolvedValue(10);
      prisma.interlinearWord.findMany.mockResolvedValue([word()]);

      const first = await service.getOccurrences('G25');
      const second = await service.getOccurrences('G25');

      expect(first).toEqual(second);
      expect(prisma.interlinearWord.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.interlinearWord.count).toHaveBeenCalledTimes(1);

      const stats = service.getCacheStats().occurrences;
      expect(stats.hits).toBe(1);
    });

    it('evita consultas duplicadas no banco para o mesmo Strong em getRootAnalysis', async () => {
      prisma.lexicalEntry.findFirst.mockResolvedValue({
        id: 'l1',
        strongId: 'G25',
        word: 'ἀγαπάω',
        pronunciation: 'agapaō',
        definition: 'to love',
      });

      const first = await service.getRootAnalysis('G25');
      const second = await service.getRootAnalysis('G25');

      expect(first).toEqual(second);
      expect(prisma.lexicalEntry.findFirst).toHaveBeenCalledTimes(1);

      const stats = service.getCacheStats().rootAnalysis;
      expect(stats.hits).toBe(1);
    });

    it('evita consultas duplicadas no banco para o mesmo Strong em getWordStudyDetails', async () => {
      prisma.interlinearWord.findMany.mockResolvedValue([
        word({ bookId: 43, chapter: 3, verse: 16, word: 'ἠγάπησεν' }),
      ]);
      prisma.lexicalEntry.findFirst.mockResolvedValue(null);

      const first = await service.getWordStudyDetails('G25');
      const second = await service.getWordStudyDetails('G25');

      expect(first).toEqual(second);
      expect(prisma.interlinearWord.findMany).toHaveBeenCalledTimes(1);

      const stats = service.getCacheStats().wordStudies;
      expect(stats.hits).toBe(1);
    });
  });

  describe('getWordStudyDetails', () => {
    it('calcula distribuição canônica, distribuição por livro e formas flexionadas', async () => {
      prisma.interlinearWord.findMany.mockResolvedValue([
        word({ id: 'w1', bookId: 43, chapter: 3, verse: 16, word: 'ἠγάπησεν' }),
        word({ id: 'w2', bookId: 43, chapter: 14, verse: 21, word: 'ἀγαπῶν' }),
        word({ id: 'w3', bookId: 45, chapter: 8, verse: 37, word: 'ἠγάπησεν' }),
      ]);
      prisma.lexicalEntry.findFirst.mockResolvedValue({
        id: 'lex1',
        strongId: 'G25',
        word: 'ἀγαπάω',
        definition: 'Amar incondicionalmente',
      });

      const res = await service.getWordStudyDetails('G25');

      expect(res.strongId).toBe('G25');
      expect(res.totalOccurrences).toBe(3);
      expect(res.lemma).toBe('ἀγαπάω');

      // Distribuição canônica
      const evangelhos = res.canonicalDistribution.find(
        (g) => g.name === 'Evangelhos',
      );
      const paulinas = res.canonicalDistribution.find(
        (g) => g.name === 'Epístolas Paulinas',
      );
      expect(evangelhos?.count).toBe(2);
      expect(paulinas?.count).toBe(1);

      // Distribuição por livro
      expect(res.bookDistribution).toEqual([
        { bookId: 43, bookName: 'João', count: 2 },
        { bookId: 45, bookName: 'Romanos', count: 1 },
      ]);

      // Formas flexionadas (ordenadas por count desc)
      expect(res.inflectedForms).toHaveLength(2);
      expect(res.inflectedForms[0].word).toBe('ἠγάπησεν');
      expect(res.inflectedForms[0].count).toBe(2);
      expect(res.inflectedForms[1].word).toBe('ἀγαπῶν');
      expect(res.inflectedForms[1].count).toBe(1);
    });

    it('retorna estrutura íntegra quando não há ocorrências cadastradas', async () => {
      prisma.interlinearWord.findMany.mockResolvedValue([]);
      prisma.lexicalEntry.findFirst.mockResolvedValue(null);

      const res = await service.getWordStudyDetails('G9999');

      expect(res.strongId).toBe('G9999');
      expect(res.totalOccurrences).toBe(0);
      expect(res.canonicalDistribution).toEqual([]);
      expect(res.bookDistribution).toEqual([]);
      expect(res.inflectedForms).toEqual([]);
    });
  });
});
