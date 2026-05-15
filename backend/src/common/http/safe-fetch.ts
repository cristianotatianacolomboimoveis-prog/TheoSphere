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

import CircuitBreaker from 'opossum';

const breakers = new Map<string, CircuitBreaker<[string, RequestInit], Response>>();

/**
 * Gets or creates a circuit breaker for the given URL's host.
 * This ensures that if one service (e.g., Bolls) is down, we don't
 * keep hammering it and potentially backing up our own event loop.
 */
function getBreaker(url: string): CircuitBreaker<[string, RequestInit], Response> {
  try {
    const host = new URL(url).host;
    if (!breakers.has(host)) {
      const breaker = new CircuitBreaker(
        async (u: string, init: RequestInit) => fetch(u, init),
        {
          timeout: 15000,
          errorThresholdPercentage: 50,
          resetTimeout: 30000,
        },
      );
      breakers.set(host, breaker);
    }
    return breakers.get(host)!;
  } catch {
    // If URL parsing fails, return a transient breaker
    return new CircuitBreaker(async (u: string, init: RequestInit) => fetch(u, init));
  }
}

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

  const breaker = getBreaker(url);
  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      // Use the circuit breaker to fire the request
      const response = await breaker.fire(url, { ...init, signal: controller.signal });
      
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
    } catch (err: any) {
      lastErr = err;
      
      // If the breaker is open, don't retry, just fail fast (SEC-009)
      if (err.message === 'open' || err.message === 'half-open') {
        throw new SafeFetchError('Circuit breaker is open', url, 503, err);
      }

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
  const cap = baseMs * 2 ** attempt;
  const ms = Math.random() * cap;
  return new Promise((resolve) => setTimeout(resolve, ms));
}
