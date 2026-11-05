import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AiQuotaService, QuotaStatus } from '../rag/ai-quota.service';
import { THEOSPHERE_PLANS, PlanDefinition } from './plans.constants';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiQuota: AiQuotaService,
  ) {}

  /**
   * Retorna o catálogo completo de planos e preços do TheoSphere.
   */
  getPlans(): { plans: PlanDefinition[]; currency: string } {
    return {
      plans: Object.values(THEOSPHERE_PLANS),
      currency: 'BRL',
    };
  }

  /**
   * Retorna os detalhes de uso e saldo de IA do usuário atual.
   */
  async getUserUsage(userId?: string): Promise<{
    status: QuotaStatus;
    planDetails: PlanDefinition;
  }> {
    const id = userId || 'public-guest';
    const status = await this.aiQuota.consultar(id);
    const planKey = (status.plano || 'FREE').toUpperCase();
    const planDetails = THEOSPHERE_PLANS[planKey] || THEOSPHERE_PLANS.FREE;

    return {
      status,
      planDetails,
    };
  }

  /**
   * T0.1: Única via legítima de mudança de plano no sistema.
   * Chamado exclusivamente pelo fluxo de webhook com verificação de assinatura.
   * Garante idempotência via BillingEvent e propaga falhas de persistência.
   */
  async applyPaidPlan(
    userId: string,
    plan: string,
    providerEventId: string,
  ): Promise<{ applied: boolean; plan: string; message: string }> {
    if (!plan || typeof plan !== 'string') {
      throw new BadRequestException('O plano é obrigatório.');
    }

    const normalizedPlan = plan.toUpperCase().trim();
    if (!THEOSPHERE_PLANS[normalizedPlan]) {
      throw new BadRequestException(`Plano inválido: ${plan}`);
    }

    if (!providerEventId || !providerEventId.trim()) {
      throw new BadRequestException('providerEventId é obrigatório.');
    }

    if (!userId || !userId.trim()) {
      throw new BadRequestException('userId é obrigatório.');
    }

    // Idempotência: verificar se o evento do provedor já foi processado
    const existingEvent = await this.prisma.billingEvent.findUnique({
      where: { providerEventId },
    });

    if (existingEvent) {
      this.logger.warn(
        `Evento ${providerEventId} já foi processado anteriormente. Ignorando para idempotência.`,
      );
      return {
        applied: false,
        plan: existingEvent.plan,
        message: 'Evento já processado anteriormente (idempotente).',
      };
    }

    // Persistência em transação atômica. NUNCA engolir erros: propaga se falhar (ex.: DB read-only).
    await this.prisma.$transaction(async (tx) => {
      await tx.billingEvent.create({
        data: {
          providerEventId,
          userId,
          plan: normalizedPlan,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { plan: normalizedPlan },
      });
    });

    this.logger.log(
      `Plano ${normalizedPlan} ativado com sucesso para usuário ${userId} via evento ${providerEventId}`,
    );

    return {
      applied: true,
      plan: normalizedPlan,
      message: `Plano atualizado com sucesso para ${THEOSPHERE_PLANS[normalizedPlan].name}.`,
    };
  }
}
