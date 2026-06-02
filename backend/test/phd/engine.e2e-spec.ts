import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma.service';

describe('PhD Engine Audit (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Seed test data to ensure e2e tests succeed independently
    const prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Seed Book 1 (Genesis)
    await prisma.book.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        namePt: 'Gênesis',
        nameEn: 'Genesis',
        abbreviation: 'gn',
        chapters: 50,
        testament: 'OT',
      },
    });

    // Seed BibleVerse for Genesis 1:1 (ARA)
    await prisma.bibleVerse.upsert({
      where: {
        translation_bookId_chapter_verse: {
          translation: 'ara',
          bookId: 1,
          chapter: 1,
          verse: 1,
        },
      },
      update: {},
      create: {
        book: 'Gênesis',
        bookId: 1,
        chapter: 1,
        verse: 1,
        text: 'No princípio, criou Deus os céus e a terra.',
        translation: 'ara',
        testament: 'OT',
      },
    });

    // Seed LexicalEntry for G26
    await prisma.lexicalEntry.upsert({
      where: { strongId: 'G26' },
      update: {},
      create: {
        strongId: 'G26',
        word: 'ἀγάπη',
        language: 'GK',
        definition: 'love, benevolence, good will',
      },
    });
  });

  describe('Linguistic Engine (Strong/Lexicon)', () => {
    it('Deve retornar análise exegética para G26 (Agápē)', () => {
      return request(app.getHttpServer())
        .get('/api/v1/linguistics/lexical/G26')
        .expect(200)
        .then((response) => {
          expect(response.body.success).toBe(true);
          expect(response.body.data).toHaveProperty('lemma');
        });
    });

    it('Deve buscar ocorrências da raiz (Concordância)', () => {
      return request(app.getHttpServer())
        .get('/api/v1/linguistics/search-root/G26')
        .expect(200)
        .then((response) => {
          expect(response.body.success).toBe(true);
          expect(Array.isArray(response.body.data)).toBe(true);
        });
    });
  });

  describe('Ingestion Engine (Bible Data)', () => {
    it('Deve carregar capítulo da Bíblia com metadados (ARA)', () => {
      return request(app.getHttpServer())
        .get('/api/v1/bible/chapter/ara/1/1') // Genesis 1
        .expect(200)
        .then((response) => {
          expect(response.body.success).toBe(true);
          expect(response.body.data.verses.length).toBeGreaterThan(0);
        });
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
