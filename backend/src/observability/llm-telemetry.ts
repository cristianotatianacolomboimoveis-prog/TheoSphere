import { Sentry } from './sentry';

export interface LlmCallContext {
  provider: 'gemini' | 'openai' | 'local-fallback';
  model?: string;
  cached?: boolean;
  tradition?: string;
  userId?: string;
  /** Free-form tag — distinguishes call-sites: 'chat', 'embedding', 'summarize'. */
  op?: string;
}

/**
 * Wraps an async LLM/embedding invocation with structured Sentry telemetry.
 *
 * Behaviour:
 *   - Records latency on success (as a Sentry custom measurement on the
 *     active scope; safe to no-op when DSN is unset).
 *   - Reports failures with rich tags so a Sentry filter can isolate
 *     "OpenAI 429s in production" or "Gemini timeouts in last hour".
 *   - Always re-throws the original error after capture — telemetry must
 *     never alter caller-visible behavior.
 */
export async function withLlmTelemetry<T>(
  ctx: LlmCallContext,
  fn: () => Promise<T>,
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    Sentry.addBreadcrumb({
      category: 'llm',
      level: 'info',
      message: `${ctx.provider}:${ctx.op ?? 'call'} ok`,
      data: { ...ctx, durationMs: Date.now() - start },
    });
    return result;
  } catch (err) {
    Sentry.withScope((scope) => {
      scope.setTag('llm.provider', ctx.provider);
      if (ctx.model) scope.setTag('llm.model', ctx.model);
      if (ctx.op) scope.setTag('llm.op', ctx.op);
      if (ctx.tradition) scope.setTag('llm.tradition', ctx.tradition);
      scope.setContext('llm', {
        ...ctx,
        durationMs: Date.now() - start,
      });
      // Capture once. Sentry deduplicates by stack/message hash.
      Sentry.captureException(err);
    });
    throw err;
  }
}
