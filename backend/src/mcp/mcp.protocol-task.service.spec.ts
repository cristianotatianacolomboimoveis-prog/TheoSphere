import { ConflictException, NotFoundException } from '@nestjs/common';
import { McpProtocolTaskService } from './mcp.protocol-task.service';

describe('McpProtocolTaskService', () => {
  const memory = {
    latestByKeyPrefix: jest.fn(async () => []),
    append: jest.fn(async (input: unknown) => ({ id: 'MEM-1', ...(input as object) })),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
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

  it('fails incomplete tasks after a restart rather than reporting false progress', async () => {
    const working = {
      taskId: 'task-recovered',
      status: 'working',
      createdAt: '2026-09-18T09:00:00.000Z',
      lastUpdatedAt: '2026-09-18T09:00:00.000Z',
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

  it('rejects unknown task ids', async () => {
    const service = new McpProtocolTaskService(memory);
    expect(() => service.get('missing')).toThrow(NotFoundException);
  });
});
