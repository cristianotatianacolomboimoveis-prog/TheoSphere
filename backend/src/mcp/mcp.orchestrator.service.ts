import { ConflictException, Injectable } from '@nestjs/common';
import { McpAgentRegistryService } from './mcp.agent-registry.service';
import { McpLockService } from './mcp.lock.service';
import { McpSecurityService } from './mcp.security.service';
import { McpTaskService } from './mcp.task.service';
import type { McpAgent, McpTask, McpTaskState } from './mcp.types';

@Injectable()
export class McpOrchestratorService {
  private readonly actor = 'mcp-orchestrator';

  constructor(
    private readonly tasks: McpTaskService,
    private readonly agents: McpAgentRegistryService,
    private readonly locks: McpLockService,
    private readonly security: McpSecurityService,
  ) {}

  registerAgent(agent: McpAgent): McpAgent {
    this.security.assertAllowed(this.actor, 'agent:register');
    const registered = this.agents.register(agent);
    const permissions = new Set<string>(['audit:read']);
    if (registered.capabilities.includes('coding')) {
      permissions.add('lock:acquire');
      permissions.add('lock:release');
    }
    if (registered.capabilities.includes('verification')) permissions.add('audit:read');
    for (const permission of permissions) this.security.grant(registered.id, permission as any);
    return registered;
  }

  plan(taskId: string): McpTask {
    return this.tasks.transition(taskId, 'PLANNED', this.actor);
  }

  assign(taskId: string, capability?: string): McpTask {
    const task = this.tasks.get(taskId);
    const candidates = capability
      ? this.agents.findCapable(capability)
      : this.agents.findCapable(task.requiredCapabilities[0] ?? 'coding');
    if (candidates.length === 0) throw new ConflictException('No enabled MCP agent can execute task ' + taskId);
    const compatible = candidates.find((agent) => task.requiredCapabilities.every((cap) => agent.capabilities.includes(cap)));
    if (!compatible) throw new ConflictException('No MCP agent satisfies all required capabilities for ' + taskId);
    return this.tasks.assign(taskId, compatible.id, this.actor);
  }

  lockAndStart(taskId: string): McpTask {
    const task = this.tasks.get(taskId);
    if (!task.assignedAgent) throw new ConflictException('MCP task must be assigned before locking');
    this.locks.acquire(task.files, taskId, task.assignedAgent);
    this.tasks.transition(taskId, 'LOCKED', this.actor);
    return this.tasks.transition(taskId, 'IN_PROGRESS', this.actor);
  }

  advance(taskId: string, next: Extract<McpTaskState, 'IMPLEMENTED' | 'TESTING' | 'AUDITING' | 'VERIFIED' | 'REWORK' | 'FAILED'>): McpTask {
    const task = this.tasks.get(taskId);
    const updated = this.tasks.transition(taskId, next, this.actor);
    if (['VERIFIED', 'FAILED', 'REWORK'].includes(updated.status)) {
      if (task.assignedAgent) {
        try { this.locks.release(taskId, task.assignedAgent); } catch { /* task lifecycle remains authoritative */ }
      }
    }
    return updated;
  }

  snapshot() {
    return { tasks: this.tasks.list(), agents: this.agents.list(), locks: this.locks.list() };
  }
}
