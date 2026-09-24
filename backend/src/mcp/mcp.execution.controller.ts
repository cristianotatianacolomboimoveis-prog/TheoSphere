import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import { McpAutonomyService } from './mcp.autonomy.service';
import type { McpExecutionReceipt } from './mcp.types';

interface ResultBody {
  success?: unknown;
  summary?: unknown;
  receipt?: unknown;
}

@Controller('mcp/agents')
export class McpExecutionController {
  constructor(
    private readonly config: ConfigService,
    private readonly autonomy: McpAutonomyService,
  ) {}

  @Post(':agentId/tasks/:taskId/heartbeat')
  async heartbeat(
    @Param('agentId') agentId: string,
    @Param('taskId') taskId: string,
    @Headers('authorization') authorization?: string,
  ) {
    this.authorize(authorization);
    return this.autonomy.renewLocks(taskId, agentId);
  }

  @Post(':agentId/tasks/:taskId/result')
  async recordResult(
    @Param('agentId') agentId: string,
    @Param('taskId') taskId: string,
    @Body() body: ResultBody,
    @Headers('authorization') authorization?: string,
  ) {
    this.authorize(authorization);
    if (typeof body?.success !== 'boolean') {
      throw new BadRequestException(
        'Agent execution result requires boolean success',
      );
    }
    return this.autonomy.recordResult(
      taskId,
      agentId,
      body.success,
      typeof body.summary === 'string' ? body.summary : undefined,
      this.parseReceipt(body.receipt),
    );
  }

  @Post(':agentId/tasks/:taskId/verify')
  async verifyResult(
    @Param('agentId') verifierAgentId: string,
    @Param('taskId') taskId: string,
    @Body() body: { summary?: unknown },
    @Headers('authorization') authorization?: string,
  ) {
    this.authorize(authorization);
    return this.autonomy.verifyResult(
      taskId,
      verifierAgentId,
      typeof body?.summary === 'string' ? body.summary : undefined,
    );
  }

  private parseReceipt(value: unknown): McpExecutionReceipt | undefined {
    if (value === undefined) return undefined;
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException('Invalid MCP execution receipt');
    }

    const receipt = value as Record<string, unknown>;
    if (
      typeof receipt.commitSha !== 'string' ||
      !Array.isArray(receipt.changedFiles) ||
      !Array.isArray(receipt.tests) ||
      typeof receipt.startedAt !== 'string' ||
      typeof receipt.finishedAt !== 'string'
    ) {
      throw new BadRequestException('Invalid MCP execution receipt');
    }

    if (receipt.changedFiles.some((item) => typeof item !== 'string')) {
      throw new BadRequestException(
        'Execution receipt changedFiles must contain only strings',
      );
    }

    const tests: McpExecutionReceipt['tests'] = [];
    for (const test of receipt.tests) {
      if (!test || typeof test !== 'object' || Array.isArray(test)) {
        throw new BadRequestException('Invalid MCP execution receipt test');
      }
      const item = test as Record<string, unknown>;
      const command = item.command;
      const status = item.status;
      if (
        typeof command !== 'string' ||
        (status !== 'passed' && status !== 'failed' && status !== 'skipped')
      ) {
        throw new BadRequestException('Invalid MCP execution receipt test');
      }

      const durationMs = item.durationMs;
      if (
        durationMs !== undefined &&
        (typeof durationMs !== 'number' ||
          !Number.isFinite(durationMs) ||
          durationMs < 0)
      ) {
        throw new BadRequestException(
          'Invalid MCP execution receipt test durationMs',
        );
      }

      tests.push({
        command,
        status,
        ...(durationMs === undefined ? {} : { durationMs }),
      });
    }

    const artifactRefs = receipt.artifactRefs;
    if (
      artifactRefs !== undefined &&
      (!Array.isArray(artifactRefs) ||
        artifactRefs.some((item) => typeof item !== 'string'))
    ) {
      throw new BadRequestException(
        'Execution receipt artifactRefs must contain only strings',
      );
    }

    const agentVersion = receipt.agentVersion;
    if (agentVersion !== undefined && typeof agentVersion !== 'string') {
      throw new BadRequestException(
        'Execution receipt agentVersion must be a string',
      );
    }

    return {
      commitSha: receipt.commitSha,
      changedFiles: receipt.changedFiles as string[],
      tests,
      startedAt: receipt.startedAt,
      finishedAt: receipt.finishedAt,
      ...(artifactRefs === undefined
        ? {}
        : { artifactRefs: artifactRefs as string[] }),
      ...(agentVersion === undefined ? {} : { agentVersion }),
    };
  }

  private authorize(authorization?: string): void {
    const configured = this.config.get<string>('MCP_API_KEY');
    if (!configured)
      throw new UnauthorizedException(
        'MCP agent authorization is not configured',
      );
    const expected = Buffer.from(`Bearer ${configured}`);
    const received = Buffer.from(authorization ?? '');
    if (
      expected.length !== received.length ||
      !timingSafeEqual(expected, received)
    ) {
      throw new UnauthorizedException('Invalid MCP agent authorization');
    }
  }
}
