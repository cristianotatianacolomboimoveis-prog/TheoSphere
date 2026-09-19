import { Injectable, Optional } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { McpAuditEvent } from './mcp.types';
import { McpProjectMemoryService } from './mcp.project-memory.service';

@Injectable()
export class McpAuditService {
  private readonly events: McpAuditEvent[] = [];

  constructor(@Optional() private readonly memory?: McpProjectMemoryService) {}

  async onModuleInit(): Promise<void> {
    if (!this.memory) return;
    const entries = await this.memory.latestByKeyPrefix('audits', 'mcp:audit:');
    for (const entry of entries.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    )) {
      try {
        const event = JSON.parse(entry.content) as McpAuditEvent;
        if (event?.id && event.timestamp)
          this.events.push(Object.freeze(event));
      } catch (error) {
        void error;
      }
    }
  }

  append(event: Omit<McpAuditEvent, 'id' | 'timestamp'>): McpAuditEvent {
    const record: McpAuditEvent = {
      ...event,
      id: randomUUID(),
      timestamp: new Date().toISOString(),
    };
    this.events.push(Object.freeze(record));
    if (this.memory) {
      void this.memory
        .append({
          category: 'audits',
          memoryKey: `mcp:audit:${record.id}`,
          content: JSON.stringify(record),
          tags: ['mcp', 'audit', record.action],
          source: 'mcp-audit-service',
          taskId:
            record.resourceType === 'task' ? record.resourceId : undefined,
          agentId:
            typeof record.metadata?.agentId === 'string'
              ? record.metadata.agentId
              : undefined,
        })
        .catch(() => undefined);
    }
    return record;
  }

  list(limit = 100): readonly McpAuditEvent[] {
    const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 1000);
    return this.events.slice(-safeLimit).reverse();
  }
}
