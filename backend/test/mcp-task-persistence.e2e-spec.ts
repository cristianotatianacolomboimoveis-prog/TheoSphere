import { randomUUID } from 'node:crypto';
import { PrismaService } from '../src/prisma.service';
import { McpProjectMemoryService } from '../src/mcp/mcp.project-memory.service';
import { McpProtocolTaskService } from '../src/mcp/mcp.protocol-task.service';

/**
 * Exercises the real PostgreSQL behind MCP task state (advisory locks,
 * DISTINCT ON snapshots). The unit specs mock the memory service, so they
 * cannot prove cross-instance serialization; this file does.
 *
 * Requires DATABASE_URL pointing at a migrated database (the CI backend job
 * provides one). Rows are namespaced per run and removed afterwards.
 */
describe('MCP task persistence (PostgreSQL)', () => {
  const runId = randomUUID();
  const counterKey = `e2e:${runId}:counter`;
  let prisma: PrismaService;
  let memory: McpProjectMemoryService;

  const rowCount = (memoryKey: string) =>
    prisma.projectMemory.count({ where: { memoryKey } });

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    memory = new McpProjectMemoryService(prisma);
  });

  afterAll(async () => {
    await prisma.projectMemory.deleteMany({
      where: {
        OR: [
          { memoryKey: { startsWith: `e2e:${runId}` } },
          {
            memoryKey: { startsWith: `mcp:protocol-task:` },
            source: `e2e:${runId}`,
          },
        ],
      },
    });
    // Also ends the pg pool; a bare $disconnect leaves it open and Jest hangs.
    await prisma.onModuleDestroy();
  });

  it('serializes concurrent mutations of the same key without losing updates', async () => {
    // 100-way contention: with a millisecond-resolution createdAt and a random
    // id tiebreak, this used to end well below 100 (stale "latest" snapshots).
    const writers = 100;
    await memory.append({
      category: 'tasks',
      memoryKey: counterKey,
      content: JSON.stringify({ n: 0 }),
    });

    await Promise.all(
      Array.from({ length: writers }, () =>
        memory.mutateLatestJson<{ n: number }>('tasks', counterKey, (c) => ({
          n: c.n + 1,
        })),
      ),
    );

    const latest = await memory.latest(counterKey);
    expect(JSON.parse(latest!.content)).toEqual({ n: writers });
    const rows = await prisma.projectMemory.findMany({
      where: { memoryKey: counterKey },
    });
    expect(rows).toHaveLength(writers + 1);
    // "Latest" is ordered by createdAt, so it must be unambiguous per key.
    expect(new Set(rows.map((r) => r.createdAt.getTime())).size).toBe(
      rows.length,
    );
  });

  it('does not append a row when the mutation returns its input unchanged', async () => {
    const before = await rowCount(counterKey);
    await memory.mutateLatestJson<{ n: number }>('tasks', counterKey, (c) => c);
    expect(await rowCount(counterKey)).toBe(before);
  });

  it('returns only the newest snapshot per key for a prefix', async () => {
    const entries = await memory.latestByKeyPrefix('tasks', `e2e:${runId}:`);
    expect(entries).toHaveLength(1);
    expect(JSON.parse(entries[0].content)).toEqual({ n: 100 });
  });

  describe('protocol tasks across two service instances', () => {
    // Task keys must carry the run id in `source` for cleanup, so wrap append.
    const tagged = () => {
      const original = memory.append.bind(memory);
      jest
        .spyOn(memory, 'append')
        .mockImplementation((input) =>
          original({ ...input, source: `e2e:${runId}` }),
        );
    };

    beforeEach(tagged);
    afterEach(() => jest.restoreAllMocks());

    it('lets exactly one of cancel/complete win when they race', async () => {
      const a = new McpProtocolTaskService(memory);
      const b = new McpProtocolTaskService(memory);
      const task = await a.create('theosphere_answer', { query: 'grace' });

      const [cancelled, completed] = await Promise.allSettled([
        a.cancel(task.taskId),
        b.complete(task.taskId, { content: [] }),
      ]);

      expect([cancelled.status, completed.status].sort()).toEqual([
        'fulfilled',
        'rejected',
      ]);
      const final = await b.get(task.taskId);
      expect(final.status).toBe(
        cancelled.status === 'fulfilled' ? 'cancelled' : 'completed',
      );
    });

    it('never lets a late result overwrite a cancellation', async () => {
      const a = new McpProtocolTaskService(memory);
      const b = new McpProtocolTaskService(memory);
      const task = await a.create('theosphere_answer');

      await a.cancel(task.taskId);
      await expect(b.complete(task.taskId, { content: [] })).rejects.toThrow(
        'already terminal',
      );
      await b.fail(task.taskId, -32603, 'late failure');

      expect((await b.get(task.taskId)).status).toBe('cancelled');
    });

    it('fails only interrupted tasks on restart and does not rewrite terminal ones', async () => {
      const first = new McpProtocolTaskService(memory);
      const running = await first.create('theosphere_answer');
      const done = await first.create('theosphere_answer');
      await first.complete(done.taskId, { content: [] });

      const runningKey = `mcp:protocol-task:${running.taskId}`;
      const doneKey = `mcp:protocol-task:${done.taskId}`;
      const doneRowsBefore = await rowCount(doneKey);

      await new McpProtocolTaskService(memory).onModuleInit();
      const afterRestart = await rowCount(runningKey);
      await new McpProtocolTaskService(memory).onModuleInit();

      expect((await first.get(running.taskId)).status).toBe('failed');
      expect((await first.get(done.taskId)).status).toBe('completed');
      expect(await rowCount(doneKey)).toBe(doneRowsBefore);
      // A second restart finds the task already failed and adds nothing.
      expect(await rowCount(runningKey)).toBe(afterRestart);
    });
  });
});
