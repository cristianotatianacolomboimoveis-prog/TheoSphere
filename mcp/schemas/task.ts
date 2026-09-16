export const TASK_STATUSES = [
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

export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: TaskStatus;
  assignedAgent?: string;
  implementationAgent?: string;
  verificationAgent?: string;
  files: string[];
  tests: string[];
  auditResults: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskTransition {
  from: TaskStatus;
  to: TaskStatus;
}

export const TASK_TRANSITIONS: readonly TaskTransition[] = [
  { from: 'CREATED', to: 'PLANNED' },
  { from: 'PLANNED', to: 'LOCKED' },
  { from: 'LOCKED', to: 'IN_PROGRESS' },
  { from: 'IN_PROGRESS', to: 'IMPLEMENTED' },
  { from: 'IMPLEMENTED', to: 'TESTING' },
  { from: 'TESTING', to: 'AUDITING' },
  { from: 'AUDITING', to: 'VERIFIED' },
  { from: 'IN_PROGRESS', to: 'FAILED' },
  { from: 'TESTING', to: 'FAILED' },
  { from: 'AUDITING', to: 'FAILED' },
  { from: 'FAILED', to: 'REWORK' },
  { from: 'REWORK', to: 'TESTING' },
] as const;

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  return TASK_TRANSITIONS.some((transition) => transition.from === from && transition.to === to);
}
