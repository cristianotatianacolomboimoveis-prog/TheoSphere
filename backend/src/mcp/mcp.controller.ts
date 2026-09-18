import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Headers, HttpCode, MethodNotAllowedException, Post, Res, UnauthorizedException } from '@nestjs/common';
import type { Response } from 'express';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { McpProtocolService } from './mcp.protocol.service';

@Controller('mcp')
export class McpController {
  private readonly sessions = new Map<string, string>();

  constructor(
    private readonly protocol: McpProtocolService,
    private readonly config: ConfigService,
  ) {}

  @Post()
  @HttpCode(200)
  async handle(
    @Body() body: unknown,
    @Headers('authorization') authorization: string | undefined,
    @Headers('mcp-session-id') sessionId: string | undefined,
    @Headers('accept') accept: string | undefined,
    @Headers('mcp-protocol-version') requestedVersion: string | undefined,
    @Headers('mcp-method') mcpMethod: string | undefined,
    @Headers('mcp-name') mcpName: string | undefined,
    @Headers('origin') origin: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.authorize(authorization);
    this.validateOrigin(origin);
    this.validateAccept(accept);
    const requestObject = typeof body === 'object' && body !== null && !Array.isArray(body)
      ? body as Record<string, unknown>
      : undefined;
    const requestId = requestObject?.id ?? null;
    const declaredProtocolVersion = requestObject?.params && typeof requestObject.params === 'object' && !Array.isArray(requestObject.params)
      ? ((requestObject.params as Record<string, unknown>)._meta && typeof (requestObject.params as Record<string, unknown>)._meta === 'object' && !Array.isArray((requestObject.params as Record<string, unknown>)._meta)
        ? ((requestObject.params as Record<string, unknown>)._meta as Record<string, unknown>)['io.modelcontextprotocol/protocolVersion']
        : undefined)
      : undefined;
    const modern = requestedVersion === this.protocol.protocolVersion;
    if (requestedVersion && !this.protocol.supportedProtocolVersions.includes(requestedVersion)) {
      return this.protocolError(res, requestId, -32022, 'Unsupported MCP protocol version');
    }
    if (declaredProtocolVersion === this.protocol.protocolVersion && requestedVersion !== this.protocol.protocolVersion) {
      return this.protocolError(res, requestId, -32020, 'MCP-Protocol-Version header must match request metadata');
    }
    const modernMethod = requestObject?.method;
    if (modern) {
      if (sessionId) return this.protocolError(res, requestId, -32020, 'MCP-Session-Id must not be sent for MCP 2026-07-28');
      if (mcpMethod !== modernMethod) return this.protocolError(res, requestId, -32020, 'Mcp-Method header must match JSON-RPC method');
      if (modernMethod === 'tools/call') {
        const toolName = requestObject?.params && typeof requestObject.params === 'object' && !Array.isArray(requestObject.params)
          ? (requestObject.params as Record<string, unknown>).name : undefined;
        if (mcpName !== toolName) return this.protocolError(res, requestId, -32020, 'Mcp-Name header must match tools/call name');
      } else if (modernMethod === 'tasks/get' || modernMethod === 'tasks/update' || modernMethod === 'tasks/cancel') {
        const taskId = requestObject?.params && typeof requestObject.params === 'object' && !Array.isArray(requestObject.params)
          ? (requestObject.params as Record<string, unknown>).taskId : undefined;
        if (mcpName !== taskId) return this.protocolError(res, requestId, -32020, 'Mcp-Name header must match taskId');
      }
    }
    if (Array.isArray(body)) throw new BadRequestException('MCP JSON-RPC batching is not supported by protocol 2025-06-18+');
    if (!body || typeof body !== 'object') throw new BadRequestException('MCP request body must be a JSON-RPC object');

    const request = body as Record<string, unknown>;
    const rawParams = request.params;
    const params = rawParams && typeof rawParams === 'object' && !Array.isArray(rawParams) ? rawParams as Record<string, unknown> : undefined;
    const meta = params?._meta;
    const requestMeta = meta && typeof meta === 'object' && !Array.isArray(meta) ? meta as Record<string, unknown> : undefined;

    if (modern) {
      if (requestMeta?.['io.modelcontextprotocol/protocolVersion'] !== this.protocol.protocolVersion) return this.protocolError(res, requestId, -32602, 'MCP protocol version metadata is required and must match 2026-07-28');
      const clientCapabilities = requestMeta['io.modelcontextprotocol/clientCapabilities'];
      if (!clientCapabilities || typeof clientCapabilities !== 'object' || Array.isArray(clientCapabilities)) return this.protocolError(res, requestId, -32602, 'MCP client capabilities metadata is required');
      if (modernMethod === 'tasks/get' || modernMethod === 'tasks/update' || modernMethod === 'tasks/cancel') {
        const extensions = (clientCapabilities as Record<string, unknown>).extensions;
        if (!extensions || typeof extensions !== 'object' || Array.isArray(extensions) || !('io.modelcontextprotocol/tasks' in extensions)) return { jsonrpc: '2.0', id: request.id ?? null, error: { code: -32021, message: 'MCP Tasks extension capability is required' } };
      }
    }
    if (modern && (request.method === 'initialize' || request.method === 'notifications/initialized')) throw new BadRequestException('initialize is not part of MCP 2026-07-28');
    if (!modern && request.method === 'server/discover') throw new BadRequestException('server/discover requires MCP 2026-07-28');

    let effectiveProtocolVersion = this.protocol.legacyProtocolVersion;
    if (modern) effectiveProtocolVersion = this.protocol.protocolVersion;
    else if (request.method === 'initialize') {
      const requested = typeof params?.protocolVersion === 'string' ? params.protocolVersion : undefined;
      effectiveProtocolVersion = requested && ['2025-11-25', '2025-06-18'].includes(requested) ? requested : this.protocol.legacyProtocolVersion;
      const id = randomUUID(); this.sessions.set(id, effectiveProtocolVersion); res.setHeader('MCP-Session-Id', id);
    } else if (sessionId) {
      const sessionVersion = this.sessions.get(sessionId);
      if (!sessionVersion) throw new UnauthorizedException('Unknown MCP-Session-Id');
      if (requestedVersion && requestedVersion !== sessionVersion) throw new BadRequestException('MCP protocol version does not match the session');
      effectiveProtocolVersion = sessionVersion; res.setHeader('MCP-Session-Id', sessionId);
    } else if (requestedVersion) effectiveProtocolVersion = requestedVersion;

    res.setHeader('MCP-Protocol-Version', effectiveProtocolVersion);
    const response = await this.protocol.handle(body as Record<string, unknown>, effectiveProtocolVersion);
    if (modern && request.method === 'server/discover' && response?.result && typeof response.result === 'object' && !Array.isArray(response.result)) {
      const result = response.result as Record<string, unknown>;
      const capabilities = result.capabilities && typeof result.capabilities === 'object' && !Array.isArray(result.capabilities) ? result.capabilities as Record<string, unknown> : {};
      const extensions = capabilities.extensions && typeof capabilities.extensions === 'object' && !Array.isArray(capabilities.extensions) ? capabilities.extensions as Record<string, unknown> : {};
      return { ...response, result: { ...result, capabilities: { ...capabilities, extensions: { ...extensions, 'io.modelcontextprotocol/tasks': {} } } } };
    }
    if (!response) { res.statusCode = 202; return undefined; }
    return response;
  }

