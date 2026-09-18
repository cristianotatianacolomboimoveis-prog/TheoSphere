import { McpAgentRegistryService } from './mcp.agent-registry.service';
import { McpAuditService } from './mcp.audit.service';
import { McpLockService } from './mcp.lock.service';
import { McpOrchestratorService } from './mcp.orchestrator.service';
import { McpSecurityService } from './mcp.security.service';
import { McpTaskService } from './mcp.task.service';

describe('MCP orchestrator', () => {
  function setup() {
    const audit = new McpAuditService();
    const security = new McpSecurityService();
    const agents = new McpAgentRegistryService();
    const tasks = new McpTaskService(security, audit, agents);
    const locks = new McpLockService(security, audit);
    const orchestrator = new McpOrchestratorService(tasks, agents, locks, security);
    return { orchestrator, tasks, agents, locks };
  }

  it('plans, routes, locks and starts a coding task', async () => {
    const { orchestrator, tasks } = setup();
    orchestrator.registerAgent({ id: 'claude-coder', name: 'Claude Coder', provider: 'claude', capabilities: ['coding'], enabled: true });
    const task = tasks.create({ title: 'Implement service', description: 'Implement MCP code', priority: 'HIGH', files: ['src/a.ts'], dependencies: [], requiredCapabilities: ['coding'] });
    orchestrator.plan(task.id);
    orchestrator.assign(task.id);
    expect(tasks.get(task.id).assignedAgent).toBe('claude-coder');
    await expect(orchestrator.lockAndStart(task.id)).resolves.toEqual(expect.objectContaining({ status: 'IN_PROGRESS' }));
  });

  it('does not start a task with an unresolved dependency', () => {
    const { orchestrator, tasks } = setup();
    orchestrator.registerAgent({ id: 'coder', name: 'Coder', provider: 'internal', capabilities: ['coding'], enabled: true });
    const dep = tasks.create({ title: 'Dependency', description: 'Dependency', priority: 'HIGH', files: [], dependencies: [], requiredCapabilities: [] });
    const task = tasks.create({ title: 'Dependent', description: 'Code after dependency', priority: 'HIGH', files: [], dependencies: [dep.id], requiredCapabilities: ['coding'] });
    expect(() => orchestrator.plan(task.id)).not.toThrow();
    expect(() => tasks.transition(task.id, 'LOCKED')).toThrow('dependencies are not verified');
  });
});
