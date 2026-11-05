import { Test, TestingModule } from '@nestjs/testing';
import { BillingService } from './billing.service';
import { PrismaService } from '../prisma.service';
import { AiQuotaService } from '../rag/ai-quota.service';
import { THEOSPHERE_PLANS } from './plans.constants';

describe('BillingService', () => {
  let service: BillingService;
  let mockPrisma: any;
  let mockAiQuota: any;

  beforeEach(async () => {
    mockPrisma = {
      user: {
        update: jest.fn().mockResolvedValue({ id: 'user-1', plan: 'PLUS' }),
        findUnique: jest.fn().mockResolvedValue({ id: 'user-1', plan: 'PLUS' }),
      },
    };

    mockAiQuota = {
      consultar: jest.fn().mockResolvedValue({
        usado: 15,
        limite: 200,
        restante: 185,
        excedeu: false,
        plano: 'PLUS',
        diasParaRenovar: 25,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AiQuotaService, useValue: mockAiQuota },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  describe('getPlans', () => {
    it('deve retornar os 5 planos canônicos com moeda BRL', () => {
      const result = service.getPlans();
      expect(result.currency).toBe('BRL');
      expect(result.plans.length).toBe(5);

      const starter = result.plans.find((p) => p.id === 'STARTER');
      expect(starter).toBeDefined();
      expect(starter?.priceMonthly).toBe(14.9);
      expect(starter?.aiCreditsMonthly).toBe(60);

      const plus = result.plans.find((p) => p.id === 'PLUS');
      expect(plus).toBeDefined();
      expect(plus?.priceMonthly).toBe(24.9);
      expect(plus?.aiCreditsMonthly).toBe(200);
      expect(plus?.highlight).toBe(true);

      const pro = result.plans.find((p) => p.id === 'PRO');
      expect(pro).toBeDefined();
      expect(pro?.priceMonthly).toBe(39.9);
      expect(pro?.aiCreditsMonthly).toBe(600);

      const church = result.plans.find((p) => p.id === 'CHURCH');
      expect(church).toBeDefined();
      expect(church?.priceMonthly).toBe(99.9);
      expect(church?.aiCreditsMonthly).toBe(1500);
    });
  });

  describe('getUserUsage', () => {
    it('deve retornar a cota e detalhes do plano do usuário', async () => {
      const usage = await service.getUserUsage('user-1');
      expect(usage.status.plano).toBe('PLUS');
      expect(usage.status.limite).toBe(200);
      expect(usage.status.usado).toBe(15);
      expect(usage.status.restante).toBe(185);
      expect(usage.planDetails.name).toBe('Plus');
    });

    it('deve tratar usuário visitante (public-guest)', async () => {
      mockAiQuota.consultar.mockResolvedValueOnce({
        usado: 0,
        limite: 10,
        restante: 10,
        excedeu: false,
        plano: 'FREE',
        diasParaRenovar: 30,
      });

      const usage = await service.getUserUsage(undefined);
      expect(usage.status.plano).toBe('FREE');
      expect(usage.status.limite).toBe(10);
      expect(usage.planDetails.name).toBe('Gratuito');
    });
  });

  describe('updatePlan', () => {
    it('deve atualizar o plano do usuário', async () => {
      const res = await service.updatePlan('user-1', 'PRO');
      expect(res.success).toBe(true);
      expect(res.plan).toBe('PRO');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { plan: 'PRO' },
      });
    });

    it('deve rejeitar planos desconhecidos', async () => {
      await expect(
        service.updatePlan('user-1', 'INVALID_PLAN'),
      ).rejects.toThrow('Plano inválido: INVALID_PLAN');
    });
  });
});
