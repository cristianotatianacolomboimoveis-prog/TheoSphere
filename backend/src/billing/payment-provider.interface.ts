export interface PaymentWebhookEvent {
  providerEventId: string;
  userId: string;
  plan: string;
  timestamp?: Date;
  rawPayload?: any;
}

export interface PaymentProvider {
  readonly name: string;
  verifySignature(payload: any, signature: string | undefined): boolean;
  parseEvent(payload: any): PaymentWebhookEvent;
}
