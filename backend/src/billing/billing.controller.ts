import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Headers,
  UseGuards,
  Header,
  Inject,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { THEOSPHERE_PLANS } from './plans.constants';
import type { PaymentProvider } from './payment-provider.interface';
import type { Request } from 'express';

@Controller('billing')
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    @Inject('PAYMENT_PROVIDER')
    private readonly paymentProvider: PaymentProvider,
  ) {}

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
   * T0.1: Bloqueia auto-promoção de plano.
   * Enquanto não houver gateway contratado (decisão D2), responde 403 Forbidden.
   */
  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  async subscribe(@Body('plan') targetPlan: string) {
    if (!targetPlan || typeof targetPlan !== 'string') {
      throw new BadRequestException('O plano desejado é obrigatório.');
    }

    const normalized = targetPlan.toUpperCase().trim();
    if (!THEOSPHERE_PLANS[normalized]) {
      throw new BadRequestException(`Plano inválido: ${targetPlan}`);
    }

    throw new ForbiddenException(
      'Assinaturas ainda não estão disponíveis; entre na lista de espera.',
    );
  }

  /**
   * Endpoint de Webhook para processamento seguro de eventos do gateway de pagamento.
   * Valida a assinatura do provedor antes de aplicar qualquer alteração de plano.
   */
  @Post('webhook')
  async handleWebhook(
    @Headers('x-signature') signature: string,
    @Body() payload: any,
  ) {
    if (!this.paymentProvider.verifySignature(payload, signature)) {
      throw new UnauthorizedException('Assinatura de webhook inválida.');
    }

    const event = this.paymentProvider.parseEvent(payload);
    if (!event.userId || !event.plan || !event.providerEventId) {
      throw new BadRequestException('Payload do webhook incompleto.');
    }

    const result = await this.billingService.applyPaidPlan(
      event.userId,
      event.plan,
      event.providerEventId,
    );

    return {
      success: true,
      data: result,
    };
  }
}
