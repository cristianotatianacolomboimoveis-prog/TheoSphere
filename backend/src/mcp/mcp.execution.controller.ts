import { Body, Controller, Headers, Param, Post, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
    if (typeof body?.success !== 'boolean') throw new UnauthorizedException('Agent execution result requires boolean success');
    return this.autonomy.recordResult(taskId, agentId, body.success, typeof body.summary === 'string' ? body.summary : undefined, this.parseReceipt(body.receipt));
  }

  @Post(':agentId/tasks/:taskId/verify')
  async verifyResult(
    @Param('agentId') verifierAgentId: string,
    @Param('taskId') taskId: string,
    @Body() body: { summary?: unknown },
    @Headers('authorization') authorization?: string,
  ) {
    this.authorize(authorization);
    return this.autonomy.verifyResult(taskId, verifierAgentId, typeof body?.summary === 'string' ? body.summary : undefined);
  }

  private parseReceipt(value: unknown): McpExecutionReceipt | undefined {
    if (value === undefined) return undefined;
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new UnauthorizedException('Invalid MCP execution receipt');
    const receipt = value as Record<string, unknown>;
    if (
      typeof receipt.commitSha !== 'string' ||
      !Array.isArray(receipt.changedFiles) ||
      !Array.isArray(receipt.tests) ||
      typeof receipt.startedAt !== 'string' ||
      typeof receipt.finishedAt !== 'string'
    ) throw new UnauthorizedException('Invalid MCP execution receipt');

    if (receipt.changedFiles.some((v) => typeof v !== 'string')) {
      throw new UnauthorizedException('Execution receipt changedFiles must contain only strings');
    }
    const changedFiles = receipt.changedFiles as string[];
    const tests = receipt.tests.map((test) => {
      if (!test || typeof test !== 'object' || Array.isArray(test)) throw new UnauthorizedException('Invalid MCP execution receipt test');
      const item = test as Record<string, unknown>;
      if (typeof item.command !== 'string' || !['passed', 'failed', 'skipped'].includes(String(item.status))) {
        throw new UnauthorizedException('Invalid MCP execution receipt test');
      }
      if (item.durationMs !== undefined && (typeof item.durationMs !== 'number' || !Number.isFinite(item.durationMs) || item.durationMs < 0)) {
        throw new UnauthorizedException('Invalid MCP execution receipt test durationMs');
      }
      return {
        command: item.command,
        status: item.status as 'passed' | 'failed' | 'skipped',
        ...(item.durationMs === undefined ? {} : { durationMs: item.durationMs }),
      };
    });
    return {
      commitSha: receipt.commitSha,
      changedFiles,
      tests,
      startedAt: receipt.startedAt,
      finishedAt: receipt.finishedAt,
      ...(receipt.artifactRefs === undefined ? {} : {
        artifactRefs: Array.isArray(receipt.artifactRefs) && receipt.artifactRefs.every((v) => typeof v === 'string')
          ? receipt.artifactRefs as string[]
          : (() => { throw new UnauthorizedException('Execution receipt artifactRefs must contain only strings'); })(),
      }),
      ...(receipt.agentVersion === undefined ? {} : { agentVersion: typeof receipt.agentVersion === 'string' ? receipt.agentVersion : String(receipt.agentVersion) }),
    };
  }

  private authorize(authorization?: string): void {
    const configured = this.config.get<string>('MCP_API_KEY');
    if (!configured || authorization !== `Bearer ${configured}`) {
      throw new UnauthorizedException('Invalid MCP agent authorization');
    }
  }
}
