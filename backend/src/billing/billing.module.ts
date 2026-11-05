import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RagModule } from '../rag/rag.module';
import { FakePaymentProvider } from './fake-payment-provider';

@Module({
  imports: [PrismaModule, RagModule],
  controllers: [BillingController],
  providers: [
    BillingService,
    {
      provide: 'PAYMENT_PROVIDER',
      useClass: FakePaymentProvider,
    },
  ],
  exports: [BillingService, 'PAYMENT_PROVIDER'],
})
export class BillingModule {}
