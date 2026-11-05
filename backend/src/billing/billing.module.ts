import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RagModule } from '../rag/rag.module';
import { DisabledPaymentProvider } from './disabled-payment-provider';

@Module({
  imports: [PrismaModule, RagModule],
  controllers: [BillingController],
  providers: [
    BillingService,
    {
      // Fail-closed até existir gateway real (D2). O FakePaymentProvider é
      // exclusivo dos testes: sua assinatura fixa está no repositório público.
      provide: 'PAYMENT_PROVIDER',
      useClass: DisabledPaymentProvider,
    },
  ],
  exports: [BillingService, 'PAYMENT_PROVIDER'],
})
export class BillingModule {}
