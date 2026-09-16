export interface FileLock {
  file: string;
  agentId: string;
  taskId: string;
  acquiredAt: string;
  expiresAt: string;
}