  @Get()
  @HttpCode(200)
  handleGet(@Headers('authorization') authorization: string | undefined, @Headers('mcp-session-id') sessionId: string | undefined, @Headers('mcp-protocol-version') requestedVersion: string | undefined, @Res() res: Response) {
    this.authorize(authorization);
    if (requestedVersion && !this.protocol.supportedProtocolVersions.includes(requestedVersion)) throw new BadRequestException('Unsupported MCP protocol version');
    if (requestedVersion === this.protocol.protocolVersion) throw new MethodNotAllowedException('MCP 2026-07-28 is stateless; GET stream is unavailable');
    const sessionVersion = sessionId ? this.sessions.get(sessionId) : undefined;
    if (!sessionId || !sessionVersion) throw new BadRequestException('MCP-Session-Id is required for the Streamable HTTP GET stream');
    if (requestedVersion && requestedVersion !== sessionVersion) throw new BadRequestException('MCP protocol version does not match the session');
    res.setHeader('Content-Type', 'text/event-stream'); res.setHeader('Cache-Control', 'no-cache'); res.setHeader('Connection', 'keep-alive'); res.setHeader('MCP-Protocol-Version', sessionVersion); res.setHeader('MCP-Session-Id', sessionId); res.write(': theosphere-mcp stream ready\\n\\n'); return res;
  }

