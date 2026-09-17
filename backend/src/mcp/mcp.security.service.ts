import { ForbiddenException, Injectable } from '@nestjs/common';
import type { McpPermission } from './mcp.types';

const DEFAULT_PERMISSIONS: Record<string, readonly McpPermission[]> = {
  'mcp-orchestrator': [
    'task:create',
    'task:assign',
    'task:transition',
    'lock:acquire',
    'lock:release',
    'agent:register',
    'audit:read',
    'memory:write',
    'memory:read',
  ],
};

@Injectable()
export class McpSecurityService {
  private readonly permissions = new Map<string, Set<McpPermission>>();

  constructor() {
    for (const [agent, permissions] of Object.entries(DEFAULT_PERMISSIONS)) {
      this.permissions.set(agent, new Set(permissions));
    }
  }

  grant(agentId: string, permission: McpPermission): void {
    const set = this.permissions.get(agentId) ?? new Set<McpPermission>();
    set.add(permission);
    this.permissions.set(agentId, set);
  }

  assertAllowed(agentId: string, permission: McpPermission): void {
    if (!this.permissions.get(agentId)?.has(permission)) {
      throw new ForbiddenException(
        `MCP permission denied: ${agentId} cannot ${permission}`,
      );
    }
  }
}
