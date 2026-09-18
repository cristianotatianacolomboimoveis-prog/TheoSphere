import { ConflictException, Injectable } from '@nestjs/common';
import { McpAgentRegistryService } from './mcp.agent-registry.service';
import { McpOrchestratorService } from './mcp.orchestrator.service';
import { McpProjectMemoryService } from './mcp.project-memory.service';
import { McpTaskService } from './mcp.task.service';
import type { McpExecutionReceipt, McpTask } from './mcp.types';

export interface McpExecutionResult {
  taskId: string;
  status: McpTask['status'];
  agentId?: string;
  verifierAgentId?: string;
  summary?: string;
}

@Injectable()
export class McpAutonomyService {
  constructor(
    private readonly orchestrator: McpOrchestratorService,
    private readonly agents: McpAgentRegistryService,
    private readonly tasks: McpTaskService,
    private readonly memory: McpProjectMemoryService,
  ) {}

  async dispatch(taskId: string): Promise<McpTask> {
    const initial = this.tasks.get(taskId);
    const rework = initial.status === 'REWORK';
    if (initial.status === 'CREATED' || rework) await this.orchestrator.plan(taskId);
    const planned = this.tasks.get(taskId);
    if (planned.status !== 'PLANNED') throw new ConflictException(`Task ${taskId} is not dispatchable from ${planned.status}`);
    if (!planned.assignedAgent || rework) await this.orchestrator.assign(taskId);
    return await this.orchestrator.lockAndStart(taskId);
  }

  async renewLocks(taskId: string, agentId: string): Promise<{ taskId: string; renewed: number; ttlMs: number }> {
    return this.orchestrator.renewLocks(taskId, agentId);
  }

  async recordResult(taskId: string, agentId: string, success: boolean, summary?: string, receipt?: McpExecutionReceipt): Promise<McpExecutionResult> {
    const task = this.tasks.get(taskId);
    if (!task.assignedAgent || task.assignedAgent !== agentId) {
      throw new ConflictException(`MCP result agent mismatch for task ${taskId}`);
    }
    if (!['IN_PROGRESS', 'IMPLEMENTED', 'TESTING', 'AUDITING'].includes(task.status)) {
      throw new ConflictException(`Task ${taskId} cannot record a result from ${task.status}`);
    }
    if (success) this.assertValidReceipt(receipt);

    let updated = task;
    if (success && receipt) updated = this.tasks.recordExecutionReceipt(taskId, agentId, receipt);
    if (task.status === 'IN_PROGRESS') updated = await this.orchestrator.advance(taskId, success ? 'IMPLEMENTED' : 'REWORK');
    if (success && updated.status === 'IMPLEMENTED') updated = await this.orchestrator.advance(taskId, 'TESTING');
    if (success && updated.status === 'TESTING') updated = await this.orchestrator.advance(taskId, 'AUDITING');
    if (!success && updated.status !== 'REWORK') updated = await this.orchestrator.advance(taskId, 'REWORK');

    const content = summary?.trim() || (success
      ? 'Worker execution completed; awaiting independent verification.'
      : 'Worker execution returned to rework.');

    await this.memory.append({
      category: 'tasks',
      memoryKey: `execution:${taskId}:${updated.version}`,
      content,
      tags: ['autonomy', success ? 'awaiting-verification' : 'rework'],
      source: 'mcp-autonomy',
      taskId,
      agentId: task.assignedAgent,
    });

    return { taskId, status: updated.status, agentId: task.assignedAgent, summary };
  }

  private assertValidReceipt(receipt?: McpExecutionReceipt): asserts receipt is McpExecutionReceipt {
    if (!receipt || typeof receipt.commitSha !== 'string' || !receipt.commitSha.trim()) {
      throw new ConflictException('Successful MCP result requires a non-empty commitSha');
    }
    if (!Array.isArray(receipt.changedFiles) || receipt.changedFiles.some((path) => typeof path !== 'string')) {
      throw new ConflictException('Execution receipt changedFiles must be an array of strings');
    }
    if (!Array.isArray(receipt.tests) || receipt.tests.length === 0) {
      throw new ConflictException('Successful MCP result requires at least one test result');
    }
    const started = Date.parse(receipt.startedAt);
    const finished = Date.parse(receipt.finishedAt);
    if (!Number.isFinite(started) || !Number.isFinite(finished) || finished < started) {
      throw new ConflictException('Execution receipt timestamps are invalid');
    }
    for (const test of receipt.tests) {
      if (!test || typeof test.command !== 'string' || !test.command.trim()) {
        throw new ConflictException('Execution receipt test commands must be non-empty');
      }
      if (!['passed', 'failed', 'skipped'].includes(test.status)) {
        throw new ConflictException('Execution receipt test status is invalid');
      }
      if (test.durationMs !== undefined && (!Number.isFinite(test.durationMs) || test.durationMs < 0)) {
        throw new ConflictException('Execution receipt test durationMs is invalid');
      }
    }
    if (receipt.tests.some((test) => test.status !== 'passed')) {
      throw new ConflictException('Successful MCP result requires all reported tests to pass');
    }
    if (receipt.artifactRefs !== undefined && (!Array.isArray(receipt.artifactRefs) || receipt.artifactRefs.some((ref) => typeof ref !== 'string'))) {
      throw new ConflictException('Execution receipt artifactRefs must be an array of strings');
    }
    if (receipt.agentVersion !== undefined && typeof receipt.agentVersion !== 'string') {
      throw new ConflictException('Execution receipt agentVersion must be a string');
    }
  }

  async verifyResult(taskId: string, verifierAgentId: string, summary?: string): Promise<McpExecutionResult> {
    const task = this.tasks.get(taskId);
    if (task.status !== 'AUDITING') {
      throw new ConflictException(`Task ${taskId} cannot be verified from ${task.status}`);
    }
    if (!task.executionReceipt) throw new ConflictException('MCP verification requires a structured execution receipt');
    if (!task.assignedAgent || task.assignedAgent === verifierAgentId) {
      throw new ConflictException('MCP verification requires an independent agent');
    }
    const verifier = this.agents.get(verifierAgentId);
    if (!verifier || !verifier.enabled || !verifier.capabilities.includes('verification')) {
      throw new ConflictException('MCP verifier must be a registered enabled agent with verification capability');
    }
    const updated = await this.orchestrator.advance(taskId, 'VERIFIED');
    await this.memory.append({
      category: 'audits',
      memoryKey: `verification:${taskId}:${updated.version}`,
      content: summary?.trim() || 'Independent worker verification completed.',
      tags: ['autonomy', 'verified'],
      source: 'mcp-autonomy',
      taskId,
      agentId: verifierAgentId,
    });
    return { taskId, status: updated.status, agentId: task.assignedAgent, verifierAgentId, summary };
  }
}
