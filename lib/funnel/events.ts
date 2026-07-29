import { after } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withTimeout } from '@/lib/withTimeout';
import { isBotUserAgent } from './bot-detection';

/**
 * The writer behind funnel_events (supabase/migrations/0011_funnel_events.sql).
 *
 * Three hard rules, in priority order:
 *
 *  1. It must never throw. Every call site is on a path where the creator is
 *     mid-conversion — the teaser render, the claim POST, the verify POST. A
 *     failed event write is invisible to them.
 *  2. It must never block the response. Work is handed to next/server's
 *     after(), which runs it once the response has been sent. Verified
 *     available in Next 16.1.6 (node_modules/next/server.js re-exports it, and
 *     it is a stable export, not experimental).
 *  3. It must tolerate funnel_events not existing. Migrations in this repo are
 *     applied by hand via the Supabase SQL editor (see every file header in
 *     supabase/migrations/), so there is always a window where the code is
 *     deployed and the table is not. PostgREST reports a missing table as an
 *     `error` on the result, not a throw, so that lands in the logged branch
 *     below and nothing else notices.
 *
 * Deliberately NOT importing lib/supabase-admin.ts, and deliberately no
 * `import 'server-only'`. Both pull in the server-only marker package, which
 * throws at import time outside the react-server condition —
 * scripts/brand-brackets/_supabase.ts already avoids createSupabaseAdminClient()
 * for exactly that reason, and documents it. Building the client inline here
 * matches what app/api/creators/claim/route.ts and
 * app/api/creators/verify-bio/route.ts already do at their own line 9, and
 * keeps this module importable from any server runtime without
 * a bundling question. It reads SUPABASE_SERVICE_ROLE_KEY, which is undefined
 * in a browser, so a stray client import fails loudly rather than leaking.
 */

/**
 * Kept in lockstep with the CHECK constraint on funnel_events.event_type.
 * Changing one without the other means silent write failures.
 *
 * The first four are the claim funnel (0011). The three outreach events are
 * added by supabase/migrations/0013 — which, like every migration here, is
 * applied by hand and so may not be live when this code is. Until it is, those
 * three inserts fail the CHECK, land in the warned branch of writeFunnelEvent()
 * below, and nothing else notices. That is the intended degrade: the outreach
 * tool must not depend on its own instrumentation having been applied.
 */
export type FunnelEventType =
  | 'teaser_viewed'
  | 'signup_arrived'
  | 'claim_completed'
  | 'verified'
  | 'outreach_opened'
  | 'message_copied'
  | 'message_marked_sent';

/** Which of the two /claim/[handle] states rendered. They convert differently. */
export type TeaserVariant = 'full' | 'zero_match';

export type FunnelEvent = {
  eventType: FunnelEventType;
  /** Raw handle; normalized below to match social_profiles.handle. */
  handle?: string | null;
  /** creators.id — secondary dimension, not the join key. */
  creatorId?: string | null;
  /** creator_profiles.id (the auth user id) — the post-claim join key. */
  creatorProfileId?: string | null;
  locale?: string | null;
  /**
   * MUST be read by the caller and passed in — this module never calls
   * headers() itself, and that is a load-bearing constraint rather than a
   * style preference. headers() is a Dynamic API: a helper that read it
   * internally would opt every route that transitively imported it out of
   * static rendering, silently. This repo has seven statically rendered or
   * ISR routes (app/page.tsx, app/report/[slug], the four discover trees,
   * app/opengraph-image.tsx) that would be de-opted without a single visible
   * symptom. Taking it as an argument makes that impossible by construction.
   */
  userAgent?: string | null;
  teaserVariant?: TeaserVariant | null;
  details?: Record<string, unknown> | null;
};

/** Bounded so a hung insert can't keep a serverless invocation alive after the response. */
const WRITE_TIMEOUT_MS = 3_000;

/**
 * Same rule as the three existing normalizeHandle() copies —
 * app/claim/[handle]/_data.ts, lib/reports/creator-brand-matches.ts and
 * app/admin/preview/creator/[handle]/_data.ts. Applied here rather
 * than trusted from the caller because the handle arrives from a URL segment
 * (/claim/Vikyvarga) or a free-text form field, and an unnormalized handle
 * joins to nothing — social_profiles.handle is stored lowercased.
 */
function normalizeHandle(handle: string | null | undefined): string | null {
  if (!handle) return null;
  const normalized = handle.trim().replace(/^@/, '').toLowerCase();
  return normalized || null;
}

async function writeFunnelEvent(event: FunnelEvent): Promise<void> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    // occurred_at is deliberately omitted — the column defaults to now() in
    // Postgres. This runs after the response, on two different platforms;
    // a timestamp taken here would record when the write ran, not when the
    // event happened, and would carry each host's clock skew with it.
    const { error } = await withTimeout(
      Promise.resolve(
        supabase.from('funnel_events').insert({
          event_type: event.eventType,
          handle: normalizeHandle(event.handle),
          creator_id: event.creatorId ?? null,
          creator_profile_id: event.creatorProfileId ?? null,
          locale: event.locale ?? null,
          user_agent: event.userAgent ?? null,
          is_bot: isBotUserAgent(event.userAgent),
          teaser_variant: event.teaserVariant ?? null,
          details: event.details ?? null,
        }),
      ),
      WRITE_TIMEOUT_MS,
    );

    // Warned, not swallowed: a missing table (0011 not yet applied) and a
    // broken insert look identical from the outside otherwise, and this repo
    // has already been bitten by a path that failed silently — see
    // supabase/migrations/0010's header and commit 8d97279.
    if (error) {
      console.warn(`[funnel] ${event.eventType} write failed: ${error.message}`);
    }
  } catch (err) {
    console.warn(`[funnel] ${event.eventType} write threw:`, err);
  }
}

/**
 * Record a funnel event. Returns immediately; the write happens after the
 * response is sent. Safe to call unconditionally — it never throws.
 */
export function recordFunnelEvent(event: FunnelEvent): void {
  try {
    after(() => writeFunnelEvent(event));
  } catch (err) {
    // after() throws when called outside a request scope (a script, a build-time
    // prerender). Nothing to schedule the write against, so drop the event
    // rather than take the caller down with it.
    console.warn(`[funnel] could not schedule ${event.eventType}:`, err);
  }
}
