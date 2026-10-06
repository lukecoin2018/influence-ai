import { PHASE_PRODUCTION_BUILD } from 'next/constants';

/**
 * True while `next build` prerenders pages. Next sets NEXT_PHASE before it
 * starts the static-generation workers, and the workers inherit the parent's
 * environment (next/dist/build/index.js and next/dist/lib/worker.js, 16.1.6).
 * Never true for `next start` or a revalidation.
 */
export function isBuildPhase(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NEXT_PHASE === PHASE_PRODUCTION_BUILD;
}

/**
 * A `.catch()` handler for a statically rendered page's data call: logs the
 * failure, then
 *  - during `next build`, returns `fallback`, so a slow database can never fail
 *    a deploy;
 *  - at any other time (an ISR revalidation), rethrows. Next 16 then keeps
 *    serving the last successfully generated page and retries on the next
 *    request (guides/incremental-static-regeneration, "Handling uncaught
 *    exceptions", 16.1.6), instead of caching a degraded render as if it were
 *    a good one — which is how the homepage sat on stale fallback figures for
 *    hours on 2026-10-06.
 *
 * `err.name` is the part of the log line worth reading: `TimeoutError` means
 * withTimeout's timer fired; anything else came back from the query.
 */
export function buildOnlyFallback<T>(label: string, fallback: T, env: NodeJS.ProcessEnv = process.env) {
  return (err: unknown): T => {
    const building = isBuildPhase(env);
    console.error(
      `[home] ${label} failed, ${building ? 'using fallback (build)' : 'keeping the last good page (revalidation)'} — ` +
        (err instanceof Error ? `${err.name}: ${err.message}` : String(err)),
    );
    if (building) return fallback;
    throw err;
  };
}
