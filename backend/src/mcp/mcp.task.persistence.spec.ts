import { McpAgentRegistryService } from './mcp.agent-registry.service';
import { McpAuditService } from './mcp.audit.service';
import { McpProjectMemoryService } from './mcp.project-memory.service';
import { McpSecurityService } from './mcp.security.service';
import { McpTaskService } from './mcp.task.service';

describe('MCP task persistence', () => {
  const taskInput = {
    title: 'Persistent task',
    description: 'Verify durable task state',
    priority: 'HIGH' as const,
    files: ['src/example.ts'],
    dependencies: [],
    requiredCapabilities: ['coding'],
  };

  it('persists assignment changes as task snapshots', async () => {
    const append = jest.fn(async (_entry: { content: string }) => undefined);
    const memory = { append } as unknown as McpProjectMemoryService;
    const security = new McpSecurityService();
    const audit = new McpAuditService();
    const registry = new McpAgentRegistryService();
    registry.register({ id: 'agent-1', name: 'Agent 1', provider: 'internal', capabilities: ['coding'], enabled: true });
    const tasks = new McpTaskService(security, audit, registry, memory);

    const task = tasks.create(taskInput);
    tasks.assign(task.id, 'agent-1');
    await Promise.resolve();

    expect(append).toHaveBeenCalledTimes(2);
    const persistedAssignment = append.mock.calls[1]?.[0];
    expect(persistedAssignment).toBeDefined();
    expect(JSON.parse(persistedAssignment?.content ?? '')).toMatchObject({ id: task.id, assignedAgent: 'agent-1', version: 2 });
  });

  it('recovers the newest snapshot per task without a fixed history-row cap', async () => {
    const task = { ...taskInput, id: 'TSK-1', status: 'IN_PROGRESS' as const, dependencies: [], requiredCapabilities: ['coding'], createdAt: '2026-09-18T00:00:00.000Z', updatedAt: '2026-09-18T00:01:00.000Z', version: 4 };
    const latestByKeyPrefix = jest.fn(async () => [{ memoryKey: 'mcp:task:TSK-1', content: JSON.stringify(task) }]);
    const memory = { latestByKeyPrefix } as unknown as McpProjectMemoryService;
    const tasks = new McpTaskService(new McpSecurityService(), new McpAuditService(), new McpAgentRegistryService(), memory);

    await tasks.onModuleInit();

    expect(latestByKeyPrefix).toHaveBeenCalledWith('tasks', 'mcp:task:');
    expect(tasks.get('TSK-1')).toMatchObject({ id: 'TSK-1', status: 'IN_PROGRESS', version: 4 });
  });
});
