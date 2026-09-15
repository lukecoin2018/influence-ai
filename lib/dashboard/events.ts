import { createClient } from '@supabase/supabase-js';
import { withTimeout } from '@/lib/withTimeout';

/**
 * The writer behind creator_dashboard_events
 * (supabase/migrations/0020_creator_dashboard_events.sql).
 *
 * Same three rules as lib/funnel/events.ts, for the same reasons:
 *
 *  1. Never throws. Every caller is a beacon the browser fired and forgot;
 *     a failed usage row must be invisible to the creator.
 *  2. Never blocks the UI. The client helper (lib/dashboard/track.ts) does not
 *     await the request. The route DOES await this write, deliberately: the
 *     2-second dedupe below reads the latest row for the profile + type, and
 *     with a deferred after() write two rapid requests would both read an
 *     empty table and both insert. Awaiting costs nothing the creator can see,
 *     because nobody is waiting for the response.
 *  3. Tolerates the table not existing. Migrations are applied by hand, so
 *     there is a window where this code is live and 0020 is not. PostgREST
 *     reports a missing table as an `error` on the result, which lands in the
 *     warned branch, and the dashboard works exactly as before.
 *
 * Deliberately no `import 'server-only'` and no lib/supabase-admin.ts import,
 * matching lib/funnel/events.ts (see its header): the client is built inline
 * from SUPABASE_SERVICE_ROLE_KEY, which is undefined in a browser, so a stray
 * client import fails loudly rather than leaking. The TYPES in this file are
 * imported by the client helper with `import type`, which is erased at compile
 * time and pulls in nothing from here.
 *
 * ── WHY THE UNION IS THE SCHEMA ────────────────────────────────────────────
 *
 * creator_dashboard_events.event_type has NO CHECK constraint. This union is
 * the whitelist: the route refuses anything outside it with a 400 before any
 * insert. Adding an event is a code change only — extend the union, add its
 * details keys to ALLOWED_DETAIL_KEYS, add the call site. No migration. (The
 * view v_creator_engagement has a has_<type> column per event; a new event
 * without one still counts in event_count and last_event_at.)
 */

export type DashboardEventType =
  | 'dashboard_opened'
  | 'brands_hiring_opened'
  | 'brand_card_action'
  | 'tool_opened'
  | 'tool_used'
  | 'media_kit_opened'
  | 'media_kit_uploaded'
  | 'profile_edited';

/** The three legacy tools that have a page mount and a "result produced" moment. */
export type DashboardTool = 'calculator' | 'contract' | 'negotiate';

/**
 * Details per event. NO PII: no emails, names, free text, brand contact data.
 * Enums, counts and brand canonical names only. The per-tool facts on
 * tool_used are the enum fields of each tool's input, never the free-text
 * ones (customObjection, deliverables description, brand/creator names).
 */
export type DashboardEventDetails = {
  dashboard_opened: Record<string, never>;
  brands_hiring_opened: Record<string, never>;
  /** No brand_id exists: brand_brackets is keyed by (canonical_name, platform). */
  brand_card_action: { canonical_name: string; platform: string; action: 'contact_brand' };
  tool_opened: { tool: DashboardTool };
  tool_used: {
    tool: DashboardTool;
    // calculator
    niche?: string;
    deliverable_count?: number;
    platforms?: string[];
    // contract
    deal_type?: string | null;
    section_count?: number;
    // negotiate
    stage?: string;
    objection_type?: string;
    flexibility?: string;
  };
  media_kit_opened: Record<string, never>;
  media_kit_uploaded: { file_type: string; size_kb: number };
  profile_edited: { fields_changed: string[] };
};

export const DASHBOARD_EVENT_TYPES: readonly DashboardEventType[] = [
  'dashboard_opened',
  'brands_hiring_opened',
  'brand_card_action',
  'tool_opened',
  'tool_used',
  'media_kit_opened',
  'media_kit_uploaded',
  'profile_edited',
];

/**
 * The keys the route keeps per type. Anything else in the body is dropped
 * before the insert, so a future client bug (or a hand-crafted request) cannot
 * put arbitrary data — or PII — into `details`.
 */
