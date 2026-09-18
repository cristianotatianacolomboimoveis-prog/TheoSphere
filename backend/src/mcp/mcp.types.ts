export const MCP_TASK_STATES = [
  'CREATED',
  'PLANNED',
  'LOCKED',
  'IN_PROGRESS',
  'IMPLEMENTED',
  'TESTING',
  'AUDITING',
  'VERIFIED',
  'FAILED',
  'REWORK',
] as const;

export type McpTaskState = (typeof MCP_TASK_STATES)[number];

export interface McpExecutionTest {
  command: string;
  status: 'passed' | 'failed' | 'skipped';
  durationMs?: number;
}

export interface McpExecutionReceipt {
  commitSha: string;
  changedFiles: string[];
  tests: McpExecutionTest[];
  startedAt: string;
  finishedAt: string;
  artifactRefs?: string[];
  agentVersion?: string;
}

export interface McpTask {
  id: string;
  title: string;
  description: string;
  status: McpTaskState;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  owner?: string;
  assignedAgent?: string;
  dependencies: string[];
  files: string[];
  requiredCapabilities: string[];
  executionReceipt?: McpExecutionReceipt;
  branch?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface McpAgent {
  id: string;
  name: string;
  provider: 'claude' | 'gemini' | 'openai' | 'internal';
  capabilities: string[];
  enabled: boolean;
}

export interface McpFileLock {
  path: string;
  taskId: string;
  agentId: string;
  acquiredAt: string;
}

export interface McpAuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  resourceType: 'task' | 'agent' | 'lock' | 'system';
  resourceId: string;
  outcome: 'allowed' | 'denied' | 'success' | 'failure';
  metadata?: Record<string, unknown>;
}

export type McpPermission =
  | 'task:create'
  | 'task:assign'
  | 'task:transition'
  | 'lock:acquire'
  | 'lock:release'
  | 'lock:renew'
  | 'agent:register'
  | 'audit:read'
  | 'memory:write'
  | 'memory:read'
  | 'research:read';

export const MCP_STATE_TRANSITIONS: Record<McpTaskState, readonly McpTaskState[]> = {
  CREATED: ['PLANNED', 'FAILED'],
  PLANNED: ['LOCKED', 'FAILED'],
  LOCKED: ['IN_PROGRESS', 'FAILED'],
  IN_PROGRESS: ['IMPLEMENTED', 'FAILED', 'REWORK'],
  IMPLEMENTED: ['TESTING', 'REWORK', 'FAILED'],
  TESTING: ['AUDITING', 'FAILED', 'REWORK'],
  AUDITING: ['VERIFIED', 'FAILED', 'REWORK'],
  VERIFIED: [],
  FAILED: ['REWORK'],
  REWORK: ['PLANNED', 'FAILED'],
};
