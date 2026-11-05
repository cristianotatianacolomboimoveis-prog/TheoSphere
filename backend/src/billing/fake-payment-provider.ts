import { Injectable } from '@nestjs/common';
import {
  PaymentProvider,
  PaymentWebhookEvent,
} from './payment-provider.interface';

/**
 * SOMENTE PARA TESTES. A assinatura aceita é uma constante pública no
 * repositório; registrar este provider em produção permite que qualquer pessoa
 * altere o plano de qualquer conta. O BillingModule usa DisabledPaymentProvider.
 */
@Injectable()
export class FakePaymentProvider implements PaymentProvider {
  readonly name = 'fake-test-provider';

  verifySignature(payload: any, signature: string | undefined): boolean {
    if (!signature) {
      return false;
    }
    return signature === 'valid-test-signature';
  }

  parseEvent(payload: any): PaymentWebhookEvent {
    return {
      providerEventId: payload.eventId || payload.id,
      userId: payload.userId,
      plan: payload.plan,
      timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
      rawPayload: payload,
    };
  }
}
