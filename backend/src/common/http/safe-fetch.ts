/**
 * safeFetch — bounded, retried wrapper around the global `fetch`.
 *
 * Defaults are conservative:
 *   • timeoutMs:        5_000   — abort slow upstreams before they back up the event loop
 *   • retries:          2       — total 3 attempts
 *   • retryDelayBaseMs: 200     — exponential backoff (200, 400, 800 ms) + jitter
 *   • retryOnStatus:    [502, 503, 504]
 *
 * Use everywhere we call an external HTTP service (Bolls.life, bible-api,
 * Valhalla, etc.). A single hung upstream should not be able to consume
 * the entire Node event loop on a backend pod.
 *
 * NOT a circuit breaker: that requires shared state across pods (Redis).
 * If you need one, layer `opossum` or a Redis-state breaker on top.
 */

export interface SafeFetchOptions extends Omit<RequestInit, 'signal'> {
  timeoutMs?: number;
  retries?: number;
  retryDelayBaseMs?: number;
  retryOnStatus?: ReadonlyArray<number>;
}

const DEFAULTS = {
  timeoutMs: 5_000,
  retries: 2,
  retryDelayBaseMs: 200,
  retryOnStatus: [502, 503, 504] as ReadonlyArray<number>,
};

export class SafeFetchError extends Error {
  constructor(
    message: string,
    public readonly url: string,
    public readonly status?: number,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'SafeFetchError';
  }
}

export async function safeFetch(
  url: string,
  opts: SafeFetchOptions = {},
): Promise<Response> {
  const {
    timeoutMs = DEFAULTS.timeoutMs,
    retries = DEFAULTS.retries,
    retryDelayBaseMs = DEFAULTS.retryDelayBaseMs,
    retryOnStatus = DEFAULTS.retryOnStatus,
    ...init
  } = opts;

  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      if (retryOnStatus.includes(response.status) && attempt < retries) {
        lastErr = new SafeFetchError(
          `upstream ${response.status}`,
          url,
          response.status,
        );
        await delay(retryDelayBaseMs, attempt);
        continue;
      }
      return response;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await delay(retryDelayBaseMs, attempt);
        continue;
      }
    } finally {
      clearTimeout(timer);
    }
  }

  if (lastErr instanceof SafeFetchError) throw lastErr;
  throw new SafeFetchError(
    lastErr instanceof Error ? lastErr.message : 'fetch failed',
    url,
    undefined,
    lastErr,
  );
}

function delay(baseMs: number, attempt: number): Promise<void> {
  // Exponential backoff with full jitter: between 0 and (base * 2^attempt) ms.
  // Full jitter is the AWS-recommended pattern — minimizes thundering herd.
  const cap = baseMs * 2 ** attempt;
  const ms = Math.random() * cap;
  return new Promise((resolve) => setTimeout(resolve, ms));
}
