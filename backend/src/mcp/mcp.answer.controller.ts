import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Logger,
  Post,
  Res,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import type { Response } from 'express';
import { TheologyEngineService } from '../engines/theo/theo-engine.service';
import { RagService } from '../rag/rag.service';

@Controller('mcp/answer')
export class McpAnswerController {
  private readonly logger = new Logger(McpAnswerController.name);

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
    if (typeof body?.query !== 'string' || !body.query.trim())
      throw new BadRequestException('query is required');
    const service = this.rag as RagService & {
      chatStreamWithEvidencePack?: (
        query: string,
        pack: unknown,
        userId?: string,
        tradition?: string,
      ) => AsyncGenerator<{ type: string; data: unknown }>;
    };
    // Checked before research: no point spending retrieval on a request that cannot be answered.
    if (typeof service.chatStreamWithEvidencePack !== 'function')
      throw new ServiceUnavailableException(
        'Evidence-aware RAG adapter is not installed',
      );
    const pack = await this.theology.research(
      body.query,
      typeof body.limit === 'number' ? body.limit : 12,
    );

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let clientClosed = false;
    res.on('close', () => {
      clientClosed = true;
    });

    try {
      for await (const event of service.chatStreamWithEvidencePack(
        body.query.trim(),
        pack,
        undefined,
        typeof body.tradition === 'string' ? body.tradition : undefined,
      )) {
        // Stops generation (and quota spend) once the client is gone.
        if (clientClosed) break;
        res.write(
          `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`,
        );
      }
    } catch (error) {
      // Headers are already sent, so an HTTP error status is impossible: report in-band.
      this.logger.error(
        `MCP answer stream failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      if (!clientClosed)
        res.write(
          `event: error\ndata: ${JSON.stringify({ message: 'Answer stream failed' })}\n\n`,
        );
    } finally {
      if (!res.writableEnded) res.end();
    }
  }

  private authorize(authorization?: string): void {
    const configured = this.config.get<string>('MCP_API_KEY');
    if (!configured)
      throw new UnauthorizedException(
        'MCP answer authorization is not configured',
      );
    const expected = Buffer.from(`Bearer ${configured}`);
    const received = Buffer.from(authorization ?? '');
    if (
      expected.length !== received.length ||
      !timingSafeEqual(expected, received)
    ) {
      throw new UnauthorizedException('Invalid MCP answer authorization');
    }
  }
}
