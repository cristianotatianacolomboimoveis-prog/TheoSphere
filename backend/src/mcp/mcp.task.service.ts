import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { McpAuditService } from './mcp.audit.service';
import { McpSecurityService } from './mcp.security.service';
import { MCP_STATE_TRANSITIONS, type McpTask, type McpTaskState } from './mcp.types';

@Injectable()
export class McpTaskService {
  private readonly tasks = new Map<string, McpTask>();

  constructor(
    private readonly security: McpSecurityService,
    private readonly audit: McpAuditService,
  ) {}

  create(
    input: Pick<McpTask, 'title' | 'description' | 'priority' | 'files' | 'dependencies'>,
    actor = 'mcp-orchestrator',
  ): McpTask {
    this.security.assertAllowed(actor, 'task:create');
    const now = new Date().toISOString();
    const task: McpTask = {
      ...input,
      id: `TSK-${randomUUID().slice(0, 8)}`,
      status: 'CREATED',
      dependencies: [...new Set(input.dependencies)],
      files: [...new Set(input.files)],
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    this.tasks.set(task.id, task);
    this.audit.append({
      actor,
      action: 'task.created',
      resourceType: 'task',
      resourceId: task.id,
      outcome: 'success',
    });
    return task;
  }

  get(taskId: string): McpTask {
    const task = this.tasks.get(taskId);
    if (!task) throw new NotFoundException(`MCP task not found: ${taskId}`);
    return task;
  }

  list(): readonly McpTask[] {
    return [...this.tasks.values()];
  }

  transition(taskId: string, next: McpTaskState, actor = 'mcp-orchestrator'): McpTask {
    this.security.assertAllowed(actor, 'task:transition');
    const task = this.get(taskId);
    if (!MCP_STATE_TRANSITIONS[task.status].includes(next)) {
      throw new ConflictException(
        `Invalid MCP task transition: ${task.status} -> ${next}`,
      );
    }
    const updated = { ...task, status: next, updatedAt: new Date().toISOString(), version: task.version + 1 };
    this.tasks.set(taskId, updated);
    this.audit.append({
      actor,
      action: `task.transition.${task.status}_to_${next}`,
      resourceType: 'task',
      resourceId: taskId,
      outcome: 'success',
    });
    return updated;
  }

  assign(taskId: string, agentId: string, actor = 'mcp-orchestrator'): McpTask {
    this.security.assertAllowed(actor, 'task:assign');
    const task = this.get(taskId);
    const updated = {
      ...task,
      assignedAgent: agentId,
      updatedAt: new Date().toISOString(),
      version: task.version + 1,
    };
    this.tasks.set(taskId, updated);
    this.audit.append({
      actor,
      action: 'task.assigned',
      resourceType: 'task',
      resourceId: taskId,
      outcome: 'success',
      metadata: { agentId },
    });
    return updated;
  }
}
