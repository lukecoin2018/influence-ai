import { NextRequest, NextResponse } from 'next/server';
import { createElement } from 'react';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { requireCronSecret } from '@/lib/auth/api-guards';
import { withNoStore } from '@/lib/http/no-store';
import { recordFunnelEvent } from '@/lib/funnel/events';
import { sendEmail, SITE_URL, maskEmail } from '@/lib/email/client';
import { firstNameOf } from '@/lib/email/first-name';
import {
  VerificationNudge,
  VERIFICATION_NUDGE_SUBJECT,
} from '@/lib/email/templates/VerificationNudge';

/**
 * Daily nudge for creators who claimed a profile, were issued a bio
 * verification code, and let it expire unused. One email per profile, ever.
 *
 * Called by Vercel Cron (vercel.json: 09:00 UTC daily) and runnable by hand
 * with the same bearer header — see CLAUDE.md "Cron".
 *
 * ── ELIGIBILITY ────────────────────────────────────────────────────────────
 *
 *   claim_status = 'pending'
 *   verification_code_expires_at is not null and < now() - 24 hours
 *   nudge_sent_at is null
 *   created_at > now() - 14 days          (new signups only, no backfill)
 *   the auth user has an email            (checked per row, below)
 *
 * The code TTL is 24 hours (lib/verification-code.ts), so a nudge goes out no
 * earlier than ~48 hours after the claim. PostgREST cannot evaluate
 * `now() - interval` server-side, so both cutoffs are computed here as ISO
 * strings; the clock skew that costs is seconds against a 24-hour margin.
 *
 * ── ONE NUDGE, EVER ────────────────────────────────────────────────────────
 *
 * Claim-then-send. Before any email, `nudge_sent_at` is set with
 * `WHERE id = ? AND nudge_sent_at IS NULL`; a row where that matched nothing
 * was taken by an overlapping run and is skipped. A send failure leaves the
 * claim in place and is only logged: a missed nudge is acceptable, a duplicate
 * is not. The column is not in migration 0015's protected list, so the
 * guarantee is precisely "one nudge per profile unless the creator clears the
 * column themselves" (supabase/migrations/0018).
 *
 * ── NEVER ABORTS ON ONE ROW ────────────────────────────────────────────────
 *
 * Each row's work is wrapped so a throw anywhere inside it counts as `failed`
 * for that row and the loop continues. sendEmail() never throws on its own
 * (lib/email/client.ts), but the auth lookup and the two selects can.
 */

const PER_RUN_CAP = 50;
const EXPIRY_AGE_MS = 24 * 60 * 60 * 1000;
const SIGNUP_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

type RowOutcome = 'sent' | 'failed' | 'skipped';

type EligibleRow = {
  id: string;
  creator_id: string | null;
  display_name: string | null;
  locale: string | null;
  verification_code_expires_at: string | null;
};

/**
 * Route handlers are dynamic already and this export changes nothing on the
 * wire (lib/http/no-store.ts:30-35); kept because the prompt that specified
 * this route asked for it and it documents intent. withNoStore() is what
 * actually sets Cache-Control, which matters on the VPS: a cached 200 here
 * would replay one run's summary to the next.
 */
export const dynamic = 'force-dynamic';

export const GET = withNoStore(handleGET);

