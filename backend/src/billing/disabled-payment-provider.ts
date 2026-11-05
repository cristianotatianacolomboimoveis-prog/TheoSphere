import { Injectable } from '@nestjs/common';
import {
  PaymentProvider,
  PaymentWebhookEvent,
} from './payment-provider.interface';

/**
 * Provedor de pagamento de produção enquanto nenhum gateway real estiver
 * contratado (decisão D2 do dono). Fail-closed: rejeita TODA assinatura, de
 * modo que `POST /billing/webhook` nunca altera plano.
 *
 * Quando o gateway for escolhido, substitua este provider no BillingModule
 * pelo adapter real (que valida a assinatura com o segredo do provedor lido
 * do ambiente). Nunca registre o FakePaymentProvider fora dos testes.
 */
@Injectable()
export class DisabledPaymentProvider implements PaymentProvider {
  readonly name = 'disabled';

  verifySignature(): boolean {
    return false;
  }

  parseEvent(): PaymentWebhookEvent {
    throw new Error(
      'Nenhum gateway de pagamento configurado: eventos de webhook não são aceitos.',
    );
  }
}
