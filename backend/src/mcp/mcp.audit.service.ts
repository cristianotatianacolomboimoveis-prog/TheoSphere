import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { McpAuditEvent } from './mcp.types';

@Injectable()
export class McpAuditService {
  private readonly events: McpAuditEvent[] = [];

  append(event: Omit<McpAuditEvent, 'id' | 'timestamp'>): McpAuditEvent {
    const record: McpAuditEvent = {
      ...event,
      id: randomUUID(),
      timestamp: new Date().toISOString(),
    };
    this.events.push(Object.freeze(record));
    return record;
  }

  list(limit = 100): readonly McpAuditEvent[] {
    const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 1000);
    return this.events.slice(-safeLimit).reverse();
  }
}
