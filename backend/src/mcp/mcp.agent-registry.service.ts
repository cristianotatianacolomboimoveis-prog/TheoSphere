import { Injectable, Optional } from '@nestjs/common';
import type { McpAgent } from './mcp.types';
import { McpProjectMemoryService } from './mcp.project-memory.service';

@Injectable()
export class McpAgentRegistryService {
  private readonly agents = new Map<string, McpAgent>();

  constructor(@Optional() private readonly memory?: McpProjectMemoryService) {}

  async onModuleInit(): Promise<void> {
    if (!this.memory) return;
    const entries = await this.memory.latestByKeyPrefix('agents', 'mcp:agent:');
    for (const entry of entries) {
      try {
        const agent = JSON.parse(entry.content) as McpAgent;
        if (
          agent?.id &&
          agent.name &&
          agent.provider &&
          Array.isArray(agent.capabilities) &&
          typeof agent.enabled === 'boolean'
        ) {
          this.agents.set(agent.id, {
            ...agent,
            capabilities: [
              ...new Set(
                agent.capabilities.map((value) => value.trim()).filter(Boolean),
              ),
            ],
          });
        }
      } catch (error) {
        void error;
      }
    }
  }

  register(agent: McpAgent): McpAgent {
    const normalized: McpAgent = {
      ...agent,
      capabilities: [
        ...new Set(
          agent.capabilities.map((value) => value.trim()).filter(Boolean),
        ),
      ],
    };
    this.agents.set(normalized.id, normalized);
    this.persist(normalized);
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

  private persist(agent: McpAgent): void {
    if (!this.memory) return;
    void this.memory
      .append({
        category: 'agents',
        memoryKey: `mcp:agent:${agent.id}`,
        content: JSON.stringify(agent),
        tags: ['mcp', 'agent-registry', agent.enabled ? 'enabled' : 'disabled'],
        source: 'mcp-agent-registry',
        agentId: agent.id,
      })
      .catch(() => undefined);
  }
}
