/**
 * Catch-block helpers para o regime estrito de `unknown` no catch que
 * o TypeScript 6 passou a impor (não-opcional).
 *
 * Use `errMessage(err)` em vez de `err.message` em catches.
 */

export function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return 'unknown error';
  }
}

export function errStack(err: unknown): string | undefined {
  return err instanceof Error ? err.stack : undefined;
}
