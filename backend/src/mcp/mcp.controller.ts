import { BadRequestException, Body, Controller, Delete, Get, Headers, HttpCode, Post, Res, UnauthorizedException } from '@nestjs/common';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { McpProtocolService } from './mcp.protocol.service';

@Controller('mcp')
export class McpController {
  private readonly sessions = new Set<string>();

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
    @Res({ passthrough: true }) res: Response,
  ) {
    this.authorize(authorization);
    this.validateAccept(accept);
    res.setHeader('MCP-Protocol-Version', this.protocol.protocolVersion);
    const request = body as Record<string, unknown>;
    if (request.method === 'initialize') {
      const id = sessionId ?? randomUUID();
      this.sessions.add(id);
      res.setHeader('MCP-Session-Id', id);
    } else if (sessionId) {
      if (!this.sessions.has(sessionId)) throw new UnauthorizedException('Unknown MCP-Session-Id');
      res.setHeader('MCP-Session-Id', sessionId);
    }

    if (Array.isArray(body)) throw new BadRequestException('MCP JSON-RPC batching is not supported by protocol 2025-06-18+');

    if (!body || typeof body !== 'object') {
      throw new BadRequestException('MCP request body must be a JSON-RPC object');
    }
    const response = await this.protocol.handle(body as Record<string, unknown>);
    if (!response) {
      res.statusCode = 202;
      return undefined;
    }
    return response;
  }

  @Get()
  @HttpCode(200)
  handleGet(
    @Headers('authorization') authorization: string | undefined,
    @Headers('mcp-session-id') sessionId: string | undefined,
    @Res() res: Response,
  ) {
    this.authorize(authorization);
    if (!sessionId || !this.sessions.has(sessionId)) throw new BadRequestException('MCP-Session-Id is required for the Streamable HTTP GET stream');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('MCP-Protocol-Version', this.protocol.protocolVersion);
    res.setHeader('MCP-Session-Id', sessionId);
    res.write(': theosphere-mcp stream ready\\n\\n');
    return res;
  }

  @Delete()
  @HttpCode(204)
  handleDelete(
    @Headers('authorization') authorization: string | undefined,
    @Headers('mcp-session-id') sessionId: string | undefined,
  ) {
    this.authorize(authorization);
    if (!sessionId || !this.sessions.has(sessionId)) throw new BadRequestException('MCP-Session-Id is required for session termination');
    this.sessions.delete(sessionId);
  }

  private validateAccept(accept?: string): void {
    const normalized = accept ?? '';
    if (!normalized.includes('application/json') && !normalized.includes('text/event-stream')) throw new BadRequestException('MCP Accept must include application/json or text/event-stream');
  }

  private authorize(authorization?: string): void {
    const configured = this.config.get<string>('MCP_API_KEY');
    const production = this.config.get<string>('NODE_ENV') === 'production';
    if (!configured) {
      if (production) throw new UnauthorizedException('MCP endpoint is disabled until MCP_API_KEY is configured');
      return;
    }
    if (authorization !== `Bearer ${configured}`) throw new UnauthorizedException('Invalid MCP authorization');
  }
}

type JsonRpcResponse = Awaited<ReturnType<McpProtocolService['handle']>>;
