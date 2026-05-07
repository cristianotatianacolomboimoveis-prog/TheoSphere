import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';

/**
 * Audit is `@Global` so any module can inject `AuditService` without first
 * importing AuditModule. This matches the global scope of PrismaModule and
 * EventsModule and keeps audit calls cheap to add.
 */
@Global()
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
