import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import {
  ALLOWED_TRANSLATIONS,
  TRANSLATION_LANGUAGES,
} from './bible-comparison.service';
import { TextualCriticismService } from '../linguistics/textual-criticism.service';
import { PrismaService } from '../prisma.service';

describe('T1.1 — Texto Grego Crítico do NT (SBLGNT)', () => {
  describe('Configurações Canônicas de Tradução', () => {
    it('deve registrar SBLGNT nas traduções permitidas para comparação sinótica', () => {
      expect(ALLOWED_TRANSLATIONS.has('SBLGNT')).toBe(true);
      expect(ALLOWED_TRANSLATIONS.has('TR')).toBe(true);
    });

    it('deve mapear o idioma do SBLGNT como grego antigo (grc)', () => {
      expect(TRANSLATION_LANGUAGES['SBLGNT']).toBe('grc');
      expect(TRANSLATION_LANGUAGES['TR']).toBe('grc');
      expect(TRANSLATION_LANGUAGES['LXX']).toBe('grc');
    });
  });

  describe('Integração com Crítica Textual (Testemunhas do NT)', () => {
    let service: TextualCriticismService;
    let mockPrisma: any;

    beforeEach(() => {
      mockPrisma = {
        bibleVerse: {
          findMany: jest.fn().mockImplementation((args: any) => {
            const inTranslations: string[] = args.where.translation.in;
            // Retorna linhas simuladas correspondentes
            return Promise.resolve(
              inTranslations.map((tr) => ({
                translation: tr,
                text: `Texto de teste para ${tr}`,
              })),
            );
          }),
        },
      };
      service = new TextualCriticismService(mockPrisma as PrismaService);
    });

    it('deve incluir SBLGNT como primeira testemunha crítica para passagens do Novo Testamento', async () => {
      const result = await service.getManuscriptApparatus('40', 1, 1); // Mateus 1:1

      const sblWitness = result.manuscriptWitnesses.find(
        (w) => w.translationCode === 'SBLGNT',
      );
      expect(sblWitness).toBeDefined();
      expect(sblWitness?.sourceName).toContain('SBL Greek New Testament');
      expect(sblWitness?.sourceName).toContain('Texto Crítico Alexandrino');
      expect(sblWitness?.language).toBe('Grego');

      const trWitness = result.manuscriptWitnesses.find(
        (w) => w.translationCode === 'TR',
      );
      expect(trWitness).toBeDefined();
      expect(trWitness?.sourceName).toContain('Textus Receptus');
    });

    it('não deve incluir SBLGNT em passagens do Antigo Testamento (usa WLC e LXX)', async () => {
      const result = await service.getManuscriptApparatus('1', 1, 1); // Gênesis 1:1

      const sblWitness = result.manuscriptWitnesses.find(
        (w) => w.translationCode === 'SBLGNT',
      );
      expect(sblWitness).toBeUndefined();

      const wlcWitness = result.manuscriptWitnesses.find(
        (w) => w.translationCode === 'WLC',
      );
      expect(wlcWitness).toBeDefined();

      const lxxWitness = result.manuscriptWitnesses.find(
        (w) => w.translationCode === 'LXX',
      );
      expect(lxxWitness).toBeDefined();
    });
  });

  describe('Integridade do Dataset Oficial Offline (sblgnt-verses.json.gz)', () => {
    const datasetPath = path.join(
      __dirname,
      '../../prisma/data/sblgnt-verses.json.gz',
    );

    it('deve existir o arquivo compactado do dataset no repositório', () => {
      expect(fs.existsSync(datasetPath)).toBe(true);
    });

    it('deve conter exatamente 7.958 versículos distribuídos nos 27 livros do NT', () => {
      const raw = fs.readFileSync(datasetPath);
      const decompressed = zlib.gunzipSync(raw);
      const data = JSON.parse(decompressed.toString('utf-8'));

      expect(data.totalVerses).toBe(7958);
      expect(data.verses.length).toBe(7958);
      expect(data.license).toContain('CC BY 4.0');
      expect(data.copyright).toContain('Society of Biblical Literature');

      // Verifica distribuição dos 27 livros (IDs 40 a 66)
      const bookIds = new Set(data.verses.map((v: any) => v.bookId));
      expect(bookIds.size).toBe(27);
      for (let id = 40; id <= 66; id++) {
        expect(bookIds.has(id)).toBe(true);
      }

      // Verifica integridade de amostra (Mateus 1:1)
      const mat1v1 = data.verses.find(
        (v: any) => v.bookId === 40 && v.chapter === 1 && v.verse === 1,
      );
      expect(mat1v1).toBeDefined();
      expect(mat1v1.text).toBe(
        'Βίβλος γενέσεως Ἰησοῦ χριστοῦ υἱοῦ Δαυὶδ υἱοῦ Ἀβραάμ.',
      );
      expect(mat1v1.translation).toBe('SBLGNT');
      expect(mat1v1.testament).toBe('NT');

      // Verifica tokenização com Strong e Morfologia
      expect(mat1v1.words.length).toBeGreaterThanOrEqual(8);
      expect(mat1v1.words[0]).toEqual({
        position: 1,
        word: 'Βίβλος',
        strong: 'G976',
        morph: 'N-NSF',
      });
    });
  });
});
