/**
 * Minimal production-safe logger.
 *
 * Why exists:
 *   • 40+ raw console.* calls were scattered across components, dumping
 *     potentially sensitive payloads (auth headers, RAG responses,
 *     translation cache hits) into the browser console even in
 *     production builds.
 *   • This logger drops debug/info in production, while preserving warn
 *     and error — those are signal that operators (or Sentry, when we
 *     wire the browser SDK) still need to see.
 *
 * Migration pattern (incremental, no big-bang):
 *     import { logger } from "@/lib/logger";
 *
 *     // Loud during dev, silent in prod:
 *     logger.debug("[RAG] cache hit", payload);
 *     logger.info("[Sync] indexed", count);
 *
 *     // Always shown:
 *     logger.warn("[Translate] fallback to original");
 *     logger.error("[Auth] refresh failed", err);
 *
 * Why not just `if (NODE_ENV) console.log`?
 *   We want a single chokepoint so the next step — sending error events
 *   to Sentry's browser SDK — is a one-line change here instead of 40
 *   call-site rewrites.
 */

const isProd = process.env.NODE_ENV === "production";

type LogFn = (...args: unknown[]) => void;

interface Logger {
  debug: LogFn;
  info: LogFn;
  warn: LogFn;
  error: LogFn;
}

const noop: LogFn = () => {};

export const logger: Logger = {
  debug: isProd ? noop : (...args) => console.debug(...args),
  info: isProd ? noop : (...args) => console.info(...args),
  // warn/error survive in production — they're operator signals.
  // When the Sentry browser SDK is added, hook captureMessage/captureException
  // here so every warn/error becomes a breadcrumb/event automatically.
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};
