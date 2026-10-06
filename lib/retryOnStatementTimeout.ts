/** Postgres' code for "canceling statement due to statement timeout". */
export const STATEMENT_TIMEOUT_CODE = '57014';

type Result = { error: { code?: string; message?: string } | null };

/**
 * Runs `attempt` again when Postgres cancelled it for running past
 * statement_timeout, up to `attempts` calls in all, and returns the last
 * result. Any other error, or success, returns at once.
 *
 * Built for public_stats(). Service-role API calls inherit authenticator's
 * statement_timeout of 8 s (service_role itself sets none; checked
 * 2026-10-06), and on a cold database the function reads enough of
 * creator_posts from disk to run past it. The cancelled calls are what warm
 * the cache, so retrying straight away works: measured 2026-10-06, four calls
 * in a row took 8.2 s (cancelled), 8.2 s (cancelled), 4.1 s, 0.56 s.
 */
export async function retryOnStatementTimeout<T extends Result>(
  attempt: () => PromiseLike<T>,
  options: { attempts?: number; onRetry?: (failedAttempt: number, error: NonNullable<T['error']>) => void } = {},
): Promise<T> {
  const attempts = Math.max(1, options.attempts ?? 3);
  let result = await attempt();
  for (let n = 1; n < attempts && result.error?.code === STATEMENT_TIMEOUT_CODE; n++) {
    options.onRetry?.(n, result.error as NonNullable<T['error']>);
    result = await attempt();
  }
  return result;
}
