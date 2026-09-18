import { ConfigService } from '@nestjs/config';
import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { McpController } from './mcp.controller';

describe('McpController', () => {
  const response = { setHeader: jest.fn(), statusCode: 200 } as any;
  const protocol = { protocolVersion: '2026-07-28', legacyProtocolVersion: '2025-11-25', supportedProtocolVersions: ['2026-07-28', '2025-11-25', '2025-06-18'], handle: jest.fn(async (body: unknown) => ({ jsonrpc: '2.0', id: 1, result: body })) } as any;
  const modernMeta = { _meta: { 'io.modelcontextprotocol/protocolVersion': '2026-07-28', 'io.modelcontextprotocol/clientCapabilities': {} } };
  const config = { get: jest.fn((key: string) => key === 'NODE_ENV' ? 'development' : undefined) } as unknown as ConfigService;

  it('rejects an untrusted Origin', async () => {
    const controller = new McpController(protocol, config);
    await expect(controller.handle({ jsonrpc: '2.0', id: 0, method: 'ping' }, undefined, undefined, 'application/json', undefined, undefined, undefined, 'https://evil.example', response)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows localhost Origin', async () => {
    const controller = new McpController(protocol, config);
    await expect(controller.handle({ jsonrpc: '2.0', id: 0, method: 'ping' }, undefined, undefined, 'application/json', undefined, undefined, undefined, 'http://localhost:3000', response)).resolves.toBeDefined();
  });

  it('requires the configured bearer key', async () => {
    const controller = new McpController(protocol, { get: jest.fn((key: string) => key === 'MCP_API_KEY' ? 'x'.repeat(32) : 'production') } as unknown as ConfigService);
    await expect(controller.handle({}, undefined, undefined, 'application/json', undefined, undefined, undefined, undefined, response)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(controller.handle({}, 'Bearer ' + 'x'.repeat(32), undefined, 'application/json', undefined, undefined, undefined, undefined, response)).resolves.toBeDefined();
  });

  it('allows development without a configured key', async () => {
    const controller = new McpController(protocol, config);
    await expect(controller.handle({ jsonrpc: '2.0', id: 1, method: 'ping' }, undefined, undefined, 'application/json', undefined, undefined, undefined, undefined, response)).resolves.toBeDefined();
  });

  it('rejects malformed bodies and JSON-RPC batches', async () => {
    const controller = new McpController(protocol, config);
    await expect(controller.handle('bad', undefined, undefined, 'application/json', undefined, undefined, undefined, undefined, response)).rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.handle([], undefined, undefined, 'application/json', undefined, undefined, undefined, undefined, response)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts a modern notification without routing headers', async () => {
    const controller = new McpController(protocol, config);
    protocol.handle.mockResolvedValueOnce(null);
    response.statusCode = 200;
    const result = await controller.handle({
      jsonrpc: '2.0',
      method: 'notifications/test',
      params: {
        _meta: {
          'io.modelcontextprotocol/protocolVersion': '2026-07-28',
          'io.modelcontextprotocol/clientCapabilities': {},
        },
      },
    }, undefined, undefined, 'application/json', '2026-07-28', undefined, undefined, undefined, response);
    expect(result).toBeUndefined();
    expect(response.statusCode).toBe(202);
  });

  it('returns 202 for a notification-only request', async () => {
    const controller = new McpController(protocol, config);
    protocol.handle.mockResolvedValueOnce(null);
    response.statusCode = 200;
    await expect(controller.handle({ jsonrpc: '2.0', method: 'notifications/initialized' }, undefined, undefined, 'application/json', undefined, undefined, undefined, undefined, response)).resolves.toBeUndefined();
    expect(response.statusCode).toBe(202);
  });

  it('supports modern stateless discovery and rejects legacy session transport for modern requests', async () => {
    const controller = new McpController(protocol, config);
    await expect(controller.handle({ jsonrpc: '2.0', id: 1, method: 'server/discover', params: modernMeta }, undefined, undefined, 'application/json', '2026-07-28', 'server/discover', undefined, undefined, response)).resolves.toBeDefined();
    await expect(controller.handle({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: modernMeta }, undefined, undefined, 'application/json', '2026-07-28', 'tools/list', undefined, undefined, response)).resolves.toBeDefined();
    await expect(controller.handle({ jsonrpc: '2.0', id: 3, method: 'initialize', params: modernMeta }, undefined, undefined, 'application/json', '2026-07-28', 'initialize', undefined, undefined, response)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns in-band header mismatch and unsupported-version errors for modern transport', async () => {
    const controller = new McpController(protocol, config);
    const missingMethod = await controller.handle(
      { jsonrpc: '2.0', id: 20, method: 'ping', params: { _meta: { 'io.modelcontextprotocol/protocolVersion': '2026-07-28', 'io.modelcontextprotocol/clientCapabilities': {} } } },
      undefined, undefined, 'application/json', '2026-07-28', undefined, undefined, undefined, response,
    );
    expect(missingMethod).toEqual({ jsonrpc: '2.0', id: 20, error: expect.objectContaining({ code: -32020 }) });

    const unsupported = await controller.handle(
      { jsonrpc: '2.0', id: 21, method: 'ping' },
      undefined, undefined, 'application/json', '2099-01-01', undefined, undefined, undefined, response,
    );
    expect(unsupported).toEqual({ jsonrpc: '2.0', id: 21, error: expect.objectContaining({ code: -32022 }) });
  });

  it('rejects modern requests with missing or mismatched protocol metadata', async () => {
    const controller = new McpController(protocol, config);
    const missingProtocolMeta = await controller.handle({ jsonrpc: '2.0', id: 1, method: 'ping', params: {} }, undefined, undefined, 'application/json', '2026-07-28', 'ping', undefined, undefined, response);
    expect(missingProtocolMeta).toEqual(expect.objectContaining({ error: expect.objectContaining({ code: -32602 }) }));
    const mismatchedProtocolMeta = await controller.handle({ jsonrpc: '2.0', id: 2, method: 'ping', params: { _meta: { 'io.modelcontextprotocol/protocolVersion': '2025-11-25', 'io.modelcontextprotocol/clientCapabilities': {} } } }, undefined, undefined, 'application/json', '2026-07-28', 'ping', undefined, undefined, response);
    expect(mismatchedProtocolMeta).toEqual(expect.objectContaining({ error: expect.objectContaining({ code: -32602 }) }));
  });

  it('rejects modern requests with missing or malformed client capabilities metadata', async () => {
    const controller = new McpController(protocol, config);
    const missingCapabilities = await controller.handle({ jsonrpc: '2.0', id: 1, method: 'ping', params: { _meta: { 'io.modelcontextprotocol/protocolVersion': '2026-07-28' } } }, undefined, undefined, 'application/json', '2026-07-28', 'ping', undefined, undefined, response);
    expect(missingCapabilities).toEqual(expect.objectContaining({ error: expect.objectContaining({ code: -32602 }) }));
    const malformedCapabilities = await controller.handle({ jsonrpc: '2.0', id: 2, method: 'ping', params: { _meta: { 'io.modelcontextprotocol/protocolVersion': '2026-07-28', 'io.modelcontextprotocol/clientCapabilities': [] } } }, undefined, undefined, 'application/json', '2026-07-28', 'ping', undefined, undefined, response);
    expect(malformedCapabilities).toEqual(expect.objectContaining({ error: expect.objectContaining({ code: -32602 }) }));
  });

  it('returns a modern protocol error for missing Tasks capability', async () => {
    const controller = new McpController(protocol, config);
    const body = {
      jsonrpc: '2.0',
      id: 6,
      method: 'tasks/get',
      params: {
        taskId: 'task-123',
        _meta: {
          'io.modelcontextprotocol/protocolVersion': '2026-07-28',
          'io.modelcontextprotocol/clientCapabilities': {},
        },
      },
    };
    const result = await controller.handle(body, undefined, undefined, 'application/json', '2026-07-28', 'tasks/get', 'task-123', undefined, response);
    expect(response.statusCode).toBe(400);
    expect(result).toEqual(expect.objectContaining({
      error: expect.objectContaining({
        code: -32021,
      }),
    }));
  });

  it('requires Mcp-Name to match taskId for Tasks extension methods', async () => {
    const controller = new McpController(protocol, config);
    const body = {
      jsonrpc: '2.0',
      id: 7,
      method: 'tasks/get',
      params: {
        taskId: 'task-123',
        _meta: {
          'io.modelcontextprotocol/protocolVersion': '2026-07-28',
          'io.modelcontextprotocol/clientCapabilities': { extensions: { 'io.modelcontextprotocol/tasks': {} } },
        },
      },
    };
    const mismatch = await controller.handle(body, undefined, undefined, 'application/json', '2026-07-28', 'tasks/get', undefined, undefined, response);
    expect(mismatch).toEqual(expect.objectContaining({ error: expect.objectContaining({ code: -32020 }) }));
    await expect(controller.handle(body, undefined, undefined, 'application/json', '2026-07-28', 'tasks/get', 'task-123', undefined, response))
      .resolves.toBeDefined();
  });

  it('requires Mcp-Name to match tools/call name', async () => {
    const controller = new McpController(protocol, config);
    const body = {
      jsonrpc: '2.0', id: 8, method: 'tools/call',
      params: {
        name: 'theosphere_snapshot',
        arguments: {},
        _meta: {
          'io.modelcontextprotocol/protocolVersion': '2026-07-28',
          'io.modelcontextprotocol/clientCapabilities': {},
        },
      },
    };
    const mismatch = await controller.handle(body, undefined, undefined, 'application/json', '2026-07-28', 'tools/call', 'wrong-tool', undefined, response);
    expect(mismatch).toEqual(expect.objectContaining({ error: expect.objectContaining({ code: -32020 }) }));
    await expect(controller.handle(body, undefined, undefined, 'application/json', '2026-07-28', 'tools/call', 'theosphere_snapshot', undefined, response))
      .resolves.toBeDefined();
  });

  it('supports session lifecycle for Streamable HTTP GET/DELETE', async () => {
    const controller = new McpController(protocol, config);
    response.statusCode = 200;
    await controller.handle({ jsonrpc: '2.0', id: 1, method: 'initialize' }, undefined, undefined, 'application/json, text/event-stream', undefined, undefined, undefined, undefined, response);
    expect(response.setHeader).toHaveBeenCalledWith('MCP-Session-Id', expect.any(String));
    expect(response.setHeader).toHaveBeenCalledWith('MCP-Protocol-Version', '2025-11-25');
  });
});
