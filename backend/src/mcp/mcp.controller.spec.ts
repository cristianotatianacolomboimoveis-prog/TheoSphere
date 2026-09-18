import { ConfigService } from '@nestjs/config';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { McpController } from './mcp.controller';

describe('McpController', () => {
  const response = { setHeader: jest.fn(), statusCode: 200 } as any;
  const protocol = { protocolVersion: '2026-07-28', supportedProtocolVersions: ['2026-07-28', '2025-11-25', '2025-06-18'], handle: jest.fn(async (body: unknown) => ({ jsonrpc: '2.0', id: 1, result: body })) } as any;
  const modernMeta = { _meta: {
    'io.modelcontextprotocol/protocolVersion': '2026-07-28',
    'io.modelcontextprotocol/clientCapabilities': {},
  } };
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

  it('supports session lifecycle for Streamable HTTP GET/DELETE', async () => {
    const controller = new McpController(protocol, config);
    response.statusCode = 200;
    await controller.handle({ jsonrpc: '2.0', id: 1, method: 'initialize' }, undefined, undefined, 'application/json, text/event-stream', undefined, undefined, response);
    const session = (response.setHeader as jest.Mock).mock.calls.find(([key]) => key === 'MCP-Session-Id')?.[1];
    expect(session).toEqual(expect.any(String));
    expect((response.setHeader as jest.Mock).mock.calls.find(([key]) => key === 'MCP-Protocol-Version')?.[1]).toBe('2025-11-25');
  });
});
