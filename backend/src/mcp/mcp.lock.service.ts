import {
  ConflictException,
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import Redis from 'ioredis';
import { randomUUID } from 'node:crypto';
import { McpAuditService } from './mcp.audit.service';
import { McpSecurityService } from './mcp.security.service';
import type { McpFileLock } from './mcp.types';

interface StoredLock extends McpFileLock {
  token: string;
}

@Injectable()
export class McpLockService implements OnModuleDestroy {
  private readonly logger = new Logger(McpLockService.name);
  private readonly locks = new Map<string, StoredLock>();
  private readonly redis: Redis | null;
  private readonly ttlMs: number;
  private readonly prefix = 'theosphere:mcp:lock:';

  constructor(
    private readonly security: McpSecurityService,
    private readonly audit: McpAuditService,
  ) {
    const ttl = Number(process.env.MCP_LOCK_TTL_MS ?? 7_200_000);
    this.ttlMs = Number.isFinite(ttl) && ttl >= 60_000 ? ttl : 7_200_000;
    const url = process.env.REDIS_URL;
    this.redis = url
      ? new Redis(url, { maxRetriesPerRequest: 2, enableOfflineQueue: false })
      : null;
    this.redis?.on('error', (err) =>
      this.logger.warn(`Redis lock error: ${err.message}`),
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis?.quit().catch(() => undefined);
  }

  async acquire(
    paths: readonly string[],
    taskId: string,
    agentId: string,
  ): Promise<readonly McpFileLock[]> {
    this.security.assertAllowed(agentId, 'lock:acquire');
    const normalized = [
      ...new Set(paths.map((path) => path.trim()).filter(Boolean)),
    ].sort();
    if (normalized.length === 0) return [];

    if (!this.redis) {
      const conflicts = normalized.filter((path) => this.locks.has(path));
      if (conflicts.length > 0) {
        throw new ConflictException(
          `MCP file lock conflict: ${conflicts.join(', ')}`,
        );
      }
      const acquiredAt = new Date().toISOString();
      const locks = normalized.map((path) => ({
        path,
        taskId,
        agentId,
        acquiredAt,
        token: randomUUID(),
      }));
      for (const lock of locks) this.locks.set(lock.path, lock);
      this.audit.append({
        actor: agentId,
        action: 'lock.acquired',
        resourceType: 'lock',
        resourceId: taskId,
        outcome: 'success',
        metadata: { paths: normalized, backend: 'memory' },
      });
      return locks.map(({ token: _token, ...lock }) => lock);
    }

    const acquired: StoredLock[] = [];
    try {
      for (const path of normalized) {
        const lock: StoredLock = {
          path,
          taskId,
          agentId,
          acquiredAt: new Date().toISOString(),
          token: randomUUID(),
        };
        const result = await this.redis.set(
          this.key(path),
          JSON.stringify(lock),
          'PX',
          this.ttlMs,
          'NX',
        );
        if (result !== 'OK') {
          const existing = await this.read(path);
          const owner = existing
            ? ` (${existing.taskId}/${existing.agentId})`
            : '';
          throw new ConflictException(
            `MCP file lock conflict: ${path}${owner}`,
          );
        }
        acquired.push(lock);
      }
    } catch (error) {
      await Promise.allSettled(
        acquired.map((lock) => this.deleteIfOwner(lock.path, lock.token)),
      );
      throw error;
    }

    this.audit.append({
      actor: agentId,
      action: 'lock.acquired',
      resourceType: 'lock',
      resourceId: taskId,
      outcome: 'success',
      metadata: { paths: normalized, backend: 'redis', ttlMs: this.ttlMs },
    });
    return acquired.map(({ token: _token, ...lock }) => lock);
  }

  async release(taskId: string, agentId: string): Promise<void> {
    this.security.assertAllowed(agentId, 'lock:release');

    if (!this.redis) {
      for (const [path, lock] of this.locks) {
        if (lock.taskId === taskId && lock.agentId === agentId) {
          this.locks.delete(path);
        }
      }
    } else {
      const keys = await this.scanKeys();
      for (const key of keys) {
        const raw = await this.redis.get(key);
        const lock = this.parse(raw);
        if (lock?.taskId === taskId && lock.agentId === agentId) {
          await this.deleteIfOwner(lock.path, lock.token);
        }
      }
    }

    this.audit.append({
      actor: agentId,
      action: 'lock.released',
      resourceType: 'lock',
      resourceId: taskId,
      outcome: 'success',
    });
  }

  async renew(taskId: string, agentId: string): Promise<number> {
    this.security.assertAllowed(agentId, 'lock:renew');
    let renewed = 0;

    if (!this.redis) {
      for (const lock of this.locks.values()) {
        if (lock.taskId === taskId && lock.agentId === agentId) renewed++;
      }
    } else {
      for (const key of await this.scanKeys()) {
        const raw = await this.redis.get(key);
        const lock = this.parse(raw);
        if (!lock || !raw || lock.taskId !== taskId || lock.agentId !== agentId)
          continue;
        if (await this.renewIfOwner(lock.path, raw)) renewed++;
      }
    }

    this.audit.append({
      actor: agentId,
      action: 'lock.renewed',
      resourceType: 'lock',
      resourceId: taskId,
      outcome: 'success',
      metadata: { renewed, ttlMs: this.ttlMs },
    });
    return renewed;
  }

  async list(): Promise<readonly McpFileLock[]> {
    if (!this.redis) {
      return [...this.locks.values()]
        .map(({ token: _token, ...lock }) => lock)
        .sort((a, b) => a.path.localeCompare(b.path));
    }

    const result: McpFileLock[] = [];
    for (const key of await this.scanKeys()) {
      const lock = this.parse(await this.redis.get(key));
      if (lock) {
        const { token: _token, ...publicLock } = lock;
        result.push(publicLock);
      }
    }
    return result.sort((a, b) => a.path.localeCompare(b.path));
  }

  private key(path: string): string {
    return this.prefix + encodeURIComponent(path);
  }

  private parse(raw: string | null): StoredLock | null {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Partial<StoredLock>;
      if (
        typeof parsed.path !== 'string' ||
        typeof parsed.taskId !== 'string' ||
        typeof parsed.agentId !== 'string' ||
        typeof parsed.acquiredAt !== 'string' ||
        typeof parsed.token !== 'string'
      ) {
        return null;
      }
      return parsed as StoredLock;
    } catch {
      return null;
    }
  }

  private async read(path: string): Promise<StoredLock | null> {
    return this.parse((await this.redis?.get(this.key(path))) ?? null);
  }

  private async deleteIfOwner(path: string, token: string): Promise<void> {
    if (!this.redis) {
      const current = this.locks.get(path);
      if (current?.token === token) this.locks.delete(path);
      return;
    }

    const current = await this.redis.get(this.key(path));
    if (!current) return;

    const script = `
      if redis.call("GET", KEYS[1]) == ARGV[1] then
        return redis.call("DEL", KEYS[1])
      end
      return 0
    `;
    await this.redis.eval(script, 1, this.key(path), current);
  }

  private async renewIfOwner(path: string, raw: string): Promise<boolean> {
    if (!this.redis) return false;

    const script = `
      if redis.call("GET", KEYS[1]) == ARGV[1] then
        return redis.call("PEXPIRE", KEYS[1], ARGV[2])
      end
      return 0
    `;
    const renewed = await this.redis.eval(
      script,
      1,
      this.key(path),
      raw,
      String(this.ttlMs),
    );
    return Number(renewed) === 1;
  }

  private async scanKeys(): Promise<string[]> {
    if (!this.redis) return [];
    const keys: string[] = [];
    let cursor = '0';
    do {
      const [next, batch] = await this.redis.scan(
        cursor,
        'MATCH',
        `${this.prefix}*`,
        'COUNT',
        100,
      );
      cursor = next;
      keys.push(...batch);
    } while (cursor !== '0');
    return keys;
  }
}
