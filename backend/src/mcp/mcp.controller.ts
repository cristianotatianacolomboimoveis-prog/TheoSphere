import { Body, Controller, Headers, HttpCode, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
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
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.authorize(authorization);
    res.setHeader('MCP-Protocol-Version', this.protocol.protocolVersion);
    if (sessionId) res.setHeader('MCP-Session-Id', sessionId);

    if (Array.isArray(body)) {
      const responses = [];
      for (const item of body) {
        const response = await this.protocol.handle(item as Record<string, unknown>);
        if (response) responses.push(response);
      }
      return responses;
    }

    if (!body || typeof body !== 'object') {
      throw new UnauthorizedException('MCP request body must be a JSON-RPC object');
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
