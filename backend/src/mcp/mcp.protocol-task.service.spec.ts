import { ConflictException, NotFoundException } from '@nestjs/common';
import { McpProtocolTaskService } from './mcp.protocol-task.service';

describe('McpProtocolTaskService', () => {
  const snapshots = new Map<string, { content: string }>();
  const memory = {
    latestByKeyPrefix: jest.fn(async () => []),
    latest: jest.fn(async (memoryKey: string) => snapshots.get(memoryKey) ?? null),
    append: jest.fn(async (input: any) => {
      snapshots.set(input.memoryKey, { content: input.content });
      return { id: 'MEM-1', ...input };
    }),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    snapshots.clear();
    memory.latestByKeyPrefix.mockResolvedValue([]);
    memory.latest.mockImplementation(async (memoryKey: string) => snapshots.get(memoryKey) ?? null);
  });

  it('persists a task before returning its handle', async () => {
    const service = new McpProtocolTaskService(memory);
    const task = await service.create('theosphere_answer', { query: 'grace' });

    expect(task.taskId).toBeDefined();
    expect(task.status).toBe('working');
    expect(memory.append).toHaveBeenCalledWith(expect.objectContaining({
      category: 'tasks',
      memoryKey: 'mcp:protocol-task:' + task.taskId,
    }));
  });

  it('returns completed results and preserves the result payload', async () => {
    const service = new McpProtocolTaskService(memory);
    const task = await service.create('theosphere_answer');
    const completed = await service.complete(task.taskId, {
      content: [{ type: 'text', text: 'done' }],
    });

    expect(completed.status).toBe('completed');
    expect(completed.result).toEqual({ content: [{ type: 'text', text: 'done' }] });
  });

  it('supports cooperative cancellation and rejects terminal cancellation', async () => {
    const service = new McpProtocolTaskService(memory);
    const task = await service.create('theosphere_answer');
    await expect(service.cancel(task.taskId)).resolves.toBeUndefined();
    expect(service.get(task.taskId)).toEqual(expect.objectContaining({ status: 'cancelled' }));
    await expect(service.cancel(task.taskId)).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not allow completion to overwrite a cancellation race', async () => {
    const service = new McpProtocolTaskService(memory);
    const task = await service.create('theosphere_answer');

    await service.cancel(task.taskId);

    await expect(service.complete(task.taskId, {
      content: [{ type: 'text', text: 'late result' }],
    })).rejects.toBeInstanceOf(ConflictException);
    expect(service.get(task.taskId)).toEqual(expect.objectContaining({ status: 'cancelled' }));
  });

  it('refreshes a task from durable memory before a cross-instance transition', async () => {
    const first = new McpProtocolTaskService(memory);
    const task = await first.create('theosphere_answer');

    const second = new McpProtocolTaskService(memory);
    await second.onModuleInit();
    expect(() => second.get(task.taskId)).toThrow(NotFoundException);

    await first.cancel(task.taskId);

    const persistedCancelled = snapshots.get('mcp:protocol-task:' + task.taskId);
    expect(persistedCancelled).toBeDefined();
    memory.latestByKeyPrefix.mockResolvedValueOnce([{ content: persistedCancelled!.content }]);
    await second.onModuleInit();

    await expect(second.complete(task.taskId, {
      content: [{ type: 'text', text: 'late result from another instance' }],
    })).rejects.toBeInstanceOf(ConflictException);
    await expect(second.getFresh(task.taskId)).resolves.toEqual(expect.objectContaining({ status: 'cancelled' }));
  });

  it('fails incomplete tasks after a restart rather than reporting false progress', async () => {
    const working = {
      taskId: 'task-recovered',
      status: 'working',
      createdAt: new Date(Date.now() - 60_000).toISOString(),
      lastUpdatedAt: new Date(Date.now() - 60_000).toISOString(),
      ttlMs: 3_600_000,
      operation: 'theosphere_answer',
    };
    memory.latestByKeyPrefix.mockResolvedValueOnce([{ content: JSON.stringify(working) }]);
    const service = new McpProtocolTaskService(memory);
    await service.onModuleInit();

    expect(service.get('task-recovered')).toEqual(expect.objectContaining({
      status: 'failed',
      error: expect.objectContaining({ code: -32603 }),
    }));
  });

  it('keeps a task input-required when only a subset of responses arrives', async () => {
    const service = new McpProtocolTaskService(memory);
    const task = await service.create('test');
    const stored = (service as any).tasks.get(task.taskId) as {
      status: string;
      inputRequests?: Record<string, unknown>;
    };
    stored.status = 'input_required';
    stored.inputRequests = { first: { request: 'a' }, second: { request: 'b' } };

    await service.update(task.taskId, { first: { value: 1 } });

    expect(service.get(task.taskId)).toEqual(expect.objectContaining({
      status: 'input_required',
      inputRequests: { second: { request: 'b' } },
    }));
  });

  it('does not allow failure to overwrite a cancellation race', async () => {
    const service = new McpProtocolTaskService(memory);
    const task = await service.create('theosphere_answer');
    await service.cancel(task.taskId);

    const failed = await service.fail(task.taskId, -32603, 'late failure');
    expect(failed.status).toBe('cancelled');
    expect(service.get(task.taskId)).toEqual(expect.objectContaining({ status: 'cancelled' }));
  });

  it('persists a resumed task after all required input is supplied', async () => {
    const service = new McpProtocolTaskService(memory);
    const task = await service.create('test');
    const stored = (service as any).tasks.get(task.taskId) as { status: string; inputRequests?: Record<string, unknown> };
    stored.status = 'input_required';
    stored.inputRequests = { approval: { request: 'approve' } };

    await service.update(task.taskId, { approval: { value: true } });

    expect(service.get(task.taskId)).toEqual(expect.objectContaining({ status: 'working' }));
    expect(memory.append).toHaveBeenLastCalledWith(expect.objectContaining({
      memoryKey: 'mcp:protocol-task:' + task.taskId,
      tags: expect.arrayContaining(['working']),
    }));
  });

  it('rejects unknown task ids', async () => {
    const service = new McpProtocolTaskService(memory);
    expect(() => service.get('missing')).toThrow(NotFoundException);
  });
});
