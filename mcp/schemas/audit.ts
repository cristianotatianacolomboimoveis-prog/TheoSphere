export interface AuditEvent {
  id: string;
  timestamp: string;
  agentId: string;
  action: string;
  resource: string;
  taskId?: string;
  result: 'SUCCESS' | 'FAILURE' | 'DENIED';
  durationMs?: number;
  metadata?: Record<string, unknown>;
}
