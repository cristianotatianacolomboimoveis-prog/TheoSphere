import { ConflictException, Injectable } from '@nestjs/common';
import { McpAuditService } from './mcp.audit.service';
import { McpSecurityService } from './mcp.security.service';
import type { McpFileLock } from './mcp.types';

@Injectable()
export class McpLockService {
  private readonly locks = new Map<string, McpFileLock>();

  constructor(
    private readonly security: McpSecurityService,
    private readonly audit: McpAuditService,
  ) {}

  acquire(paths: readonly string[], taskId: string, agentId: string): readonly McpFileLock[] {
    this.security.assertAllowed(agentId, 'lock:acquire');
    const normalized = [...new Set(paths.map((path) => path.trim()).filter(Boolean))].sort();
    const conflicts = normalized.filter((path) => this.locks.has(path));
    if (conflicts.length > 0) {
      throw new ConflictException(`MCP file lock conflict: ${conflicts.join(', ')}`);
    }

    const acquiredAt = new Date().toISOString();
    const locks = normalized.map((path) => ({ path, taskId, agentId, acquiredAt }));
    for (const lock of locks) this.locks.set(lock.path, lock);
    this.audit.append({
      actor: agentId,
      action: 'lock.acquired',
      resourceType: 'lock',
      resourceId: taskId,
      outcome: 'success',
      metadata: { paths: normalized },
    });
    return locks;
  }

  release(taskId: string, agentId: string): void {
    this.security.assertAllowed(agentId, 'lock:release');
    for (const [path, lock] of this.locks) {
      if (lock.taskId === taskId && lock.agentId === agentId) this.locks.delete(path);
    }
    this.audit.append({
      actor: agentId,
      action: 'lock.released',
      resourceType: 'lock',
      resourceId: taskId,
      outcome: 'success',
    });
  }

  list(): readonly McpFileLock[] {
    return [...this.locks.values()];
  }
}
