import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { PrismaService } from '../prisma.service';
import { AiQuotaService } from '../rag/ai-quota.service';
import { FakePaymentProvider } from './fake-payment-provider';
import { DisabledPaymentProvider } from './disabled-payment-provider';
import { BillingModule } from './billing.module';

describe('BillingModule (T0.1 Security & Idempotency)', () => {
  let service: BillingService;
  let controller: BillingController;
  let mockPrisma: any;
  let mockAiQuota: any;
  let fakePaymentProvider: FakePaymentProvider;

  beforeEach(async () => {
    mockPrisma = {
      billingEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'evt-1' }),
      },
      user: {
        update: jest.fn().mockResolvedValue({ id: 'user-1', plan: 'PLUS' }),
        findUnique: jest.fn().mockResolvedValue({ id: 'user-1', plan: 'PLUS' }),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => {
        return callback(mockPrisma);
      }),
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

    fakePaymentProvider = new FakePaymentProvider();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BillingController],
      providers: [
        BillingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AiQuotaService, useValue: mockAiQuota },
        { provide: 'PAYMENT_PROVIDER', useValue: fakePaymentProvider },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
    controller = module.get<BillingController>(BillingController);
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
    });
  });

  describe('getUserUsage', () => {
    it('deve retornar cota e detalhes do plano do usuário', async () => {
      const usage = await service.getUserUsage('user-1');
      expect(usage.status.plano).toBe('PLUS');
      expect(usage.status.limite).toBe(200);
      expect(usage.status.usado).toBe(15);
      expect(usage.status.restante).toBe(185);
      expect(usage.planDetails.name).toBe('Plus');
    });
  });

  describe('T0.1: Bloqueio de auto-promoção em POST /billing/subscribe', () => {
    it('deve responder 403 Forbidden para plano válido impedindo auto-promoção', async () => {
      await expect(controller.subscribe('CHURCH')).rejects.toThrow(
        ForbiddenException,
      );
      await expect(controller.subscribe('CHURCH')).rejects.toThrow(
        'Assinaturas ainda não estão disponíveis; entre na lista de espera.',
      );
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('deve rejeitar plano inválido com 400 BadRequestException', async () => {
      await expect(controller.subscribe('INVALID_PLAN')).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.subscribe('')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('T0.1: applyPaidPlan e Webhook Seguro', () => {
    it('deve aplicar plano via evento legítimo com registro em BillingEvent', async () => {
      const result = await service.applyPaidPlan('user-1', 'PRO', 'evt-100');

      expect(result.applied).toBe(true);
      expect(result.plan).toBe('PRO');
      expect(mockPrisma.billingEvent.create).toHaveBeenCalledWith({
        data: {
          providerEventId: 'evt-100',
          userId: 'user-1',
          plan: 'PRO',
        },
      });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { plan: 'PRO' },
      });
    });

    it('deve ser idempotente: evento duplicado não reaplica alteração', async () => {
      mockPrisma.billingEvent.findUnique.mockResolvedValueOnce({
        id: 'existing-id',
        providerEventId: 'evt-duplicate',
        userId: 'user-1',
        plan: 'PRO',
        receivedAt: new Date(),
      });

      const result = await service.applyPaidPlan(
        'user-1',
        'PRO',
        'evt-duplicate',
      );

      expect(result.applied).toBe(false);
      expect(result.message).toContain('idempotente');
      expect(mockPrisma.billingEvent.create).not.toHaveBeenCalled();
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('deve propagar falha de banco de dados (ex: read-only) sem retornar sucesso falso', async () => {
      mockPrisma.$transaction.mockRejectedValueOnce(
        new Error('default_transaction_read_only = on'),
      );

      await expect(
        service.applyPaidPlan('user-1', 'PLUS', 'evt-db-error'),
      ).rejects.toThrow('default_transaction_read_only = on');
    });

    it('deve rejeitar plano desconhecido no applyPaidPlan com BadRequestException', async () => {
      await expect(
        service.applyPaidPlan('user-1', 'HACKER_PLAN', 'evt-bad'),
      ).rejects.toThrow(BadRequestException);
    });

    it('webhook deve rejeitar assinatura inválida com 401 UnauthorizedException e não alterar plano', async () => {
      const payload = { eventId: 'evt-999', userId: 'user-1', plan: 'CHURCH' };

      await expect(
        controller.handleWebhook('wrong-signature', payload),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
      expect(mockPrisma.billingEvent.create).not.toHaveBeenCalled();
    });

    it('webhook deve processar com sucesso com assinatura válida', async () => {
      const payload = {
        eventId: 'evt-valid-1',
        userId: 'user-1',
        plan: 'PLUS',
      };

      const res = await controller.handleWebhook(
        'valid-test-signature',
        payload,
      );

      expect(res.success).toBe(true);
      expect(res.data.applied).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { plan: 'PLUS' },
      });
    });
  });
  describe('Provider de produção (fail-closed até D2)', () => {
    it('BillingModule registra DisabledPaymentProvider, nunca o FakePaymentProvider', () => {
      const providers: any[] = Reflect.getMetadata('providers', BillingModule);
      const payment = providers.find(
        (p) => p && typeof p === 'object' && p.provide === 'PAYMENT_PROVIDER',
      );
      expect(payment).toBeDefined();
      expect(payment.useClass).toBe(DisabledPaymentProvider);
      expect(payment.useClass).not.toBe(FakePaymentProvider);
    });

    it('webhook com a assinatura de teste pública é rejeitado em produção e não altera plano', async () => {
      const prodModule: TestingModule = await Test.createTestingModule({
        controllers: [BillingController],
        providers: [
          BillingService,
          { provide: PrismaService, useValue: mockPrisma },
          { provide: AiQuotaService, useValue: mockAiQuota },
          { provide: 'PAYMENT_PROVIDER', useClass: DisabledPaymentProvider },
        ],
      }).compile();
      const prodController =
        prodModule.get<BillingController>(BillingController);

      await expect(
        prodController.handleWebhook('valid-test-signature', {
          eventId: 'evt-attack',
          userId: 'victim',
          plan: 'CHURCH',
        }),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
      expect(mockPrisma.billingEvent.create).not.toHaveBeenCalled();
    });
  });
});
