import { Agent } from '../schemas/agent';

export class AgentStore {
  private readonly agents = new Map<string, Agent>();

  register(agent: Agent): Agent {
    if (this.agents.has(agent.id)) throw new Error(`Agent already registered: ${agent.id}`);
    this.agents.set(agent.id, structuredClone(agent));
    return this.get(agent.id);
  }

  get(id: string): Agent {
    const agent = this.agents.get(id);
    if (!agent) throw new Error(`Agent not found: ${id}`);
    return structuredClone(agent);
  }

  list(): Agent[] {
    return [...this.agents.values()].map((agent) => structuredClone(agent));
  }

  heartbeat(id: string, now = new Date().toISOString()): Agent {
    const agent = this.agents.get(id);
    if (!agent) throw new Error(`Agent not found: ${id}`);
    agent.lastHeartbeat = now;
    if (agent.status === 'OFFLINE') agent.status = 'IDLE';
    return structuredClone(agent);
  }

  setStatus(id: string, status: Agent['status'], currentTask?: string): Agent {
    const agent = this.agents.get(id);
    if (!agent) throw new Error(`Agent not found: ${id}`);
    agent.status = status;
    agent.currentTask = currentTask;
    return structuredClone(agent);
  }
}
