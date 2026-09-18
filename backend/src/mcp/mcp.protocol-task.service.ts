import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { McpProjectMemoryService } from './mcp.project-memory.service';

export type McpProtocolTaskStatus = 'working' | 'input_required' | 'completed' | 'cancelled' | 'failed';

export interface McpProtocolTask {
  taskId: string;
  status: McpProtocolTaskStatus;
  statusMessage?: string;
  createdAt: string;
  lastUpdatedAt: string;
  ttlMs: number | null;
  pollIntervalMs?: number;
  result?: Record<string, unknown>;
  error?: Record<string, unknown>;
  operation?: string;
  payload?: Record<string, unknown>;
  inputRequests?: Record<string, unknown>;
}

@Injectable()
export class McpProtocolTaskService {
  private readonly tasks = new Map<string, McpProtocolTask>();
  private readonly ttlMs = 3_600_000;
  private readonly pollIntervalMs = 2_000;
  private readonly prefix = 'mcp:protocol-task:';
  private initialized = false;

  constructor(private readonly memory: McpProjectMemoryService) {}

  async onModuleInit(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    const entries = await this.memory.latestByKeyPrefix('tasks', this.prefix);
    for (const entry of entries) {
      try {
        const task = JSON.parse(entry.content) as McpProtocolTask;
        if (!task?.taskId || !task.status || !task.createdAt || !task.lastUpdatedAt) continue;
        if (task.status === 'working' || task.status === 'input_required') {
          task.status = 'failed';
          task.statusMessage = 'Task execution was interrupted by a server restart.';
          task.lastUpdatedAt = new Date().toISOString();
          task.error = { code: -32603, message: 'Task execution interrupted by server restart' };
          await this.persist(task);
        }
        this.tasks.set(task.taskId, task);
      } catch {
        // Ignore malformed historical task snapshots; they must not break startup.
      }
    }
  }

  async create(operation: string, payload?: Record<string, unknown>, statusMessage = 'The operation is now in progress.'): Promise<McpProtocolTask> {
    const now = new Date().toISOString();
    const task: McpProtocolTask = {
      taskId: randomUUID(),
      status: 'working',
      statusMessage,
      createdAt: now,
      lastUpdatedAt: now,
      ttlMs: this.ttlMs,
      pollIntervalMs: this.pollIntervalMs,
      operation,
      payload,
    };
    await this.persist(task);
    this.tasks.set(task.taskId, task);
    return this.publicTask(task);
  }

  get(taskId: string): McpProtocolTask {
    const task = this.mutable(taskId);
    return this.publicTask(task);
  }

  async update(taskId: string, inputResponses: Record<string, unknown>): Promise<void> {
    const task = this.mutable(taskId);
    if (task.status !== 'input_required') throw new ConflictException('MCP task is not awaiting input');
    if (!inputResponses || typeof inputResponses !== 'object' || Array.isArray(inputResponses)) {
      throw new ConflictException('MCP task inputResponses must be an object');
    }
    const outstanding = task.inputRequests ?? {};
    const unknown = Object.keys(inputResponses).filter((key) => !(key in outstanding));
    if (unknown.length > 0) return;
    task.inputRequests = {};
    task.status = 'working';
    task.statusMessage = 'Task input received; execution resumed.';
    task.lastUpdatedAt = new Date().toISOString();
    await this.persist(task);
  }

  async complete(taskId: string, result: Record<string, unknown>): Promise<McpProtocolTask> {
    const task = this.mutable(taskId);
    this.ensureNotTerminal(task);
    task.status = 'completed';
    task.statusMessage = 'Task completed.';
    task.result = result;
    task.lastUpdatedAt = new Date().toISOString();
    await this.persist(task);
    return this.publicTask(task);
  }

  async fail(taskId: string, code: number, message: string): Promise<McpProtocolTask> {
    const task = this.mutable(taskId);
    if (task.status === 'cancelled' || task.status === 'completed' || task.status === 'failed') return this.publicTask(task);
    task.status = 'failed';
    task.statusMessage = message;
    task.error = { code, message };
    task.lastUpdatedAt = new Date().toISOString();
    await this.persist(task);
    return this.publicTask(task);
  }

  async cancel(taskId: string): Promise<void> {
    const task = this.mutable(taskId);
    if (task.status === 'completed' || task.status === 'failed') throw new ConflictException('MCP task is already terminal');
    task.status = 'cancelled';
    task.statusMessage = 'Cancellation requested.';
    task.lastUpdatedAt = new Date().toISOString();
    await this.persist(task);
  }

  private mutable(taskId: string): McpProtocolTask {
    const task = this.tasks.get(taskId);
    if (!task) throw new NotFoundException('MCP task not found');
    if (task.ttlMs !== null && Date.now() - Date.parse(task.createdAt) > task.ttlMs) {
      this.tasks.delete(taskId);
      throw new NotFoundException('MCP task has expired');
    }
    return task;
  }

  private ensureNotTerminal(task: McpProtocolTask): void {
    if (task.status === 'completed' || task.status === 'cancelled' || task.status === 'failed') {
      throw new ConflictException('MCP task is already terminal');
    }
  }

  private async persist(task: McpProtocolTask): Promise<void> {
    await this.memory.append({
      category: 'tasks',
      memoryKey: this.prefix + task.taskId,
      content: JSON.stringify(task),
      tags: ['mcp', 'protocol-task', task.status],
      source: 'mcp-protocol-task-service',
    });
  }

  private publicTask(task: McpProtocolTask): McpProtocolTask {
    return {
      taskId: task.taskId,
      status: task.status,
      ...(task.statusMessage ? { statusMessage: task.statusMessage } : {}),
      createdAt: task.createdAt,
      lastUpdatedAt: task.lastUpdatedAt,
      ttlMs: task.ttlMs,
      ...(task.pollIntervalMs !== undefined ? { pollIntervalMs: task.pollIntervalMs } : {}),
      ...(task.result ? { result: task.result } : {}),
      ...(task.error ? { error: task.error } : {}),
      ...(task.status === 'input_required' && task.inputRequests ? { inputRequests: task.inputRequests } : {}),
    };
  }
}
