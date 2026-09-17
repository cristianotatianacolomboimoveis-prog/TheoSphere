import { Injectable } from '@nestjs/common';
import type { McpAgent } from './mcp.types';

@Injectable()
export class McpAgentRegistryService {
  private readonly agents = new Map<string, McpAgent>();

  register(agent: McpAgent): McpAgent {
    const normalized: McpAgent = {
      ...agent,
      capabilities: [...new Set(agent.capabilities.map((value) => value.trim()).filter(Boolean))],
    };
    this.agents.set(agent.id, normalized);
    return normalized;
  }

  get(agentId: string): McpAgent | undefined {
    return this.agents.get(agentId);
  }

  list(): readonly McpAgent[] {
    return [...this.agents.values()];
  }

  findCapable(capability: string): readonly McpAgent[] {
    return this.list().filter(
      (agent) => agent.enabled && agent.capabilities.includes(capability),
    );
  }
}
