import { BadRequestException, Body, Controller, Headers, Post, Res, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { TheologyEngineService } from '../engines/theo/theo-engine.service';
import { RagService } from '../rag/rag.service';

@Controller('mcp/answer')
export class McpAnswerController {
  constructor(
    private readonly config: ConfigService,
    private readonly theology: TheologyEngineService,
    private readonly rag: RagService,
  ) {}

  @Post('stream')
  async stream(
    @Body() body: { query?: unknown; limit?: unknown; tradition?: unknown },
    @Headers('authorization') authorization: string | undefined,
    @Res() res: Response,
  ) {
    this.authorize(authorization);
    if (typeof body?.query !== 'string' || !body.query.trim()) throw new BadRequestException('query is required');
    const pack = await this.theology.research(body.query, typeof body.limit === 'number' ? body.limit : 12);
    const service = this.rag as RagService & {
      chatStreamWithEvidencePack?: (query: string, pack: unknown, userId?: string, tradition?: string) => AsyncGenerator<{ type: string; data: unknown }>;
    };
    if (typeof service.chatStreamWithEvidencePack !== 'function') throw new UnauthorizedException('Evidence-aware RAG adapter is not installed');

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    for await (const event of service.chatStreamWithEvidencePack(body.query.trim(), pack, undefined, typeof body.tradition === 'string' ? body.tradition : undefined)) {
      res.write(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`);
    }
    res.end();
  }

  private authorize(authorization?: string): void {
    const configured = this.config.get<string>('MCP_API_KEY');
    if (!configured || authorization !== `Bearer ${configured}`) throw new UnauthorizedException('Invalid MCP answer authorization');
  }
}