  @Delete()
  @HttpCode(204)
  handleDelete(@Headers('authorization') authorization: string | undefined, @Headers('mcp-session-id') sessionId: string | undefined, @Headers('mcp-protocol-version') requestedVersion: string | undefined) {
    this.authorize(authorization);
    if (requestedVersion && !this.protocol.supportedProtocolVersions.includes(requestedVersion)) throw new BadRequestException('Unsupported MCP protocol version');
    if (requestedVersion === this.protocol.protocolVersion) throw new MethodNotAllowedException('MCP 2026-07-28 is stateless; DELETE session is unavailable');
    const sessionVersion = sessionId ? this.sessions.get(sessionId) : undefined;
    if (!sessionId || !sessionVersion) throw new BadRequestException('MCP-Session-Id is required for session termination');
    if (requestedVersion && requestedVersion !== sessionVersion) throw new BadRequestException('MCP protocol version does not match the session');
    this.sessions.delete(sessionId);
  }

  private protocolError(res: Response, id: unknown, code: number, message: string): JsonRpcResponse {
    res.statusCode = 400;
    const requestId = typeof id === 'string' || typeof id === 'number' ? id : null;
    return { jsonrpc: '2.0', id: requestId, error: { code, message } };
  }

  private stringParam(value: unknown, name: string): string { if (typeof value !== 'string' || !value.trim()) throw new BadRequestException(`MCP ${name} must be a non-empty string`); return value.trim(); }
  private validateOrigin(origin?: string): void {
    if (!origin) return;
    const configured = this.config.get<string>('ALLOWED_ORIGINS')
      ?.split(',')
      .map((value) => value.trim())
      .filter(Boolean) ?? [];
    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(origin);
    const isVercel = /^https:\/\/(frontend-v2|cristianocolombo)[\\w-]*\.vercel\.app$/.test(origin);
    if (!isLocalhost && !isVercel && !configured.includes(origin)) {
      throw new ForbiddenException('MCP Origin is not allowed');
    }
  }

  private validateAccept(accept?: string): void { const normalized = accept ?? ''; if (!normalized.includes('application/json') && !normalized.includes('text/event-stream')) throw new BadRequestException('MCP Accept must include application/json or text/event-stream'); }
  private authorize(authorization?: string): void {
    const configured = this.config.get<string>('MCP_API_KEY'); const production = this.config.get<string>('NODE_ENV') === 'production';
    if (!configured) { if (production) throw new UnauthorizedException('MCP endpoint is disabled until MCP_API_KEY is configured'); return; }
    const expected = Buffer.from(`Bearer ${configured}`); const received = Buffer.from(authorization ?? '');
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) throw new UnauthorizedException('Invalid MCP authorization');
  }
}

type JsonRpcResponse = Awaited<ReturnType<McpProtocolService['handle']>>;
