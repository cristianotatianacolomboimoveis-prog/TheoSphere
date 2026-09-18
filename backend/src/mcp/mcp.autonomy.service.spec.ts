import { McpAutonomyService } from './mcp.autonomy.service';

describe('McpAutonomyService', () => {
  it('dispatches a created task through planning, assignment and start', async () => {
    const tasks = {
      current: { id: 'TSK-1', status: 'CREATED', assignedAgent: undefined },
      get: jest.fn(function(this: any) { return this.current; }),
    } as any;
    const orchestrator = {
      plan: jest.fn(async () => { tasks.current = { ...tasks.current, status: 'PLANNED' }; }),
      assign: jest.fn(async () => { tasks.current = { ...tasks.current, assignedAgent: 'agent-1' }; }),
      lockAndStart: jest.fn(async () => {
        tasks.current = { ...tasks.current, status: 'IN_PROGRESS' };
        return tasks.current;
      }),
    } as any;
    const memory = { append: jest.fn(async () => undefined) } as any;
    const service = new McpAutonomyService(
      orchestrator,
      { get: jest.fn(() => undefined) } as any,
      tasks,
      memory,
    );

    await expect(service.dispatch('TSK-1')).resolves.toEqual(expect.objectContaining({ status: 'IN_PROGRESS' }));
    expect(orchestrator.plan).toHaveBeenCalledWith('TSK-1');
    expect(orchestrator.assign).toHaveBeenCalledWith('TSK-1');
    expect(orchestrator.lockAndStart).toHaveBeenCalledWith('TSK-1');
  });

  it('drives a successful worker result to AUDITING and records memory', async () => {
    const tasks = {
      current: { id: 'TSK-1', status: 'IN_PROGRESS', assignedAgent: 'agent-1', version: 2 },
      get: jest.fn(function(this: any) { return this.current; }),
    } as any;
    const orchestrator = {
      advance: jest.fn(async (id: string, next: string) => {
        tasks.current = { ...tasks.current, status: next, version: tasks.current.version + 1 };
        return tasks.current;
      }),
    } as any;
    const memory = { append: jest.fn(async () => undefined) } as any;
    const service = new McpAutonomyService(orchestrator, { get: jest.fn(() => undefined) } as any, tasks, memory);

    const result = await service.recordResult('TSK-1', 'agent-1', true, 'All worker checks passed.');
    expect(result.status).toBe('AUDITING');
    expect(orchestrator.advance.mock.calls.map((call: any[]) => call[1])).toEqual(['IMPLEMENTED', 'TESTING', 'AUDITING']);
    expect(memory.append).toHaveBeenCalledWith(expect.objectContaining({ taskId: 'TSK-1', agentId: 'agent-1', category: 'tasks' }));
  });

  it('requires an independent verifier before VERIFIED', async () => {
    const tasks = {
      current: { id: 'TSK-2', status: 'AUDITING', assignedAgent: 'agent-1', version: 5 },
      get: jest.fn(function(this: any) { return this.current; }),
    } as any;
    const orchestrator = {
      advance: jest.fn(async (id: string, next: string) => {
        tasks.current = { ...tasks.current, status: next, version: tasks.current.version + 1 };
        return tasks.current;
      }),
    } as any;
    const memory = { append: jest.fn(async () => undefined) } as any;
    const agents = {
      get: jest.fn((id: string) =>
        id === 'verifier-1'
          ? { id: 'verifier-1', name: 'Verifier', provider: 'internal', enabled: true, capabilities: ['verification'] }
          : undefined,
      ),
    } as any;
    const service = new McpAutonomyService(orchestrator, agents, tasks, memory);

    await expect(service.verifyResult('TSK-2', 'agent-1')).rejects.toThrow('independent agent');
    await expect(service.verifyResult('TSK-2', 'unknown')).rejects.toThrow('registered enabled agent with verification capability');
    const result = await service.verifyResult('TSK-2', 'verifier-1', 'Independent checks passed.');
    expect(result.status).toBe('VERIFIED');
    expect(memory.append).toHaveBeenCalledWith(expect.objectContaining({ category: 'audits', agentId: 'verifier-1' }));
  });
});
