import { FileLock } from '../schemas/lock';

export class LockStore {
  private readonly locks = new Map<string, FileLock>();

  private purgeExpired(now = Date.now()): void {
    for (const [file, lock] of this.locks) {
      if (Date.parse(lock.expiresAt) <= now) this.locks.delete(file);
    }
  }

  acquire(file: string, agentId: string, taskId: string, ttlMs = 5 * 60_000, now = new Date()): FileLock {
    if (ttlMs <= 0) throw new Error('Lock TTL must be positive');
    this.purgeExpired(now.getTime());
    const existing = this.locks.get(file);
    if (existing) throw new Error(`File is locked by ${existing.agentId}: ${file}`);
    const lock: FileLock = {
      file,
      agentId,
      taskId,
      acquiredAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
    };
    this.locks.set(file, lock);
    return structuredClone(lock);
  }

  release(file: string, agentId: string): void {
    this.purgeExpired();
    const lock = this.locks.get(file);
    if (!lock) return;
    if (lock.agentId !== agentId) throw new Error(`Lock owned by ${lock.agentId}: ${file}`);
    this.locks.delete(file);
  }

  get(file: string): FileLock | undefined {
    this.purgeExpired();
    const lock = this.locks.get(file);
    return lock ? structuredClone(lock) : undefined;
  }

  list(): FileLock[] {
    this.purgeExpired();
    return [...this.locks.values()].map((lock) => structuredClone(lock));
  }
}
