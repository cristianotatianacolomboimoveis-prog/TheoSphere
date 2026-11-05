import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  Header,
  BadRequestException,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Request } from 'express';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  /**
   * Catálogo público de planos, limites de IA e tabela de preços.
   */
  @Get('plans')
  @Header('Cache-Control', 'public, max-age=3600')
  getPlans() {
    return {
      success: true,
      data: this.billingService.getPlans(),
    };
  }

  /**
   * Saldo de créditos de IA e status do ciclo mensal do usuário autenticado.
   */
  @Get('usage')
  @UseGuards(JwtAuthGuard)
  async getUsage(@Req() req: Request) {
    const userId = (req as any).user?.userId || (req as any).user?.id;
    const usage = await this.billingService.getUserUsage(userId);
    return {
      success: true,
      data: usage,
    };
  }

  /**
   * Atualização de plano (ou simulação de ativação de assinatura).
   */
  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  async subscribe(@Body('plan') targetPlan: string, @Req() req: Request) {
    if (!targetPlan) {
      throw new BadRequestException('O plano desejado é obrigatório.');
    }
    const userId = (req as any).user?.userId || (req as any).user?.id;
    const result = await this.billingService.updatePlan(userId, targetPlan);
    return {
      success: true,
      data: result,
    };
  }
}
