export const AGENT_ROLES = [
  'IMPLEMENTER',
  'VERIFIER',
  'AUDITOR',
  'STRATEGIST',
  'ORCHESTRATOR',
  'HUMAN',
] as const;

export type AgentRole = (typeof AGENT_ROLES)[number];

export interface Agent {
  id: string;
  role: AgentRole;
  capabilities: string[];
  permissions: string[];
  status: 'OFFLINE' | 'IDLE' | 'BUSY' | 'BLOCKED';
  currentTask?: string;
  lastHeartbeat?: string;
}
