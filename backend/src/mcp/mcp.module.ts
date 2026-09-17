import { Module } from '@nestjs/common';
import { McpAuditService } from './mcp.audit.service';
import { McpAgentRegistryService } from './mcp.agent-registry.service';
import { McpLockService } from './mcp.lock.service';
import { McpSecurityService } from './mcp.security.service';
import { McpTaskService } from './mcp.task.service';

@Module({
  providers: [
    McpAuditService,
    McpAgentRegistryService,
    McpSecurityService,
    McpTaskService,
    McpLockService,
  ],
  exports: [
    McpAuditService,
    McpAgentRegistryService,
    McpSecurityService,
    McpTaskService,
    McpLockService,
  ],
})
export class McpModule {}
