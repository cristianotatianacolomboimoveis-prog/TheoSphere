import { Test, TestingModule } from '@nestjs/testing';
import { TextualCriticismService } from './textual-criticism.service';
import { PrismaService } from '../prisma.service';

describe('TextualCriticismService', () => {
  let service: TextualCriticismService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      bibleVerse: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TextualCriticismService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TextualCriticismService>(TextualCriticismService);
  });

  describe('getAllVariants', () => {
    it('deve listar todas as variantes catalogadas sem filtros', () => {
      const list = service.getAllVariants();
      expect(list.length).toBeGreaterThanOrEqual(9);
      expect(list.some((item) => item.id === 'ISA.53.11')).toBe(true);
      expect(list.some((item) => item.id === '1JN.5.7')).toBe(true);
    });

    it('deve filtrar corretamente por Testamento (OT vs NT)', () => {
      const otList = service.getAllVariants({ testament: 'OT' });
      expect(otList.length).toBeGreaterThan(0);
      expect(otList.every((v) => v.testament === 'OT')).toBe(true);

      const ntList = service.getAllVariants({ testament: 'NT' });
      expect(ntList.length).toBeGreaterThan(0);
      expect(ntList.every((v) => v.testament === 'NT')).toBe(true);
    });

    it('deve filtrar por impacto teológico', () => {
      const highImpact = service.getAllVariants({ theologicalImpact: 'high' });
      expect(highImpact.length).toBeGreaterThan(0);
      expect(highImpact.every((v) => v.theologicalImpact === 'high')).toBe(
        true,
      );
    });

    it('deve filtrar por termo de busca', () => {
      const results = service.getAllVariants({ searchQuery: 'Golias' });
      expect(results.length).toBe(1);
      expect(results[0].passageRef).toContain('1 Samuel 17:4');
    });
  });

  describe('getVariantById', () => {
    it('deve retornar detalhes da variante de Isaías 53:11 com o Grande Rolo de Qumran (1QIsaᵃ)', () => {
      const variant = service.getVariantById('ISA.53.11');
      expect(variant).not.toBeNull();
      expect(variant?.passageRef).toBe('Isaías 53:11');
      expect(variant?.readings.length).toBeGreaterThanOrEqual(2);
      const dssReading = variant?.readings.find(
        (r) => r.family === 'Qumran_DSS',
      );
      expect(dssReading).toBeDefined();
      expect(dssReading?.originalText).toContain('אוֹר');
      expect(dssReading?.isAdoptedByModernEclectic).toBe(true);
    });

    it('deve retornar a variante do Salmo 22:16 com o manuscrito de Nahal Hever (5/6HevPs)', () => {
      const variant = service.getVariantById('PSA.22.16');
      expect(variant).not.toBeNull();
      expect(variant?.theologicalImpact).toBe('high');
      const dssReading = variant?.readings.find((r) =>
        r.witnessSiglum.includes('Nahal Hever'),
      );
      expect(dssReading).toBeDefined();
      expect(dssReading?.originalText).toContain('כארו');
    });

    it('deve retornar a variante do Comma Johanneum (1 João 5:7-8)', () => {
      const variant = service.getVariantById('1JN.5.7');
      expect(variant).not.toBeNull();
      expect(variant?.criticalRating).toBe('A');
      expect(variant?.scribalCausePt).toContain('Vulgata');
    });

    it('deve retornar null para identificador inexistente', () => {
      const variant = service.getVariantById('NAO_EXISTE_999');
      expect(variant).toBeNull();
    });
  });

  describe('getVariantsForPassage', () => {
    it('deve localizar variantes registradas para uma passagem específica', () => {
      const variants = service.getVariantsForPassage(41, 16, 9);
      expect(variants.length).toBe(1);
      expect(variants[0].passageRef).toContain('Marcos 16');
    });

    it('deve retornar vazio se não houver variante para a passagem', () => {
      const variants = service.getVariantsForPassage(1, 1, 1);
      expect(variants).toEqual([]);
    });
  });

  describe('getManuscriptApparatus', () => {
    it('deve buscar testemunhas textuais do banco e sinalizar variante de catálogo se existir', async () => {
      mockPrisma.bibleVerse.findMany.mockResolvedValue([
        {
          translation: 'WLC',
          text: 'מֵעֲמַל נַפְשׁוֹ יִרְאֶה יִשְׂבָּע',
        },
        {
          translation: 'LXX',
          text: 'δεῖξαι αὐτῷ φῶς καὶ πλάσαι τῇ συνέσει',
        },
        {
          translation: 'BLIVRE',
          text: 'Do trabalho da sua alma ele verá e ficará satisfeito.',
        },
      ]);

      const apparatus = await service.getManuscriptApparatus('23', 53, 11);
      expect(apparatus.hasNotableCatalogVariant).toBe(true);
      expect(apparatus.catalogVariant?.id).toBe('ISA.53.11');
      expect(apparatus.manuscriptWitnesses.length).toBe(3);
      expect(apparatus.manuscriptWitnesses[0].sourceName).toContain(
        'Leningrad',
      );
    });
  });
});
