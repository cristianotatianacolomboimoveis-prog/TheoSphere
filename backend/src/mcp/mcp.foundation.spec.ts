import { McpAgentRegistryService } from './mcp.agent-registry.service';
import { McpAuditService } from './mcp.audit.service';
import { McpLockService } from './mcp.lock.service';
import { McpSecurityService } from './mcp.security.service';
import { McpTaskService } from './mcp.task.service';
import { McpProtocolTaskService } from './mcp.protocol-task.service';
import type { McpAgent, McpAuditEvent } from './mcp.types';
import type { McpProjectMemoryService } from './mcp.project-memory.service';

describe('MCP control-plane foundation', () => {
  it('enforces the task lifecycle and records audit events', () => {
    const audit = new McpAuditService();
    const security = new McpSecurityService();
    const registry = new McpAgentRegistryService();
    const tasks = new McpTaskService(security, audit, registry);

    const task = tasks.create({ title: 'Example task', description: 'Verify control-plane lifecycle', priority: 'HIGH', files: ['src/example.ts'], dependencies: [], requiredCapabilities: ['verification'] });
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
    const task = tasks.create({ title: 'Invalid transition', description: 'Must fail closed', priority: 'MEDIUM', files: [], dependencies: [], requiredCapabilities: [] });
    expect(() => tasks.transition(task.id, 'VERIFIED')).toThrow('Invalid MCP task transition');
  });

  it('prevents concurrent file locks', async () => {
    const security = new McpSecurityService();
    const audit = new McpAuditService();
    const locks = new McpLockService(security, audit);
    await locks.acquire(['src/a.ts'], 'TSK-1', 'mcp-orchestrator');
    await expect(locks.acquire(['src/a.ts'], 'TSK-2', 'mcp-orchestrator')).rejects.toThrow('MCP file lock conflict');
  });

  it('uses default-deny permissions for unknown agents', () => {
    const security = new McpSecurityService();
    expect(() => security.assertAllowed('unknown-agent', 'task:create')).toThrow('MCP permission denied');
  });

  it('normalizes agent capabilities and routes capable agents', () => {
    const registry = new McpAgentRegistryService();
    registry.register({ id: 'claude', name: 'Claude', provider: 'claude', capabilities: ['coding', 'coding', ' architecture '], enabled: true });
    expect(registry.findCapable('coding').map((agent) => agent.id)).toEqual(['claude']);
    expect(registry.get('claude')?.capabilities).toEqual(['coding', 'architecture']);
  });

  it('recovers the latest persisted agent snapshot without restoring stale duplicates', async () => {
    const agent: McpAgent = { id: 'claude', name: 'Claude', provider: 'claude', capabilities: ['coding', 'coding', ' architecture '], enabled: true };
    const latestByKeyPrefix = jest.fn().mockResolvedValue([{ content: JSON.stringify({ ...agent, capabilities: ['coding'] }) }]);
    const memory = { latestByKeyPrefix, append: jest.fn().mockResolvedValue(undefined) } as unknown as McpProjectMemoryService;
    const registry = new McpAgentRegistryService(memory);
    await registry.onModuleInit();
    expect(latestByKeyPrefix).toHaveBeenCalledWith('agents', 'mcp:agent:');
    expect(registry.get('claude')).toEqual({ ...agent, capabilities: ['coding'] });
  });

  it('recovers the complete persisted audit history instead of a fixed history window', async () => {
    const older: McpAuditEvent = { id: 'audit-1', timestamp: '2026-09-18T01:00:00.000Z', actor: 'agent-a', action: 'task.created', resourceType: 'task', resourceId: 'TSK-1', outcome: 'success' };
    const newer: McpAuditEvent = { id: 'audit-2', timestamp: '2026-09-18T02:00:00.000Z', actor: 'agent-b', action: 'task.verified', resourceType: 'task', resourceId: 'TSK-1', outcome: 'success' };
    const latestByKeyPrefix = jest.fn().mockResolvedValue([{ content: JSON.stringify(newer), createdAt: new Date('2026-09-18T02:00:00.000Z') }, { content: JSON.stringify(older), createdAt: new Date('2026-09-18T01:00:00.000Z') }]);
    const memory = { latestByKeyPrefix } as unknown as McpProjectMemoryService;
    const audit = new McpAuditService(memory);
    await audit.onModuleInit();
    expect(latestByKeyPrefix).toHaveBeenCalledWith('audits', 'mcp:audit:');
    expect(audit.list()).toEqual([newer, older]);
  });

  it('persists and reloads a completed protocol task', async () => {
    const snapshots: any[] = [];
    const append = jest.fn(async (entry: any) => { snapshots.push(entry); return entry; });
    const latestByKeyPrefix = jest.fn(async () => snapshots.length ? [snapshots[snapshots.length - 1]] : []);
    const mutateLatestJson = jest.fn(async <T>(_category: string, memoryKey: string, mutate: (current: T) => T) => {
      const current = snapshots[snapshots.length - 1];
      const next = mutate(JSON.parse(current.content) as T);
      snapshots.push({ ...current, content: JSON.stringify(next) });
      return next;
    });
    const memory = { append, latestByKeyPrefix, mutateLatestJson } as any;
    const first = new McpProtocolTaskService(memory);
    const created = await first.create('theosphere_answer', { query: 'John 3:16' });
    await first.complete(created.taskId, { content: [{ type: 'text', text: 'Evidence-grounded answer' }], isError: false });
    const second = new McpProtocolTaskService(memory);
    await second.onModuleInit();
    const recovered = await second.get(created.taskId);
    expect(recovered).toEqual(expect.objectContaining({ status: 'completed', result: expect.any(Object) }));
  });

  it('cancels a protocol task and rejects terminal completion', async () => {
    const append = jest.fn(async (entry: unknown) => entry);
    const latestByKeyPrefix = jest.fn(async () => []);
    const mutateLatestJson = jest.fn(async <T>(_category: string, memoryKey: string, mutate: (current: T) => T) => {
      const current = snapshots?.[0];
      if (!current) throw new Error('missing snapshot');
      const next = mutate(JSON.parse(current.content) as T);
      return next;
    });
    const memory = { append, latestByKeyPrefix, mutateLatestJson } as any;
    const service = new McpProtocolTaskService(memory);
    const task = await service.create('theosphere_answer');
    await service.cancel(task.taskId);
    const cancelled = await service.get(task.taskId);
    expect(cancelled.status).toBe('cancelled');
    await expect(service.complete(task.taskId, {})).rejects.toThrow('already terminal');
  });
});
