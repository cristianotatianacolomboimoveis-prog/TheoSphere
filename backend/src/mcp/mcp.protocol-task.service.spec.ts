import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  McpProtocolTaskService,
  McpProtocolTask,
} from './mcp.protocol-task.service';

describe('McpProtocolTaskService', () => {
  const snapshots = new Map<string, McpProtocolTask>();
  const memory = {
    latestByKeyPrefix: jest.fn(async () => []),
    append: jest.fn(async (input: { memoryKey: string; content: string }) => {
      snapshots.set(
        input.memoryKey,
        JSON.parse(input.content) as McpProtocolTask,
      );
      return { id: 'MEM-1', ...input };
    }),
    latest: jest.fn(async (memoryKey: string) => {
      const task = snapshots.get(memoryKey);
      return task ? { content: JSON.stringify(task), id: 'MEM-1' } : null;
    }),
    mutateLatestJson: jest.fn(
      async <T>(
        _category: string,
        memoryKey: string,
        mutate: (current: T) => T,
      ) => {
        const current = snapshots.get(memoryKey);
        if (!current) throw new NotFoundException('MCP task not found');
        const next = mutate(current as T);
        snapshots.set(memoryKey, next as McpProtocolTask);
        return next;
      },
    ),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    snapshots.clear();
  });

  it('persists a task before returning its handle', async () => {
    const service = new McpProtocolTaskService(memory);
    const task = await service.create('theosphere_answer', { query: 'grace' });

    expect(task.taskId).toBeDefined();
    expect(task.status).toBe('working');
    expect(memory.append).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'tasks',
        memoryKey: 'mcp:protocol-task:' + task.taskId,
      }),
    );
  });

  it('reads the latest persistent state instead of trusting a stale local cache', async () => {
    const first = new McpProtocolTaskService(memory);
    const second = new McpProtocolTaskService(memory);
    const task = await first.create('theosphere_answer');

    await first.cancel(task.taskId);

    expect(await second.get(task.taskId)).toEqual(
      expect.objectContaining({ status: 'cancelled' }),
    );
  });

  it('serializes terminal races across independent service instances', async () => {
    const first = new McpProtocolTaskService(memory);
    const second = new McpProtocolTaskService(memory);
    const task = await first.create('theosphere_answer');

    await first.cancel(task.taskId);

    await expect(
      second.complete(task.taskId, {
        content: [{ type: 'text', text: 'late result' }],
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    await expect(
      first.fail(task.taskId, -32603, 'late failure'),
    ).resolves.toEqual(expect.objectContaining({ status: 'cancelled' }));
    expect(await second.get(task.taskId)).toEqual(
      expect.objectContaining({ status: 'cancelled' }),
    );
  });

  it('returns completed results and preserves the result payload', async () => {
    const service = new McpProtocolTaskService(memory);
    const task = await service.create('theosphere_answer');
    const completed = await service.complete(task.taskId, {
      content: [{ type: 'text', text: 'done' }],
    });

    expect(completed.status).toBe('completed');
    expect(completed.result).toEqual({
      content: [{ type: 'text', text: 'done' }],
    });
  });

  it('does not run recovery mutations for tasks that are already terminal', async () => {
    const terminal = (
      status: McpProtocolTask['status'],
      taskId: string,
    ): McpProtocolTask => ({
      taskId,
      status,
      createdAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      ttlMs: 3_600_000,
    });
    memory.latestByKeyPrefix.mockResolvedValueOnce(
      (['completed', 'cancelled', 'failed'] as const).map((status) => ({
        content: JSON.stringify(terminal(status, `task-${status}`)),
      })),
    );

    await new McpProtocolTaskService(memory).onModuleInit();

    expect(memory.mutateLatestJson).not.toHaveBeenCalled();
  });

  it('fails incomplete tasks after a restart without resurrecting stale progress', async () => {
    const working: McpProtocolTask = {
      taskId: 'task-recovered',
      status: 'working',
      createdAt: new Date(Date.now() - 60_000).toISOString(),
      lastUpdatedAt: new Date(Date.now() - 60_000).toISOString(),
      ttlMs: 3_600_000,
      operation: 'theosphere_answer',
    };
    snapshots.set('mcp:protocol-task:task-recovered', working);
    memory.latestByKeyPrefix.mockResolvedValueOnce([
      { content: JSON.stringify(working) },
    ]);

    const service = new McpProtocolTaskService(memory);
    await service.onModuleInit();

    expect(await service.get('task-recovered')).toEqual(
      expect.objectContaining({
        status: 'failed',
        error: expect.objectContaining({ code: -32603 }),
      }),
    );
  });

  it('keeps a task input-required when only a subset of responses arrives', async () => {
    const service = new McpProtocolTaskService(memory);
    const task = await service.create('test');
    snapshots.set('mcp:protocol-task:' + task.taskId, {
      ...task,
      status: 'input_required',
      inputRequests: { first: { request: 'a' }, second: { request: 'b' } },
    });

    await service.update(task.taskId, { first: { value: 1 } });

    expect(await service.get(task.taskId)).toEqual(
      expect.objectContaining({
        status: 'input_required',
        inputRequests: { second: { request: 'b' } },
      }),
    );
  });

  it('resumes a task after all required input is supplied', async () => {
    const service = new McpProtocolTaskService(memory);
    const task = await service.create('test');
    snapshots.set('mcp:protocol-task:' + task.taskId, {
      ...task,
      status: 'input_required',
      inputRequests: { approval: { request: 'approve' } },
    });

    await service.update(task.taskId, { approval: { value: true } });

    expect(await service.get(task.taskId)).toEqual(
      expect.objectContaining({ status: 'working' }),
    );
  });

  it('rejects unknown task ids', async () => {
    const service = new McpProtocolTaskService(memory);
    await expect(service.get('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
