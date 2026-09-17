import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { McpController } from './mcp.controller';

describe('McpController', () => {
  const protocol = { protocolVersion: '2025-06-18', handle: jest.fn(async (body: unknown) => ({ jsonrpc: '2.0', id: 1, result: body })) } as any;

  it('requires the configured bearer key', async () => {
    const controller = new McpController(protocol, { get: jest.fn((key: string) => key === 'MCP_API_KEY' ? 'x'.repeat(32) : 'production') } as unknown as ConfigService);
    await expect(controller.handle({}, undefined, undefined, {} as any)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(controller.handle({}, 'Bearer ' + 'x'.repeat(32), undefined, {} as any)).resolves.toBeDefined();
  });

  it('allows development without a configured key', async () => {
    const controller = new McpController(protocol, { get: jest.fn((key: string) => key === 'NODE_ENV' ? 'development' : undefined) } as unknown as ConfigService);
    await expect(controller.handle({ jsonrpc: '2.0', id: 1, method: 'ping' }, undefined, undefined, {} as any)).resolves.toBeDefined();
  });
});
