import { ConflictException, Injectable } from '@nestjs/common';
import { McpOrchestratorService } from './mcp.orchestrator.service';
import { McpProjectMemoryService } from './mcp.project-memory.service';
import { McpTaskService } from './mcp.task.service';
import type { McpTask } from './mcp.types';

export interface McpExecutionResult {
  taskId: string;
  status: McpTask['status'];
  agentId?: string;
  summary?: string;
}

@Injectable()
export class McpAutonomyService {
  constructor(
    private readonly orchestrator: McpOrchestratorService,
    private readonly tasks: McpTaskService,
    private readonly memory: McpProjectMemoryService,
  ) {}

  dispatch(taskId: string): McpTask {
    const initial = this.tasks.get(taskId);
    const rework = initial.status === 'REWORK';
    if (initial.status === 'CREATED' || rework) this.orchestrator.plan(taskId);
    const planned = this.tasks.get(taskId);
    if (planned.status !== 'PLANNED') throw new ConflictException(`Task ${taskId} is not dispatchable from ${planned.status}`);
    if (!planned.assignedAgent || rework) this.orchestrator.assign(taskId);
    return this.orchestrator.lockAndStart(taskId);
  }

  async recordResult(taskId: string, agentId: string, success: boolean, summary?: string): Promise<McpExecutionResult> {
    const task = this.tasks.get(taskId);
    if (!task.assignedAgent || task.assignedAgent !== agentId) {
      throw new ConflictException(`MCP result agent mismatch for task ${taskId}`);
    }
    if (!['IN_PROGRESS', 'IMPLEMENTED', 'TESTING', 'AUDITING'].includes(task.status)) {
      throw new ConflictException(`Task ${taskId} cannot record a result from ${task.status}`);
    }
    let updated = task;
    if (task.status === 'IN_PROGRESS') updated = this.orchestrator.advance(taskId, success ? 'IMPLEMENTED' : 'REWORK');
    if (success && updated.status === 'IMPLEMENTED') updated = this.orchestrator.advance(taskId, 'TESTING');
    if (success && updated.status === 'TESTING') updated = this.orchestrator.advance(taskId, 'AUDITING');
    if (success && updated.status === 'AUDITING') updated = this.orchestrator.advance(taskId, 'VERIFIED');
    if (!success && updated.status !== 'REWORK') updated = this.orchestrator.advance(taskId, 'REWORK');

    await this.memory.append({
      category: 'tasks',
      memoryKey: `execution:${taskId}:${updated.version}`,
      content: summary?.trim() || (success ? 'Autonomous execution completed successfully.' : 'Autonomous execution returned to rework.'),
      tags: ['autonomy', success ? 'verified' : 'rework'],
      source: 'mcp-autonomy',
      taskId,
      agentId: task.assignedAgent,
    });
    return { taskId, status: updated.status, agentId: task.assignedAgent, summary };
  }
}
