import { useEffect, useRef } from 'react';
import type { DashboardEventDetails, DashboardEventType } from './events';

/**
 * Browser side of creator_dashboard_events. Posts to /api/creator/events,
 * which validates the session and writes with the service role — there is no
 * client-side insert and no anon-key write anywhere in this path.
 *
 * `import type` above is erased at compile time: nothing from lib/dashboard/
 * events.ts (which reads SUPABASE_SERVICE_ROLE_KEY) reaches the client bundle.
 *
 * Rules, in priority order:
 *   1. Never blocks the UI. The fetch is not awaited and its promise is
 *      swallowed. A failed usage beacon is invisible to the creator.
 *   2. Never throws. fetch() itself can throw synchronously in odd
 *      environments (a CSP, a locked-down webview); that is caught too.
 *   3. No-ops during SSR. `window` is the test; these pages are client
 *      components under a server layout, so the guard is belt-and-braces.
 *
 * keepalive: true lets the request outlive the page. brand_card_action fires
 * as the creator navigates to the outreach tool, and profile_edited or a
 * tool_used could be followed by an immediate navigation; without keepalive
 * the browser cancels an in-flight fetch on unload.
 */
export function track<T extends DashboardEventType>(type: T, details?: DashboardEventDetails[T]): void {
  if (typeof window === 'undefined') return;
  try {
    void fetch('/api/creator/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(details === undefined ? { type } : { type, details }),
      keepalive: true,
      credentials: 'same-origin',
    }).catch(() => {});
  } catch {
    // Nothing to do: instrumentation must never surface.
  }
}

/**
 * Fires `type` once per mount of the calling component — not once per render.
 *
 * The ref, not the effect's dependency array, is the once-guard. React Strict
 * Mode (on by default in the App Router, dev only) runs every mount effect
 * twice on the same component instance; the ref survives that, so dev fires
 * once too. A caller passing a fresh `details` object literal each render
 * re-runs the effect, and the ref makes every run after the first a no-op —
 * which is why the deps array can be honest instead of suppressed.
 *
 * Call it above any early return, like every other hook.
 */
export function useTrackOnMount<T extends DashboardEventType>(type: T, details?: DashboardEventDetails[T]): void {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    track(type, details);
  }, [type, details]);
}
