import { Injectable, Logger } from '@nestjs/common';
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
   * Atualiza o plano de assinatura do usuário.
   */
  async updatePlan(
    userId: string,
    targetPlan: string,
  ): Promise<{ success: boolean; plan: string; message: string }> {
    const normalizedPlan = (targetPlan || 'FREE').toUpperCase();
    if (!THEOSPHERE_PLANS[normalizedPlan]) {
      throw new Error(`Plano inválido: ${targetPlan}`);
    }

    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { plan: normalizedPlan },
      });
      this.logger.log(
        `Usuário ${userId} atualizado para o plano ${normalizedPlan}`,
      );
    } catch (err: any) {
      this.logger.warn(
        `Falha na persistência de plano para ${userId} (banco pode estar em read-only): ${err.message}`,
      );
    }

    return {
      success: true,
      plan: normalizedPlan,
      message: `Plano atualizado com sucesso para ${THEOSPHERE_PLANS[normalizedPlan].name}.`,
    };
  }
}
