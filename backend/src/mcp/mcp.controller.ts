import { BadRequestException, Body, Controller, Headers, HttpCode, Post, Res, UnauthorizedException } from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { McpProtocolService } from './mcp.protocol.service';

@Controller('mcp')
export class McpController {
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
    @Res({ passthrough: true }) res: Response,
  ) {
    this.authorize(authorization);
    res.setHeader('MCP-Protocol-Version', this.protocol.protocolVersion);
    if (sessionId) res.setHeader('MCP-Session-Id', sessionId);

    if (Array.isArray(body)) {
      if (body.length === 0) throw new BadRequestException('MCP batch must not be empty');
      const responses: JsonRpcResponse[] = [];
      for (const item of body) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          throw new BadRequestException('MCP batch entries must be JSON-RPC objects');
        }
        const response = await this.protocol.handle(item as Record<string, unknown>);
        if (response) responses.push(response);
      }
      if (responses.length === 0) {
        res.statusCode = 202;
        return undefined;
      }
      return responses;
    }

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
