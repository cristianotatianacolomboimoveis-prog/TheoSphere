import { McpAutonomyService } from './mcp.autonomy.service';

describe('McpAutonomyService', () => {
  it('dispatches a created task through planning, assignment and start', () => {
    const tasks = { current: { id: 'TSK-1', status: 'CREATED', assignedAgent: undefined }, get: jest.fn(function(this: any) { return this.current; }) } as any;
    const orchestrator = {
      plan: jest.fn(() => { tasks.current = { ...tasks.current, status: 'PLANNED' }; }),
      assign: jest.fn(() => { tasks.current = { ...tasks.current, assignedAgent: 'agent-1' }; }),
      lockAndStart: jest.fn(() => { tasks.current = { ...tasks.current, status: 'IN_PROGRESS' }; return tasks.current; }),
    } as any;
    const memory = { append: jest.fn(async () => undefined) } as any;
    const service = new McpAutonomyService(orchestrator, tasks, memory);
    expect(service.dispatch('TSK-1').status).toBe('IN_PROGRESS');
    expect(orchestrator.plan).toHaveBeenCalledWith('TSK-1');
    expect(orchestrator.assign).toHaveBeenCalledWith('TSK-1');
  });

  it('drives a successful worker result to VERIFIED and records memory', async () => {
    const tasks = { current: { id: 'TSK-1', status: 'IN_PROGRESS', assignedAgent: 'agent-1', version: 2 }, get: jest.fn(function(this: any) { return this.current; }) } as any;
    const orchestrator = { advance: jest.fn((id: string, next: string) => { tasks.current = { ...tasks.current, status: next, version: tasks.current.version + 1 }; return tasks.current; }) } as any;
    const memory = { append: jest.fn(async () => undefined) } as any;
    const service = new McpAutonomyService(orchestrator, tasks, memory);
    const result = await service.recordResult('TSK-1', 'agent-1', true, 'All worker checks passed.');
    expect(result.status).toBe('VERIFIED');
    expect(orchestrator.advance.mock.calls.map((call: any[]) => call[1])).toEqual(['IMPLEMENTED', 'TESTING', 'AUDITING', 'VERIFIED']);
    expect(memory.append).toHaveBeenCalledWith(expect.objectContaining({ taskId: 'TSK-1', agentId: 'agent-1', category: 'tasks' }));
  });
});
