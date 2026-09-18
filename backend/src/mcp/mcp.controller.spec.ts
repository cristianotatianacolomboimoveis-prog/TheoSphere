import { ConfigService } from '@nestjs/config';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { McpController } from './mcp.controller';

describe('McpController', () => {
  const response = { setHeader: jest.fn(), statusCode: 200 } as any;
  const protocol = { protocolVersion: '2025-11-25', handle: jest.fn(async (body: unknown) => ({ jsonrpc: '2.0', id: 1, result: body })) } as any;

  it('requires the configured bearer key', async () => {
    const controller = new McpController(protocol, { get: jest.fn((key: string) => key === 'MCP_API_KEY' ? 'x'.repeat(32) : 'production') } as unknown as ConfigService);
    await expect(controller.handle({}, undefined, undefined, 'application/json', response)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(controller.handle({}, 'Bearer ' + 'x'.repeat(32), undefined, 'application/json', response)).resolves.toBeDefined();
  });

  it('allows development without a configured key', async () => {
    const controller = new McpController(protocol, { get: jest.fn((key: string) => key === 'NODE_ENV' ? 'development' : undefined) } as unknown as ConfigService);
    await expect(controller.handle({ jsonrpc: '2.0', id: 1, method: 'ping' }, undefined, undefined, 'application/json', response)).resolves.toBeDefined();
  });

  it('rejects malformed bodies and JSON-RPC batches', async () => {
    const controller = new McpController(protocol, { get: jest.fn((key: string) => key === 'NODE_ENV' ? 'development' : undefined) } as unknown as ConfigService);
    await expect(controller.handle('bad', undefined, undefined, 'application/json', response)).rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.handle([], undefined, undefined, 'application/json', response)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns 202 for a notification-only request', async () => {
    const controller = new McpController(protocol, { get: jest.fn((key: string) => key === 'NODE_ENV' ? 'development' : undefined) } as unknown as ConfigService);
    protocol.handle.mockResolvedValueOnce(null);
    response.statusCode = 200;
    await expect(controller.handle({ jsonrpc: '2.0', method: 'notifications/initialized' }, undefined, undefined, 'application/json', response)).resolves.toBeUndefined();
    expect(response.statusCode).toBe(202);
  });

  it('supports session lifecycle for Streamable HTTP GET/DELETE', async () => {
    const controller = new McpController(protocol, { get: jest.fn((key: string) => key === 'NODE_ENV' ? 'development' : undefined) } as unknown as ConfigService);
    response.statusCode = 200;
    await controller.handle({ jsonrpc: '2.0', id: 1, method: 'initialize' }, undefined, undefined, 'application/json, text/event-stream', response);
    const session = (response.setHeader as jest.Mock).mock.calls.find(([key]) => key === 'MCP-Session-Id')?.[1];
    expect(session).toEqual(expect.any(String));
  });
});
