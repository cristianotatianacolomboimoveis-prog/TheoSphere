import { McpProtocolService } from './mcp.protocol.service';
import { McpSecurityService } from './mcp.security.service';

describe('McpProtocolService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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
  const autonomy = { dispatch: jest.fn((id: string) => ({ id, status: 'IN_PROGRESS' })), recordResult: jest.fn(async (id: string, _agentId: string, _success: boolean, _summary: string | undefined, receipt: unknown) => ({ taskId: id, status: 'VERIFIED', receipt })) } as any;
  const memory = {
    search: jest.fn(async () => []),
    append: jest.fn(async (input: unknown) => ({ id: 'MEM-1', ...(input as object) })),
  } as any;
  const protocolTasks = {
    create: jest.fn(async (operation: string) => ({
      taskId: 'task-1',
      status: 'working',
      statusMessage: 'Running',
      createdAt: '2026-09-18T10:00:00.000Z',
      lastUpdatedAt: '2026-09-18T10:00:00.000Z',
      ttlMs: 3_600_000,
      pollIntervalMs: 2_000,
      operation,
    })),
    get: jest.fn(() => ({
      taskId: 'task-1', status: 'working', createdAt: '2026-09-18T10:00:00.000Z', lastUpdatedAt: '2026-09-18T10:00:00.000Z', ttlMs: 3_600_000,
    })),
    cancel: jest.fn(async () => undefined),
    complete: jest.fn(async () => undefined),
    fail: jest.fn(async () => undefined),
  } as any;

  const security = new McpSecurityService();
  const rag = { chatWithEvidencePack: jest.fn(async (query: string) => ({ content: 'answer:' + query })) } as any;
  const service = new McpProtocolService(orchestrator, tasks, audit, memory, theology, autonomy, security, rag, protocolTasks);

  it('advertises the Tasks extension in modern discovery', async () => {
    const response = await service.handle(
      { jsonrpc: '2.0', id: 0, method: 'server/discover', params: {
        _meta: {
          'io.modelcontextprotocol/protocolVersion': '2026-07-28',
          'io.modelcontextprotocol/clientCapabilities': {},
        },
      } },
      '2026-07-28',
    );
    expect((response?.result as any).supportedVersions).toEqual([
      '2026-07-28',
      '2025-11-25',
      '2025-06-18',
    ]);
    expect((response?.result as any).capabilities.extensions).toEqual({
      'io.modelcontextprotocol/tasks': {},
    });
    expect((response?.result as any).resultType).toBe('complete');
    expect((response?.result as any).ttlMs).toBe(0);
    expect((response?.result as any).cacheScope).toBe('private');

    const listed = await service.handle(
      { jsonrpc: '2.0', id: 0.5, method: 'tools/list', params: { _meta: {
        'io.modelcontextprotocol/protocolVersion': '2026-07-28',
        'io.modelcontextprotocol/clientCapabilities': {},
      } } },
      '2026-07-28',
    );
    expect((listed?.result as any).ttlMs).toBe(300_000);
    expect((listed?.result as any).cacheScope).toBe('public');
  });

  it('returns an async task handle for answer calls from a tasks-capable client', async () => {
    theology.research.mockResolvedValueOnce({ version: 1, query: 'grace', items: [] });
    protocolTasks.create.mockResolvedValueOnce({
      taskId: 'task-1',
      status: 'working',
      statusMessage: 'Running',
      createdAt: '2026-09-18T10:00:00.000Z',
      lastUpdatedAt: '2026-09-18T10:00:00.000Z',
      ttlMs: 3_600_000,
      pollIntervalMs: 2_000,
    });
    const response = await service.handle(
      {
        jsonrpc: '2.0',
        id: 1.5,
        method: 'tools/call',
        params: {
          name: 'theosphere_answer',
          arguments: { query: 'grace' },
          _meta: {
            'io.modelcontextprotocol/protocolVersion': '2026-07-28',
            'io.modelcontextprotocol/clientCapabilities': {
              extensions: { 'io.modelcontextprotocol/tasks': {} },
            },
          },
        },
      },
      '2026-07-28',
    );
    expect(protocolTasks.create).toHaveBeenCalledWith(
      'theosphere_answer',
      { query: 'grace', limit: 12 },
      'TheoSphere answer is running asynchronously.',
    );
    expect((response?.result as any).resultType).toBe('task');
    expect((response?.result as any).taskId).toBe('task-1');
    expect((response?.result as any).content).toBeUndefined();
    expect((response?.result as any).structuredContent).toBeUndefined();
  });

  it('does not complete a cancelled asynchronous answer task', async () => {
    protocolTasks.create.mockResolvedValueOnce({
      taskId: 'task-cancelled',
      status: 'working',
      statusMessage: 'Running',
      createdAt: '2026-09-18T10:00:00.000Z',
      lastUpdatedAt: '2026-09-18T10:00:00.000Z',
      ttlMs: 3_600_000,
      pollIntervalMs: 2_000,
    });
    protocolTasks.cancel.mockImplementationOnce(async () => undefined);
    const response = await service.handle({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'theosphere_answer',
        arguments: { query: 'hope' },
        _meta: {
          'io.modelcontextprotocol/protocolVersion': '2026-07-28',
          'io.modelcontextprotocol/clientCapabilities': { extensions: { 'io.modelcontextprotocol/tasks': {} } },
        },
      },
    }, '2026-07-28');
    expect((response?.result as any).resultType).toBe('task');
  });
});