async function handleGET(req: NextRequest) {
  const gate = requireCronSecret(req);
  if ('error' in gate) return gate.error;

  const admin = createSupabaseAdminClient();
  const now = Date.now();
  const expiryCutoff = new Date(now - EXPIRY_AGE_MS).toISOString();
  const signupCutoff = new Date(now - SIGNUP_WINDOW_MS).toISOString();

  // count: 'exact' returns the total matching rows alongside the capped page,
  // so "eligible beyond the cap" is one round trip, not two.
  const { data: rows, error: selectError, count } = await admin
    .from('creator_profiles')
    .select('id, creator_id, display_name, locale, verification_code_expires_at', { count: 'exact' })
    .eq('claim_status', 'pending')
    .not('verification_code_expires_at', 'is', null)
    .lt('verification_code_expires_at', expiryCutoff)
    .is('nudge_sent_at', null)
    .gt('created_at', signupCutoff)
    .order('verification_code_expires_at', { ascending: true })
    .limit(PER_RUN_CAP);

  if (selectError) {
    // A missing nudge_sent_at column (0018 not applied) lands here as a
    // PostgREST error, not a throw. Say so plainly: the fix is the migration.
    console.error(`[nudge] eligibility query failed: ${selectError.message}`);
    return NextResponse.json(
      { error: 'Eligibility query failed', reason: 'query_failed', detail: selectError.message },
      { status: 500 },
    );
  }

  const eligible = count ?? rows?.length ?? 0;
  const checked = rows?.length ?? 0;
  const beyondCap = Math.max(0, eligible - checked);

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const ids: { id: string; outcome: RowOutcome; to?: string; error?: string }[] = [];

  for (const row of (rows ?? []) as EligibleRow[]) {
    try {
      const outcome = await nudgeOne(admin, row);
      ids.push(outcome);
      if (outcome.outcome === 'sent') sent += 1;
      else if (outcome.outcome === 'failed') failed += 1;
      else skipped += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[nudge] ${row.id} threw: ${message}`);
      ids.push({ id: row.id, outcome: 'failed', error: message });
      failed += 1;
    }
  }

  console.log(
    `[nudge] checked=${checked} eligible=${eligible} beyondCap=${beyondCap} sent=${sent} failed=${failed} skipped=${skipped}`,
  );

  return NextResponse.json({ checked, eligible, beyondCap, sent, failed, skipped, ids });
}

async function nudgeOne(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  row: EligibleRow,
): Promise<{ id: string; outcome: RowOutcome; to?: string; error?: string }> {
  const claimedAt = new Date().toISOString();

  // ── Claim the row first ─────────────────────────────────────────────────
  // Selected back so "matched nothing" is distinguishable from "matched but
  // returned nothing": with .select() a zero-row update yields data = [].
  const { data: claimed, error: claimError } = await admin
    .from('creator_profiles')
    .update({ nudge_sent_at: claimedAt })
    .eq('id', row.id)
    .is('nudge_sent_at', null)
    .select('id');

  if (claimError) {
    // Claim failed at the database, so nothing was sent and the row stays
    // eligible for the next run. Not an audit row: nothing happened.
    console.error(`[nudge] claim failed for ${row.id}: ${claimError.message}`);
    return { id: row.id, outcome: 'failed', error: claimError.message };
  }

  if (!claimed || claimed.length === 0) {
    // Another run got there between our select and this update.
    return { id: row.id, outcome: 'skipped' };
  }

  // ── From here on, exactly one attempt is recorded whatever happens ──────
  let emailDetails: Record<string, string>;
  let to: string | null = null;
  let handle: string | null = null;

  const { data: authUser, error: authLookupError } = await admin.auth.admin.getUserById(row.id);
  to = authUser?.user?.email ?? null;

  if (row.creator_id) {
    const { data: social } = await admin
      .from('social_profiles')
      .select('handle')
      .eq('creator_id', row.creator_id)
      .limit(1)
      .maybeSingle();
    handle = social?.handle ?? null;
  }

  if (!to) {
    const reason = authLookupError?.message ?? 'no_email_on_auth_user';
    emailDetails = { email: 'failed', error: reason };
    console.error(`[nudge] no email address for ${row.id}: ${reason}`);
  } else {
    // Greeting order matches the approval mail: the claimed profile's own
    // display_name, then the scraped creator record.
    let scrapedName: string | null = null;
    if (row.creator_id) {
      const { data: creator } = await admin
        .from('creators')
        .select('display_name')
        .eq('id', row.creator_id)
        .maybeSingle();
      scrapedName = creator?.display_name ?? null;
    }

    const result = await sendEmail({
      to,
      subject: VERIFICATION_NUDGE_SUBJECT,
      // createElement rather than JSX: this is a route.ts.
      react: createElement(VerificationNudge, {
        firstName: firstNameOf(row.display_name, scrapedName),
        handle: handle ?? undefined,
        verifyUrl: `${SITE_URL}/creator-dashboard/verify`,
      }),
      replyTo: process.env.ADMIN_EMAIL,
      tags: [{ name: 'type', value: 'verification_nudge' }],
    });

    emailDetails = result.ok
      ? { email: 'sent', resend_id: result.id }
      : { email: 'failed', error: result.error };
  }

  // ── Audit row: one per attempt, system action so user_id is null ────────
  // Best-effort, same as the admin status routes: a failed audit insert is
  // logged and must not turn a delivered email into a reported failure.
  const { error: logError } = await admin.from('activity_log').insert({
    event_type: 'verification_nudge_sent',
    target_id: row.id,
    user_id: null,
    details: emailDetails,
  });
  if (logError) {
    console.error(`[nudge] activity_log insert failed for ${row.id}: ${logError.message}`);
  }

  // Funnel: fire-and-forget via after(). userAgent is deliberately null — the
  // request's own agent is the scheduler's, and classifying a system event
  // as a bot would drop it from every "humans only" funnel query.
  recordFunnelEvent({
    eventType: 'nudge_sent',
    handle,
    creatorId: row.creator_id ?? null,
    creatorProfileId: row.id,
    locale: row.locale ?? null,
    userAgent: null,
    details: { email: emailDetails.email },
  });

  if (emailDetails.email === 'sent') {
    return { id: row.id, outcome: 'sent', to: maskEmail(to!) };
  }
  return { id: row.id, outcome: 'failed', ...(to ? { to: maskEmail(to) } : {}), error: emailDetails.error };
}
