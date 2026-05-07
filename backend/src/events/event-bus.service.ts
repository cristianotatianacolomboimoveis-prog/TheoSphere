import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Channels published by the platform.
 *
 * Keep this list narrow and well-named — every channel is a public contract
 * that downstream consumers (workers, dashboards) can subscribe to.
 */
export const EVENT_CHANNELS = {
  LOG: 'theosphere:logs',
  INGESTION_BIBLE: 'theosphere:ingestion:bible',
  INGESTION_USER_DOC: 'theosphere:ingestion:user-doc',
  RAG_HIT: 'theosphere:rag:hit',
} as const;

export type EventChannel =
  (typeof EVENT_CHANNELS)[keyof typeof EVENT_CHANNELS];

export interface LogEvent {
  level: 'log' | 'warn' | 'error' | 'debug';
  context: string;
  message: string;
  meta?: Record<string, unknown>;
  timestamp: string;
}

export interface IngestionEvent {
  kind: string; // e.g. 'chapter.start', 'chapter.done', 'chapter.failed'
  ref?: string; // human-readable reference (e.g. "KJV/43/3")
  count?: number;
  durationMs?: number;
  error?: string;
  meta?: Record<string, unknown>;
  timestamp: string;
}

/**
 * EventBusService — thin Redis Pub/Sub wrapper.
 *
 * Why two clients?
 *   ioredis enters subscribe-mode on a connection, after which it can no
 *   longer issue regular commands. Pub and Sub MUST live on different
 *   connections.
 *
 * Failure mode:
 *   If Redis is unreachable, publish() and subscribe() degrade to no-ops
 *   (with a warn log) so that the application keeps serving requests.
 */
@Injectable()
export class EventBusService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventBusService.name);
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;
  private healthy = false;

  // channel → handlers
  private readonly handlers = new Map<string, Set<(payload: unknown) => void>>();

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const url =
      this.config.get<string>('REDIS_URL') || 'redis://localhost:6379';

    // Lazy connect, don't block startup if Redis is down.
    const opts = {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
      retryStrategy: (times: number): number | null =>
        times > 5 ? null : Math.min(times * 200, 2000),
    } as const;

    this.publisher = new Redis(url, opts);
    this.subscriber = new Redis(url, opts);

    const onError = (who: 'pub' | 'sub') => (err: Error) => {
      this.healthy = false;
      this.logger.warn(`Redis ${who} error: ${err.message}`);
    };
    this.publisher.on('error', onError('pub'));
    this.subscriber.on('error', onError('sub'));

    this.subscriber.on('message', (channel, raw) => {
      const set = this.handlers.get(channel);
      if (!set || set.size === 0) return;
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = raw;
      }
      for (const fn of set) {
        try {
          fn(parsed);
        } catch (err) {
          this.logger.warn(
            `Handler for "${channel}" threw: ${(err as Error).message}`,
          );
        }
      }
    });

    Promise.all([this.publisher.connect(), this.subscriber.connect()])
      .then(() => {
        this.healthy = true;
        this.logger.log(`EventBus connected to ${url}`);
      })
      .catch((err) => {
        this.logger.warn(
          `EventBus could not reach Redis (${url}): ${err.message}. ` +
            `Pub/Sub will be a no-op until reconnect succeeds.`,
        );
      });
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.allSettled([
      this.publisher?.quit(),
      this.subscriber?.quit(),
    ]);
  }

  /** Returns true if the publisher connection is currently usable. */
  isHealthy(): boolean {
    return this.healthy && this.publisher?.status === 'ready';
  }

  /**
   * Publish a JSON payload to a channel. Never throws — failures are logged.
   */
  async publish<T>(channel: EventChannel, payload: T): Promise<void> {
    if (!this.publisher || !this.isHealthy()) return;
    try {
      await this.publisher.publish(channel, JSON.stringify(payload));
    } catch (err) {
      this.logger.warn(
        `publish(${channel}) failed: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Subscribe to a channel. Returns an unsubscribe function.
   * Multiple handlers per channel are supported.
   */
  async subscribe<T = unknown>(
    channel: EventChannel,
    handler: (payload: T) => void,
  ): Promise<() => Promise<void>> {
    if (!this.subscriber) {
      this.logger.warn(`subscribe(${channel}) ignored: subscriber not ready`);
      return async () => {};
    }

    let handlers = this.handlers.get(channel);
    if (!handlers) {
      handlers = new Set();
      this.handlers.set(channel, handlers);
      try {
        await this.subscriber.subscribe(channel);
      } catch (err) {
        this.logger.warn(
          `subscribe(${channel}) failed: ${(err as Error).message}`,
        );
      }
    }
    handlers.add(handler as (p: unknown) => void);

    return async () => {
      handlers?.delete(handler as (p: unknown) => void);
      if (handlers && handlers.size === 0) {
        this.handlers.delete(channel);
        try {
          await this.subscriber?.unsubscribe(channel);
        } catch {
          /* noop */
        }
      }
    };
  }

  // ─── Convenience helpers ────────────────────────────────────────────────

  publishLog(
    level: LogEvent['level'],
    context: string,
    message: string,
    meta?: Record<string, unknown>,
  ): void {
    void this.publish<LogEvent>(EVENT_CHANNELS.LOG, {
      level,
      context,
      message,
      meta,
      timestamp: new Date().toISOString(),
    });
  }

  publishIngestion(
    channel: EventChannel,
    event: Omit<IngestionEvent, 'timestamp'>,
  ): void {
    void this.publish<IngestionEvent>(channel, {
      ...event,
      timestamp: new Date().toISOString(),
    });
  }
}
