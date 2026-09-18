import { Body, Controller, Headers, Param, Post, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { McpAutonomyService } from './mcp.autonomy.service';

interface ResultBody {
  success?: unknown;
  summary?: unknown;
}

@Controller('mcp/agents')
export class McpExecutionController {
  constructor(
    private readonly config: ConfigService,
    private readonly autonomy: McpAutonomyService,
  ) {}

  @Post(':agentId/tasks/:taskId/result')
  async recordResult(
    @Param('agentId') agentId: string,
    @Param('taskId') taskId: string,
    @Body() body: ResultBody,
    @Headers('authorization') authorization?: string,
  ) {
    this.authorize(authorization);
    if (typeof body?.success !== 'boolean') throw new UnauthorizedException('Agent execution result requires boolean success');
    return this.autonomy.recordResult(taskId, agentId, body.success, typeof body.summary === 'string' ? body.summary : undefined);
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

  private authorize(authorization?: string): void {
    const configured = this.config.get<string>('MCP_API_KEY');
    if (!configured || authorization !== `Bearer ${configured}`) {
      throw new UnauthorizedException('Invalid MCP agent authorization');
    }
  }
}
