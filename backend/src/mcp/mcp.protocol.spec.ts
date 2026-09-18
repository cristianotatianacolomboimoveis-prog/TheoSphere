import { McpProtocolService } from './mcp.protocol.service';
import { McpSecurityService } from './mcp.security.service';

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
  const audit = { list: jest.fn(() => []) } as any;
  const theology = { research: jest.fn(async () => ({ version: 1, items: [] })) } as any;
  const autonomy = { dispatch: jest.fn((id: string) => ({ id, status: 'IN_PROGRESS' })), recordResult: jest.fn(async (id: string, _agentId: string) => ({ taskId: id, status: 'VERIFIED' })) } as any;
  const memory = {
    search: jest.fn(async () => []),
    append: jest.fn(async (input: unknown) => ({ id: 'MEM-1', ...(input as object) })),
  } as any;

  const security = new McpSecurityService();
  const rag = { chatWithEvidencePack: jest.fn(async (query: string) => ({ content: 'answer:' + query })) } as any;
  const service = new McpProtocolService(orchestrator, tasks, audit, memory, theology, autonomy, security, rag);

  it('supports MCP initialize and tool discovery', async () => {
    const initialized = await service.handle({ jsonrpc: '2.0', id: 1, method: 'initialize' });
    expect(initialized?.result).toEqual(expect.objectContaining({
      protocolVersion: '2025-11-25',
      capabilities: expect.objectContaining({ tools: expect.any(Object) }),
    }));
    const listed = await service.handle({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
    expect((listed?.result as any).tools).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'theosphere_register_agent' }),
      expect.objectContaining({ name: 'theosphere_verify_result' }),
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

  it('routes Theo Engine research and preserves the EvidencePack contract', async () => {
    theology.research.mockResolvedValueOnce({ version: 1, query: 'grace', items: [{ id: 'ev-1', kind: 'primary', provenance: 'bible', reference: 'John 1:14' }], sourceCount: 1, primaryCount: 1, hasCounterEvidence: false, confidence: 0.9 });
    const response = await service.handle({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'theosphere_research', arguments: { query: 'grace', limit: 5 } } });
    expect(theology.research).toHaveBeenCalledWith('grace', 5);
    expect((response?.result as any).structuredContent).toEqual(expect.objectContaining({ items: [expect.objectContaining({ reference: 'John 1:14' })] }));
  });

  it('routes end-to-end Theo research into evidence-aware RAG', async () => {
    theology.research.mockResolvedValueOnce({ version: 1, query: 'grace', items: [], sourceCount: 0, primaryCount: 0, hasCounterEvidence: false, confidence: 0 });
    const response = await service.handle({ jsonrpc: '2.0', id: 8, method: 'tools/call', params: { name: 'theosphere_answer', arguments: { query: 'grace' } } });
    expect(theology.research).toHaveBeenCalledWith('grace', 12);
    expect(rag.chatWithEvidencePack).toHaveBeenCalledWith('grace', expect.anything(), undefined, undefined);
    expect((response?.result as any).structuredContent.content).toBe('answer:grace');
  });

  it('routes autonomous execution tools', async () => {
    const response = await service.handle({ jsonrpc: '2.0', id: 8, method: 'tools/call', params: { name: 'theosphere_dispatch_task', arguments: { taskId: 'TSK-1' } } });
    expect(autonomy.dispatch).toHaveBeenCalledWith('TSK-1');
    expect((response?.result as any).structuredContent.status).toBe('IN_PROGRESS');
  });

  it('enforces protocol permissions before tool execution', async () => {
    security.revoke('mcp-protocol', 'memory:read');
    const denied = await service.handle({ jsonrpc: '2.0', id: 10, method: 'tools/call', params: { name: 'theosphere_memory_search', arguments: { query: 'x' } } });
    expect(denied?.error).toEqual(expect.objectContaining({ code: -32001 }));
    expect(memory.search).not.toHaveBeenCalled();
  });


  it('requires the assigned worker identity when recording results', async () => {
    const response = await service.handle({ jsonrpc: '2.0', id: 11, method: 'tools/call', params: { name: 'theosphere_record_result', arguments: { taskId: 'TSK-1', success: true } } });
    expect(response?.error).toEqual(expect.objectContaining({ code: -32000 }));
    expect(autonomy.recordResult).not.toHaveBeenCalled();
  });

  it('rejects unknown tools and invalid JSON-RPC', async () => {
    const unknown = await service.handle({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'nope', arguments: {} } });
    expect((unknown?.error as any).code).toBe(-32602);
    const invalid = await service.handle({ jsonrpc: '1.0', id: 5, method: 'ping' });
    expect((invalid?.error as any).code).toBe(-32600);
  });

  it('rejects malformed tool call arguments', async () => {
    const response = await service.handle({ jsonrpc: '2.0', id: 9, method: 'tools/call', params: { name: 42 as any, arguments: [] as any } });
    expect((response?.error as any).code).toBe(-32602);
  });

  it('does not answer notifications', async () => {
    await expect(service.handle({ jsonrpc: '2.0', method: 'notifications/initialized' })).resolves.toBeNull();
  });

  it('rejects verification without a verifier identity', async () => {
    const response = await service.handle({ jsonrpc: '2.0', id: 12, method: 'tools/call', params: { name: 'theosphere_verify_result', arguments: { taskId: 'TSK-1' } } });
    expect(response?.error).toEqual(expect.objectContaining({ code: -32602 }));
  });

  it('routes independent verification separately from worker result recording', async () => {
    autonomy.verifyResult = jest.fn(async (id: string, verifierId: string) => ({ taskId: id, status: 'VERIFIED', verifierAgentId: verifierId }));
    const response = await service.handle({ jsonrpc: '2.0', id: 12, method: 'tools/call', params: { name: 'theosphere_verify_result', arguments: { taskId: 'TSK-1', verifierAgentId: 'verifier-1' } } });
    expect(autonomy.verifyResult).toHaveBeenCalledWith('TSK-1', 'verifier-1', undefined);
    expect((response?.result as any).structuredContent.status).toBe('VERIFIED');
  });
});