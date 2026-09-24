import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { McpProjectMemoryService } from './mcp.project-memory.service';

export type McpProtocolTaskStatus =
  | 'working'
  | 'input_required'
  | 'completed'
  | 'cancelled'
  | 'failed';

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
        if (
          !task?.taskId ||
          !task.status ||
          !task.createdAt ||
          !task.lastUpdatedAt
        )
          continue;
        const recovered = await this.recoverIfInterrupted(task.taskId, task);
        this.tasks.set(task.taskId, recovered);
      } catch {
        // Ignore malformed historical task snapshots; they must not break startup.
      }
    }
  }

  async create(
    operation: string,
    payload?: Record<string, unknown>,
    statusMessage = 'The operation is now in progress.',
  ): Promise<McpProtocolTask> {
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

  async get(taskId: string): Promise<McpProtocolTask> {
    const task = await this.loadLatest(taskId);
    return this.publicTask(task);
  }

  async update(
    taskId: string,
    inputResponses: Record<string, unknown>,
  ): Promise<void> {
    if (
      !inputResponses ||
      typeof inputResponses !== 'object' ||
      Array.isArray(inputResponses)
    ) {
      throw new ConflictException('MCP task inputResponses must be an object');
    }
    const updated = await this.mutate(taskId, (task) => {
      if (task.status !== 'input_required')
        throw new ConflictException('MCP task is not awaiting input');
      const outstanding = task.inputRequests ?? {};
      const remaining = Object.fromEntries(
        Object.entries(outstanding).filter(([key]) => !(key in inputResponses)),
      );
      return {
        ...task,
        inputRequests: remaining,
        status:
          Object.keys(remaining).length === 0 ? 'working' : 'input_required',
        statusMessage:
          Object.keys(remaining).length === 0
            ? 'Task input received; execution resumed.'
            : 'Task input partially received; additional input is still required.',
        lastUpdatedAt: new Date().toISOString(),
      };
    });
    this.tasks.set(taskId, updated);
  }

  async complete(
    taskId: string,
    result: Record<string, unknown>,
  ): Promise<McpProtocolTask> {
    const updated = await this.mutate(taskId, (task) => {
      this.ensureNotTerminal(task);
      return {
        ...task,
        status: 'completed',
        statusMessage: 'Task completed.',
        result,
        lastUpdatedAt: new Date().toISOString(),
      };
    });
    this.tasks.set(taskId, updated);
    return this.publicTask(updated);
  }

  async fail(
    taskId: string,
    code: number,
    message: string,
  ): Promise<McpProtocolTask> {
    const updated = await this.mutate(taskId, (task) => {
      if (
        task.status === 'cancelled' ||
        task.status === 'completed' ||
        task.status === 'failed'
      )
        return task;
      return {
        ...task,
        status: 'failed',
        statusMessage: message,
        error: { code, message },
        lastUpdatedAt: new Date().toISOString(),
      };
    });
    this.tasks.set(taskId, updated);
    return this.publicTask(updated);
  }

  async cancel(taskId: string): Promise<void> {
    const updated = await this.mutate(taskId, (task) => {
      if (
        task.status === 'completed' ||
        task.status === 'cancelled' ||
        task.status === 'failed'
      ) {
        throw new ConflictException('MCP task is already terminal');
      }
      return {
        ...task,
        status: 'cancelled',
        statusMessage: 'Cancellation requested.',
        lastUpdatedAt: new Date().toISOString(),
      };
    });
    this.tasks.set(taskId, updated);
  }

  private async loadLatest(taskId: string): Promise<McpProtocolTask> {
    const key = this.prefix + taskId;
    const entry = await this.memory.latest(key);
    if (!entry) {
      this.tasks.delete(taskId);
      throw new NotFoundException('MCP task not found');
    }
    let task: McpProtocolTask;
    try {
      task = JSON.parse(entry.content) as McpProtocolTask;
    } catch {
      throw new NotFoundException('MCP task state is invalid');
    }
    if (
      !task?.taskId ||
      task.taskId !== taskId ||
      !task.status ||
      !task.createdAt ||
      !task.lastUpdatedAt
    ) {
      throw new NotFoundException('MCP task state is invalid');
    }
    this.ensureNotExpired(task);
    this.tasks.set(taskId, task);
    return task;
  }

  private async mutate(
    taskId: string,
    mutation: (task: McpProtocolTask) => McpProtocolTask,
  ): Promise<McpProtocolTask> {
    const key = this.prefix + taskId;
    const updated = await this.memory.mutateLatestJson<McpProtocolTask>(
      'tasks',
      key,
      (current) => {
        if (!current?.taskId || current.taskId !== taskId)
          throw new NotFoundException('MCP task not found');
        this.ensureNotExpired(current);
        return mutation(current);
      },
    );
    return updated;
  }

  private async recoverIfInterrupted(
    taskId: string,
    fallback: McpProtocolTask,
  ): Promise<McpProtocolTask> {
    return this.memory.mutateLatestJson<McpProtocolTask>(
      'tasks',
      this.prefix + taskId,
      (current) => {
        const task = current?.taskId === taskId ? current : fallback;
        if (task.status !== 'working' && task.status !== 'input_required')
          return task;
        return {
          ...task,
          status: 'failed',
          statusMessage: 'Task execution was interrupted by a server restart.',
          lastUpdatedAt: new Date().toISOString(),
          error: {
            code: -32603,
            message: 'Task execution interrupted by server restart',
          },
        };
      },
    );
  }

  private ensureNotExpired(task: McpProtocolTask): void {
    if (
      task.ttlMs !== null &&
      Date.now() - Date.parse(task.createdAt) > task.ttlMs
    ) {
      this.tasks.delete(task.taskId);
      throw new NotFoundException('MCP task has expired');
    }
  }

  private ensureNotTerminal(task: McpProtocolTask): void {
    if (
      task.status === 'completed' ||
      task.status === 'cancelled' ||
      task.status === 'failed'
    ) {
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
      ...(task.pollIntervalMs !== undefined
        ? { pollIntervalMs: task.pollIntervalMs }
        : {}),
      ...(task.result ? { result: task.result } : {}),
      ...(task.error ? { error: task.error } : {}),
      ...(task.status === 'input_required' && task.inputRequests
        ? { inputRequests: task.inputRequests }
        : {}),
    };
  }
}
