import { McpProtocolService } from './mcp.protocol.service';

describe('McpProtocolService', () => {
  const orchestrator = {
    snapshot: jest.fn(() => ({ tasks: [], agents: [], locks: [] })),
    plan: jest.fn((id: string) => ({ id, status: 'PLANNED' })),
    assign: jest.fn((id: string) => ({ id, status: 'PLANNED', assignedAgent: 'agent-1' })),
    registerAgent: jest.fn((agent: unknown) => agent),
    lockAndStart: jest.fn((id: string) => ({ id, status: 'IN_PROGRESS' })),
    advance: jest.fn((id: string, next: string) => ({ id, status: next })),
  } as any;
  const tasks = { create: jest.fn((input: unknown) => ({ id: 'TSK-1', ...(input as object) })) } as any;
  const memory = {
    search: jest.fn(async () => []),
    append: jest.fn(async (input: unknown) => ({ id: 'MEM-1', ...(input as object) })),
  } as any;

  const service = new McpProtocolService(orchestrator, tasks, memory);

  it('supports MCP initialize and tool discovery', async () => {
    const initialized = await service.handle({ jsonrpc: '2.0', id: 1, method: 'initialize' });
    expect(initialized?.result).toEqual(expect.objectContaining({
      protocolVersion: '2025-06-18',
      capabilities: expect.objectContaining({ tools: expect.any(Object) }),
    }));
    const listed = await service.handle({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
    expect((listed?.result as any).tools).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'theosphere_register_agent' }),
      expect.objectContaining({ name: 'theosphere_snapshot' }),
      expect.objectContaining({ name: 'theosphere_memory_search' }),
    ]));
  });

  it('routes agent registration through the orchestrator', async () => {
    const response = await service.handle({
      jsonrpc: '2.0', id: 2.5, method: 'tools/call',
      params: { name: 'theosphere_register_agent', arguments: { id: 'agent-1', name: 'Coder', provider: 'claude', capabilities: ['coding'], enabled: true } },
    });
    expect(orchestrator.registerAgent).toBeDefined();
    expect((response?.result as any).structuredContent).toBeDefined();
  });

  it('routes tools/call to governed services', async () => {
    const response = await service.handle({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'theosphere_plan_task', arguments: { taskId: 'TSK-1' } },
    });
    expect(orchestrator.plan).toHaveBeenCalledWith('TSK-1');
    expect((response?.result as any).structuredContent.status).toBe('PLANNED');
  });

  it('rejects unknown tools and invalid JSON-RPC', async () => {
    const unknown = await service.handle({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'nope', arguments: {} } });
    expect((unknown?.error as any).code).toBe(-32602);
    const invalid = await service.handle({ jsonrpc: '1.0', id: 5, method: 'ping' });
    expect((invalid?.error as any).code).toBe(-32600);
  });

  it('does not answer notifications', async () => {
    await expect(service.handle({ jsonrpc: '2.0', method: 'notifications/initialized' })).resolves.toBeNull();
  });
});
