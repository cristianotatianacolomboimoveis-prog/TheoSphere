import { McpAgentRegistryService } from './mcp.agent-registry.service';
import { McpAuditService } from './mcp.audit.service';
import { McpLockService } from './mcp.lock.service';
import { McpSecurityService } from './mcp.security.service';
import { McpTaskService } from './mcp.task.service';
import type { McpAgent } from './mcp.types';
import type { McpProjectMemoryService } from './mcp.project-memory.service';

describe('MCP control-plane foundation', () => {
  it('enforces the task lifecycle and records audit events', () => {
    const audit = new McpAuditService();
    const security = new McpSecurityService();
    const registry = new McpAgentRegistryService();
    const tasks = new McpTaskService(security, audit, registry);

    const task = tasks.create({
      title: 'Example task',
      description: 'Verify control-plane lifecycle',
      priority: 'HIGH',
      files: ['src/example.ts'],
      dependencies: [],
      requiredCapabilities: ['verification'],
    });

    expect(tasks.transition(task.id, 'PLANNED').status).toBe('PLANNED');
    expect(tasks.transition(task.id, 'LOCKED').status).toBe('LOCKED');
    expect(tasks.transition(task.id, 'IN_PROGRESS').status).toBe('IN_PROGRESS');
    expect(tasks.transition(task.id, 'IMPLEMENTED').status).toBe('IMPLEMENTED');
    expect(tasks.transition(task.id, 'TESTING').status).toBe('TESTING');
    expect(tasks.transition(task.id, 'AUDITING').status).toBe('AUDITING');
    expect(tasks.transition(task.id, 'VERIFIED').status).toBe('VERIFIED');
    expect(audit.list().length).toBeGreaterThanOrEqual(7);
  });

  it('rejects an invalid lifecycle transition', () => {
    const tasks = new McpTaskService(new McpSecurityService(), new McpAuditService(), new McpAgentRegistryService());
    const task = tasks.create({
      title: 'Invalid transition',
      description: 'Must fail closed',
      priority: 'MEDIUM',
      files: [],
      dependencies: [],
      requiredCapabilities: [],
    });

    expect(() => tasks.transition(task.id, 'VERIFIED')).toThrow(
      'Invalid MCP task transition',
    );
  });

  it('prevents concurrent file locks', async () => {
    const security = new McpSecurityService();
    const audit = new McpAuditService();
    const locks = new McpLockService(security, audit);
    await locks.acquire(['src/a.ts'], 'TSK-1', 'mcp-orchestrator');

    await expect(
      locks.acquire(['src/a.ts'], 'TSK-2', 'mcp-orchestrator'),
    ).rejects.toThrow('MCP file lock conflict');
  });

  it('uses default-deny permissions for unknown agents', () => {
    const security = new McpSecurityService();
    expect(() => security.assertAllowed('unknown-agent', 'task:create')).toThrow(
      'MCP permission denied',
    );
  });

  it('normalizes agent capabilities and routes capable agents', () => {
    const registry = new McpAgentRegistryService();
    registry.register({
      id: 'claude',
      name: 'Claude',
      provider: 'claude',
      capabilities: ['coding', 'coding', ' architecture '],
      enabled: true,
    });

    expect(registry.findCapable('coding').map((agent) => agent.id)).toEqual(['claude']);
    expect(registry.get('claude')?.capabilities).toEqual(['coding', 'architecture']);
  });

  it('recovers the latest persisted agent snapshot without restoring stale duplicates', async () => {
    const agent: McpAgent = {
      id: 'claude', name: 'Claude', provider: 'claude',
      capabilities: ['coding', 'coding', ' architecture '], enabled: true,
    };
    const memory = {
      latestByKeyPrefix: jest.fn().mockResolvedValue([
        { content: JSON.stringify({ ...agent, capabilities: ['coding'] }) },
      ]),
      append: jest.fn().mockResolvedValue(undefined),
    } as unknown as McpProjectMemoryService;
    const registry = new McpAgentRegistryService(memory);

    await registry.onModuleInit();

    expect(memory.latestByKeyPrefix).toHaveBeenCalledWith('agents', 'mcp:agent:');
    expect(registry.get('claude')).toEqual({ ...agent, capabilities: ['coding'] });
  });
});
