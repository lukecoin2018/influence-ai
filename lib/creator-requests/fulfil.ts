import 'server-only';
import { createElement } from 'react';
import type { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { sendEmail, SITE_URL, maskEmail } from '@/lib/email/client';
import { RequestFulfilled, requestFulfilledSubject } from '@/lib/email/templates/RequestFulfilled';

/**
 * Closing a creator request: the handle someone asked for has appeared in the
 * database, so the request is marked added and the creator gets their claim
 * link.
 *
 * ── ONE FUNCTION, TWO CALLERS ──────────────────────────────────────────────
 *
 * The daily pass in app/api/cron/verification-nudge/route.ts sweeps every open
 * request; /api/admin/creator-requests/status runs it for one row when an
 * admin clicks "Mark added" rather than waiting for 09:00 UTC. They must
 * behave identically, and in particular must not be able to send the creator
 * two emails between them — which is why the claim-then-send below is here and
 * not in either caller.
 *
 * ── ONE EMAIL PER REQUEST, EVER ────────────────────────────────────────────
 *
 * Same rule as the verification nudge, for the same reason. The row is flipped
 * to 'added' with `WHERE id = ? AND status = 'new'` BEFORE the send; a row
 * where that matched nothing was taken by the other caller (or by an
 * overlapping cron run) and is skipped. A send failure leaves the flip in
 * place and is only logged: a missed fulfilment email is acceptable, a
 * duplicate is not. The admin can re-send by hand if it matters; nothing can
 * un-annoy a creator emailed twice.
 *
 * ── NEVER THROWS PAST ITS OWN CONTRACT ─────────────────────────────────────
 *
 * Every outcome is a return value, so the cron's loop can count it and carry
 * on. sendEmail() has the same contract (lib/email/client.ts).
 */

export type FulfilOutcome =
  /** The handle is not in `creators` yet. The request stays open. Not an error — it is the normal state of most open requests. */
  | 'not_in_database'
  /** Flipped to 'added' and the creator was emailed. */
  | 'sent'
  /** Flipped to 'added', but the email did not go. Logged and recorded; the request is still closed. */
  | 'failed'
  /** Another caller flipped it first. Nothing was sent here. */
  | 'skipped';

export type FulfilResult = {
  id: string;
  outcome: FulfilOutcome;
  handle: string;
  creatorId?: string;
  to?: string;
  error?: string;
};

export type OpenRequest = {
  id: string;
  platform: string;
  handle: string;
  email: string;
};

type Admin = ReturnType<typeof createSupabaseAdminClient>;

/** The columns fulfilRequest() needs, so both callers select the same set. */
export const OPEN_REQUEST_SELECT = 'id, platform, handle, email';

/**
 * `actorUserId` is the admin who clicked, or null when the daily pass ran it —
 * the same "system action = null user_id" convention the nudge uses.
 */
export async function fulfilRequest(
  admin: Admin,
  row: OpenRequest,
  actorUserId: string | null,
): Promise<FulfilResult> {
  // ── Is the handle in the database yet? ──────────────────────────────────
  // social_profiles, not creators: `handle` lives on social_profiles, and it
  // is stored normalized, which is the same shape creator_requests.handle is
  // stored in (lib/creator-requests/shared.ts). Platform is matched too, so a
  // TikTok row can never close an Instagram request.
  const { data: social, error: lookupError } = await admin
    .from('social_profiles')
    .select('creator_id')
    .eq('handle', row.handle)
    .eq('platform', row.platform)
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    console.error(`[request-fulfil] lookup failed for @${row.handle}: ${lookupError.message}`);
    return { id: row.id, outcome: 'failed', handle: row.handle, error: lookupError.message };
  }

  if (!social?.creator_id) {
    return { id: row.id, outcome: 'not_in_database', handle: row.handle };
  }

  const creatorId: string = social.creator_id;

  // ── Claim the row first ─────────────────────────────────────────────────
  // Selected back so "matched nothing" is distinguishable from "matched but
  // returned nothing": with .select() a zero-row update yields data = [].
  const { data: claimed, error: claimError } = await admin
    .from('creator_requests')
    .update({ status: 'added', resolved_at: new Date().toISOString(), creator_id: creatorId })
    .eq('id', row.id)
    .eq('status', 'new')
    .select('id');

  if (claimError) {
    console.error(`[request-fulfil] claim failed for ${row.id}: ${claimError.message}`);
    return { id: row.id, outcome: 'failed', handle: row.handle, error: claimError.message };
  }

  if (!claimed || claimed.length === 0) {
    return { id: row.id, outcome: 'skipped', handle: row.handle };
  }

  // ── From here on, exactly one attempt is recorded whatever happens ──────
  const result = await sendEmail({
    to: row.email,
    subject: requestFulfilledSubject(row.handle),
    // createElement rather than JSX: both callers are route.ts files, and this
    // module is shared by them.
    react: createElement(RequestFulfilled, {
      handle: row.handle,
      claimUrl: `${SITE_URL}/claim/${encodeURIComponent(row.handle)}`,
    }),
    replyTo: process.env.ADMIN_EMAIL,
    tags: [{ name: 'type', value: 'request_fulfilled' }],
  });

  const emailDetails: Record<string, string> = result.ok
    ? { email: 'sent', resend_id: result.id }
    : { email: 'failed', error: result.error };

  // Best-effort audit row, same as the nudge and the admin status routes: a
  // failed audit insert is logged and must not turn a delivered email into a
  // reported failure.
  const { error: logError } = await admin.from('activity_log').insert({
    event_type: 'creator_request_fulfilled',
    target_id: row.id,
    user_id: actorUserId,
    details: { handle: row.handle, creator_id: creatorId, ...emailDetails },
  });
  if (logError) {
    console.error(`[request-fulfil] activity_log insert failed for ${row.id}: ${logError.message}`);
  }

  if (result.ok) {
    return { id: row.id, outcome: 'sent', handle: row.handle, creatorId, to: maskEmail(row.email) };
  }
  return { id: row.id, outcome: 'failed', handle: row.handle, creatorId, to: maskEmail(row.email), error: result.error };
}
