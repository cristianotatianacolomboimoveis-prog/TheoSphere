import { Test, TestingModule } from '@nestjs/testing';
import { LinguisticsService } from './linguistics.service';
import { PrismaService } from '../prisma.service';

/**
 * Testes do LinguisticsService (interlinear STEP Bible).
 * Inclui regressão para o findOccurrencesByRoot reescrito na auditoria
 * 2026-07-21 (antes: `text contains strongId` — full scan sempre-vazio).
 */
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

  describe('findOccurrencesByRoot (regressão auditoria 2026-07-21)', () => {
    it('busca via InterlinearWord (NÃO via text contains)', async () => {
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
      // O texto vem por join em UMA query (sem N+1), com dedup de refs
      expect(prisma.bibleVerse.findMany).toHaveBeenCalledTimes(1);
      expect(res).toHaveLength(1);
      expect(res[0]).toMatchObject({
        reference: '43 3:16',
        word: 'ἠγάπησεν',
        text: 'Porque Deus amou o mundo...',
      });
    });

    it('sem ocorrências → [] sem consultar BibleVerse', async () => {
      prisma.interlinearWord.findMany.mockResolvedValue([]);
      const res = await service.findOccurrencesByRoot('G9999');
      expect(res).toEqual([]);
      expect(prisma.bibleVerse.findMany).not.toHaveBeenCalled();
    });

    it('versículo sem texto na tradução pedida → text null (não quebra)', async () => {
      prisma.interlinearWord.findMany.mockResolvedValue([word()]);
      prisma.bibleVerse.findMany.mockResolvedValue([]);

      const res = await service.findOccurrencesByRoot('G25', 'KJV');
      expect(res[0].text).toBeNull();
      expect(prisma.bibleVerse.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ translation: 'KJV' }),
        }),
      );
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
});