const ALLOWED_DETAIL_KEYS: Record<DashboardEventType, readonly string[]> = {
  dashboard_opened: [],
  brands_hiring_opened: [],
  brand_card_action: ['canonical_name', 'platform', 'action'],
  tool_opened: ['tool'],
  tool_used: ['tool', 'niche', 'deliverable_count', 'platforms', 'deal_type', 'section_count', 'stage', 'objection_type', 'flexibility'],
  media_kit_opened: [],
  media_kit_uploaded: ['file_type', 'size_kb'],
  profile_edited: ['fields_changed'],
};

/** Serialized size above which the whole details object is replaced by {}. */
const DETAILS_MAX_BYTES = 2_048;

/** Bounded so a hung query cannot keep a serverless invocation alive. */
const DB_TIMEOUT_MS = 3_000;

export function isDashboardEventType(value: unknown): value is DashboardEventType {
  return typeof value === 'string' && (DASHBOARD_EVENT_TYPES as readonly string[]).includes(value);
}

function isScalar(v: unknown): v is string | number | boolean | null {
  return v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';
}

/**
 * Keeps only the allowed keys for the type, and only scalar values or arrays
 * of strings under them. Returns {} for a non-object body, and {} when the
 * result would exceed DETAILS_MAX_BYTES — the event is still recorded, its
 * details are not.
 */
export function sanitizeDetails(type: DashboardEventType, raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, unknown> = {};
  for (const key of ALLOWED_DETAIL_KEYS[type]) {
    const v = (raw as Record<string, unknown>)[key];
    if (v === undefined) continue;
    if (isScalar(v)) out[key] = v;
    else if (Array.isArray(v) && v.every((x) => typeof x === 'string')) out[key] = v;
  }
  if (Buffer.byteLength(JSON.stringify(out), 'utf8') > DETAILS_MAX_BYTES) {
    console.warn(`[dashboard-events] ${type} details over ${DETAILS_MAX_BYTES} bytes — dropped`);
    return {};
  }
  return out;
}

export type RecordDashboardEventInput = {
  /** creator_profiles.id (the auth user id), already proven to exist by the route. */
  creatorProfileId: string;
  type: DashboardEventType;
  /** Raw body details; sanitized here. */
  details?: unknown;
  /**
   * Skip the insert when the same profile recorded the same type within this
   * many milliseconds. Absorbs double mounts (React Strict Mode in dev, a fast
   * back/forward). 0 or undefined disables the check.
   */
  dedupeWindowMs?: number;
};

export type RecordDashboardEventResult = 'inserted' | 'deduped' | 'failed';

/**
 * Record one dashboard event. Resolves to what happened; never rejects.
 */
export async function recordDashboardEvent(input: RecordDashboardEventInput): Promise<RecordDashboardEventResult> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    if (input.dedupeWindowMs && input.dedupeWindowMs > 0) {
      const since = new Date(Date.now() - input.dedupeWindowMs).toISOString();
      const { data: recent, error: readError } = await withTimeout(
        Promise.resolve(
          supabase
            .from('creator_dashboard_events')
            .select('id')
            .eq('creator_profile_id', input.creatorProfileId)
            .eq('event_type', input.type)
            .gte('created_at', since)
            .limit(1),
        ),
        DB_TIMEOUT_MS,
      );
      // A failed read is not a reason to drop the event; the insert below
      // reports the real problem if there is one.
      if (!readError && recent && recent.length > 0) return 'deduped';
    }

    // created_at is deliberately omitted: it defaults to now() in Postgres, so
    // the two hosts' clocks never disagree about when an event happened.
    const { error } = await withTimeout(
      Promise.resolve(
        supabase.from('creator_dashboard_events').insert({
          creator_profile_id: input.creatorProfileId,
          event_type: input.type,
          details: sanitizeDetails(input.type, input.details),
        }),
      ),
      DB_TIMEOUT_MS,
    );

    // Warned, not swallowed: a missing table (0020 not yet applied) and a
    // broken insert look identical from outside otherwise.
    if (error) {
      console.warn(`[dashboard-events] ${input.type} write failed: ${error.message}`);
      return 'failed';
    }
    return 'inserted';
  } catch (err) {
    console.warn(`[dashboard-events] ${input.type} write threw:`, err);
    return 'failed';
  }
}
