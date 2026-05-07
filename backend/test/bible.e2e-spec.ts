import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';

describe('BibleController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/v1/bible/chapter (GET) should ingest and return verses', async () => {
    // We use a known small chapter to test ingestion
    // Jude (book 65) chapter 1
    const response = await request(app.getHttpServer())
      .get('/api/v1/bible/chapter')
      .query({ translation: 'KJV', bookId: 65, chapter: 1 });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data.verses)).toBe(true);
    expect(response.body.data.verses.length).toBeGreaterThan(0);

    // Verify it was saved to DB
    const count = await prisma.bibleVerse.count({
      where: { translation: 'KJV', bookId: 65, chapter: 1 },
    });
    expect(count).toBeGreaterThan(0);
  });

  it('/api/v1/bible/versions (GET) should return available versions', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/v1/bible/versions',
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toContain('ARA');
    expect(response.body.data).toContain('KJV');
  });
});
