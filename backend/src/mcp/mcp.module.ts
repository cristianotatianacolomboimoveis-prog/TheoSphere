import { Module } from '@nestjs/common';
import { McpAuditService } from './mcp.audit.service';
import { McpAgentRegistryService } from './mcp.agent-registry.service';
import { McpLockService } from './mcp.lock.service';
import { McpSecurityService } from './mcp.security.service';
import { McpTaskService } from './mcp.task.service';
import { McpProjectMemoryService } from './mcp.project-memory.service';
import { McpOrchestratorService } from './mcp.orchestrator.service';
import { McpProtocolService } from './mcp.protocol.service';
import { McpAutonomyService } from './mcp.autonomy.service';
import { McpProtocolTaskService } from './mcp.protocol-task.service';
import { McpController } from './mcp.controller';
import { McpExecutionController } from './mcp.execution.controller';
import { McpAnswerController } from './mcp.answer.controller';
import { RagModule } from '../rag/rag.module';

@Module({
  imports: [RagModule],
  controllers: [McpController, McpExecutionController, McpAnswerController],
  providers: [
    McpAuditService,
    McpAgentRegistryService,
    McpSecurityService,
    McpTaskService,
    McpLockService,
    McpProjectMemoryService,
    McpOrchestratorService,
    McpProtocolService,
    McpAutonomyService,
    McpProtocolTaskService,
  ],
  exports: [
    McpAuditService,
    McpAgentRegistryService,
    McpSecurityService,
    McpTaskService,
    McpLockService,
    McpProjectMemoryService,
    McpOrchestratorService,
    McpProtocolService,
    McpProtocolTaskService,
  ],
})
export class McpModule {}
