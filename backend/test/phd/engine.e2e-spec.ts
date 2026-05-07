import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';

describe('PhD Engine Audit (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  describe('Linguistic Engine (Strong/Lexicon)', () => {
    it('Deve retornar análise exegética para G26 (Agápē)', () => {
      return request(app.getHttpServer())
        .get('/api/v1/bible/lexical/G26')
        .expect(200)
        .then((response) => {
          expect(response.body.success).toBe(true);
          expect(response.body.data).toHaveProperty('lemma');
        });
    });

    it('Deve buscar ocorrências da raiz (Concordância)', () => {
      return request(app.getHttpServer())
        .get('/api/v1/bible/search-root/G26')
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
