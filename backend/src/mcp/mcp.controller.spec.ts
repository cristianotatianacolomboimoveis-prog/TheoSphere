import { ConfigService } from '@nestjs/config';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { McpController } from './mcp.controller';

describe('McpController', () => {
  const response = { setHeader: jest.fn(), statusCode: 200 } as any;
  const protocol = { protocolVersion: '2026-07-28', supportedProtocolVersions: ['2026-07-28', '2025-11-25', '2025-06-18'], handle: jest.fn(async (body: unknown) => ({ jsonrpc: '2.0', id: 1, result: body })) } as any;
  const modernMeta = { _meta: { 'io.modelcontextprotocol/protocolVersion': '2026-07-28', 'io.modelcontextprotocol/clientCapabilities': {} } };
  const taskMeta = { _meta: { 'io.modelcontextprotocol/protocolVersion': '2026-07-28', 'io.modelcontextprotocol/clientCapabilities': { extensions: { 'io.modelcontextprotocol/tasks': {} } } } };
  const config = { get: jest.fn((key: string) => key === 'NODE_ENV' ? 'development' : undefined) } as unknown as ConfigService;

  it('requires the configured bearer key', async () => {
    const controller = new McpController(protocol, { get: jest.fn((key: string) => key === 'MCP_API_KEY' ? 'x'.repeat(32) : 'production') } as unknown as ConfigService);
    await expect(controller.handle({}, undefined, undefined, 'application/json', undefined, undefined, response)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(controller.handle({}, 'Bearer ' + 'x'.repeat(32), undefined, 'application/json', undefined, undefined, response)).resolves.toBeDefined();
  });

  it('allows development without a configured key', async () => {
    const controller = new McpController(protocol, config);
    await expect(controller.handle({ jsonrpc: '2.0', id: 1, method: 'ping' }, undefined, undefined, 'application/json', undefined, undefined, response)).resolves.toBeDefined();
  });

  it('rejects malformed bodies and JSON-RPC batches', async () => {
    const controller = new McpController(protocol, config);
    await expect(controller.handle('bad', undefined, undefined, 'application/json', undefined, undefined, response)).rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.handle([], undefined, undefined, 'application/json', undefined, undefined, response)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns 202 for a notification-only request', async () => {
    const controller = new McpController(protocol, config);
    protocol.handle.mockResolvedValueOnce(null);
    response.statusCode = 200;
    await expect(controller.handle({ jsonrpc: '2.0', method: 'notifications/initialized' }, undefined, undefined, 'application/json', undefined, undefined, response)).resolves.toBeUndefined();
    expect(response.statusCode).toBe(202);
  });

  it('supports modern stateless discovery and rejects legacy session transport for modern requests', async () => {
    const controller = new McpController(protocol, config);
    await expect(controller.handle({ jsonrpc: '2.0', id: 1, method: 'server/discover', params: modernMeta }, undefined, undefined, 'application/json', '2026-07-28', 'server/discover', undefined, response)).resolves.toBeDefined();
    await expect(controller.handle({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: modernMeta }, undefined, undefined, 'application/json', '2026-07-28', 'tools/list', undefined, response)).resolves.toBeDefined();
    await expect(controller.handle({ jsonrpc: '2.0', id: 3, method: 'initialize', params: modernMeta }, undefined, undefined, 'application/json', '2026-07-28', 'initialize', undefined, response)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects modern requests with missing or mismatched protocol metadata', async () => {
    const controller = new McpController(protocol, config);
    await expect(controller.handle({ jsonrpc: '2.0', id: 1, method: 'ping', params: {} }, undefined, undefined, 'application/json', '2026-07-28', 'ping', undefined, response)).rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.handle({ jsonrpc: '2.0', id: 2, method: 'ping', params: { _meta: { 'io.modelcontextprotocol/protocolVersion': '2025-11-25', 'io.modelcontextprotocol/clientCapabilities': {} } } }, undefined, undefined, 'application/json', '2026-07-28', 'ping', undefined, response)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects modern requests with missing or malformed client capabilities metadata', async () => {
    const controller = new McpController(protocol, config);
    await expect(controller.handle({ jsonrpc: '2.0', id: 1, method: 'ping', params: { _meta: { 'io.modelcontextprotocol/protocolVersion': '2026-07-28' } } }, undefined, undefined, 'application/json', '2026-07-28', 'ping', undefined, response)).rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.handle({ jsonrpc: '2.0', id: 2, method: 'ping', params: { _meta: { 'io.modelcontextprotocol/protocolVersion': '2026-07-28', 'io.modelcontextprotocol/clientCapabilities': [] } } }, undefined, undefined, 'application/json', '2026-07-28', 'ping', undefined, response)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires the tasks extension capability for task methods', async () => {
    const controller = new McpController(protocol, config);
    const responseValue = await controller.handle({ jsonrpc: '2.0', id: 1, method: 'tasks/get', params: { taskId: 'task-123', ...modernMeta } }, undefined, undefined, 'application/json', '2026-07-28', 'tasks/get', 'task-123', response);
    expect(responseValue).toEqual(expect.objectContaining({ error: expect.objectContaining({ code: -32021 }) }));
  });

  it('routes durable task polling, update and cancellation to the task store', async () => {
    const protocolTasks = {
      get: jest.fn(() => ({ taskId: 'task-123', status: 'working', createdAt: '2026-09-18T10:00:00.000Z', lastUpdatedAt: '2026-09-18T10:00:01.000Z', ttlMs: 3600000, pollIntervalMs: 2000 })),
      update: jest.fn(async () => undefined),
      cancel: jest.fn(async () => undefined),
    } as any;
    const controller = new McpController(protocol, config, protocolTasks);
    const task = await controller.handle({ jsonrpc: '2.0', id: 1, method: 'tasks/get', params: { taskId: 'task-123', ...taskMeta } }, undefined, undefined, 'application/json', '2026-07-28', 'tasks/get', 'task-123', response);
    expect(task).toEqual(expect.objectContaining({ result: expect.objectContaining({ resultType: 'complete', taskId: 'task-123', status: 'working' }) }));
    await expect(controller.handle({ jsonrpc: '2.0', id: 2, method: 'tasks/update', params: { taskId: 'task-123', inputResponses: { approval: { action: 'accept' } }, ...taskMeta } }, undefined, undefined, 'application/json', '2026-07-28', 'tasks/update', 'task-123', response)).resolves.toEqual({ jsonrpc: '2.0', id: 2, result: { resultType: 'complete' } });
    expect(protocolTasks.update).toHaveBeenCalledWith('task-123', { approval: { action: 'accept' } });
    await expect(controller.handle({ jsonrpc: '2.0', id: 3, method: 'tasks/cancel', params: { taskId: 'task-123', ...taskMeta } }, undefined, undefined, 'application/json', '2026-07-28', 'tasks/cancel', 'task-123', response)).resolves.toEqual({ jsonrpc: '2.0', id: 3, result: { resultType: 'complete' } });
    expect(protocolTasks.cancel).toHaveBeenCalledWith('task-123');
  });

  it('creates a durable task for task-capable evidence calls and completes it asynchronously', async () => {
    const protocolTasks = {
      create: jest.fn(async () => ({ taskId: 'task-answer', status: 'working', createdAt: '2026-09-18T10:00:00.000Z', lastUpdatedAt: '2026-09-18T10:00:00.000Z', ttlMs: 3600000, pollIntervalMs: 2000 })),
      complete: jest.fn(async () => undefined),
      fail: jest.fn(async () => undefined),
    } as any;
    protocol.handle.mockResolvedValueOnce({ jsonrpc: '2.0', id: 4, result: { content: [{ type: 'text', text: 'evidence answer' }], isError: false } });
    const controller = new McpController(protocol, config, protocolTasks);
    const created = await controller.handle({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'theosphere_answer', arguments: { query: 'John 3:16' }, ...taskMeta } }, undefined, undefined, 'application/json', '2026-07-28', 'tools/call', 'theosphere_answer', response);
    expect(created).toEqual(expect.objectContaining({ result: expect.objectContaining({ resultType: 'task', taskId: 'task-answer', status: 'working' }) }));
    expect(protocolTasks.create).toHaveBeenCalledWith('theosphere_answer', { query: 'John 3:16' });
    await new Promise((resolve) => setImmediate(resolve));
    expect(protocolTasks.complete).toHaveBeenCalledWith('task-answer', expect.objectContaining({ content: expect.any(Array), isError: false }));
  });

  it('supports session lifecycle for Streamable HTTP GET/DELETE', async () => {
    const controller = new McpController(protocol, config);
    response.statusCode = 200;
    await controller.handle({ jsonrpc: '2.0', id: 1, method: 'initialize' }, undefined, undefined, 'application/json, text/event-stream', undefined, undefined, response);
    const session = (response.setHeader as jest.Mock).mock.calls.find(([key]) => key === 'MCP-Session-Id')?.[1];
    expect(session).toEqual(expect.any(String));
    expect((response.setHeader as jest.Mock).mock.calls.find(([key]) => key === 'MCP-Protocol-Version')?.[1]).toBe('2025-11-25');
  });
});
