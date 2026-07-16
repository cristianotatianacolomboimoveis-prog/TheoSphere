import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
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

export type EventChannel = (typeof EVENT_CHANNELS)[keyof typeof EVENT_CHANNELS];

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
  /** Pub/Sub habilitado? false quando REDIS_URL não está configurada. */
  private enabled = false;
  /** Throttle de logs de erro de conexão (1 log/min por cliente). */
  private lastErrorLogAt: Record<'pub' | 'sub', number> = { pub: 0, sub: 0 };

  // channel → handlers
  private readonly handlers = new Map<
    string,
    Set<(payload: unknown) => void>
  >();

  constructor() {}

  onModuleInit(): void {
    const url = process.env.REDIS_URL;

    // Sem REDIS_URL → Pub/Sub desabilitado deliberadamente (dev/single-pod).
    // Não tentamos localhost: em produção isso só gera "degraded" eterno
    // no health check sem nenhum Redis de verdade por trás.
    if (!url) {
      this.logger.log(
        'REDIS_URL não configurada — EventBus desabilitado (publish/subscribe viram no-ops).',
      );
      return;
    }
    this.enabled = true;

    // Conexão lazy para não bloquear o bootstrap se o Redis estiver fora.
    // retryStrategy NUNCA retorna null: desistir permanentemente deixava o
    // cliente em status "end" para sempre após 5 tentativas (bug do
    // "degraded" permanente em produção). Backoff com teto de 10s.
    const opts = {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
      retryStrategy: (times: number): number => Math.min(times * 500, 10_000),
    } as const;

    this.publisher = new Redis(url, opts);
    this.subscriber = new Redis(url, opts);

    const onError = (who: 'pub' | 'sub') => (err: Error) => {
      // ioredis emite 'error' a cada tentativa de reconexão — throttle
      // para não inundar os logs durante uma indisponibilidade longa.
      const now = Date.now();
      if (now - this.lastErrorLogAt[who] > 60_000) {
        this.lastErrorLogAt[who] = now;
        this.logger.warn(`Redis ${who} error: ${err.message}`);
      }
    };
    this.publisher.on('error', onError('pub'));
    this.subscriber.on('error', onError('sub'));

    this.publisher.on('ready', () => {
      this.logger.log('Redis pub pronto (conectado/reconectado).');
    });

    // Ao (re)conectar o subscriber, garante a inscrição de todos os canais
    // registrados — cobre o caso em que o subscribe() inicial falhou porque
    // o Redis ainda estava indisponível no boot.
    this.subscriber.on('ready', () => {
      const channels = [...this.handlers.keys()];
      if (channels.length === 0) return;
      this.subscriber
        ?.subscribe(...channels)
        .then(() =>
          this.logger.log(
            `Redis sub pronto — ${channels.length} canal(is) reinscrito(s).`,
          ),
        )
        .catch((err: Error) =>
          this.logger.warn(`Reinscrição de canais falhou: ${err.message}`),
        );
    });

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
        this.logger.log(`EventBus connected to ${url}`);
      })
      .catch((err: Error) => {
        this.logger.warn(
          `EventBus could not reach Redis (${url}): ${err.message}. ` +
            `Pub/Sub will be a no-op until reconnect succeeds.`,
        );
      });
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.allSettled([this.publisher?.quit(), this.subscriber?.quit()]);
  }

  /** Pub/Sub está configurado (REDIS_URL presente)? */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Saúde derivada do status REAL da conexão do publisher — nada de flag
   * "sticky": um erro transitório não marca o serviço como degradado para
   * sempre; ao reconectar, o status volta a 'ready' e a saúde se recupera.
   */
  isHealthy(): boolean {
    return this.publisher?.status === 'ready';
  }

  /**
   * Publish a JSON payload to a channel. Never throws — failures are logged.
   */
  async publish<T>(channel: EventChannel, payload: T): Promise<void> {
    if (!this.publisher || !this.isHealthy()) return;
    try {
      await this.publisher.publish(channel, JSON.stringify(payload));
    } catch (err) {
      this.logger.warn(`publish(${channel}) failed: ${(err as Error).message}`);
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
    // TS 6 enforça contravariância em function-param types. O Set é
    // tipado como `(payload: unknown) => void` (mais genérico); o handler
    // do caller é `(payload: T) => void` (mais específico). Funções são
    // contravariantes em parâmetros, então o cast é seguro — o publisher
    // passa o payload via JSON.parse e o caller é o único que conhece o T.
    const erasedHandler = handler as unknown as (payload: unknown) => void;
    handlers.add(erasedHandler);

    return async () => {
      handlers?.delete(erasedHandler);
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
