import { NextRequest, NextResponse } from 'next/server';
import { createElement } from 'react';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { requireOwnerApi } from '@/lib/auth/api-guards';
import { withNoStore } from '@/lib/http/no-store';
import { recordFunnelEvent } from '@/lib/funnel/events';
import { sendEmail, SITE_URL } from '@/lib/email/client';
import { firstNameOf } from '@/lib/email/first-name';
import { CreatorApproved, CREATOR_APPROVED_SUBJECT } from '@/lib/email/templates/CreatorApproved';

/**
 * Sets a creator claim's status by hand. Owner only.
 *
 * ── WHY THIS ROUTE EXISTS ──────────────────────────────────────────────────
 *
 * app/admin/creators/page.tsx used to write this straight from the browser:
 *
 *     supabase.from('creator_profiles').update({ claim_status: status })
 *
 * That set ONE column. The real verification path,
 * app/api/creators/verify-bio/route.ts, sets six: it also stamps claimed_at
 * (which CLAUDE.md defines as "when the claim became verified"), clears the
 * bio code and its expiry, and resets the attempt counter. An admin-verified
 * creator therefore had claimed_at NULL and a live verification code sitting
 * in the row, and never appeared in funnel_events as `verified`.
 *
 * Same shape as app/api/admin/brands/status/route.ts: owner gate, service-role
 * write, no-store, best-effort audit row. The service-role client is also what
 * makes the write pass migration 0015's column-protection trigger regardless
 * of how the admin's user_roles row is set up.
 *
 * ── EMAIL ──────────────────────────────────────────────────────────────────
 *
 * Approve sends the creator one email (lib/email/templates/CreatorApproved.tsx)
 * through Resend, with ADMIN_EMAIL as Reply-To. Reject sends nothing. Three
 * rules, all deliberate:
 *
 *  1. Only on a real transition. The row's claim_status is read BEFORE the
 *     update; if it was already 'verified', the write still happens (it is
 *     idempotent) but no mail goes out. Re-clicking Approve must not spam.
 *  2. Mail never blocks or rolls back the write. The update commits first;
 *     a send failure is logged, recorded on the audit row, surfaced to the
 *     admin as emailStatus: 'failed', and the route still returns 200.
 *  3. The recipient is auth.users.email for the profile's id — creator_profiles
 *     has no email column, and its id IS the auth user id (claim/route.ts
 *     inserts `id: userId` from auth.admin.createUser).
 */

type EmailStatus = 'sent' | 'failed' | 'skipped';

const ALLOWED = ['verified', 'rejected'] as const;
type Status = (typeof ALLOWED)[number];

export const POST = withNoStore(handlePOST);

async function handlePOST(req: NextRequest) {
  const auth = await requireOwnerApi();
  if ('error' in auth) return auth.error;

  const { creatorProfileId, status } = await req.json().catch(() => ({}) as Record<string, unknown>);

  if (typeof creatorProfileId !== 'string' || !creatorProfileId) {
    return NextResponse.json({ error: 'creatorProfileId required', reason: 'creator_profile_id_required' }, { status: 400 });
  }

  if (typeof status !== 'string' || !ALLOWED.includes(status as Status)) {
    return NextResponse.json({ error: 'Invalid status', reason: 'invalid_status' }, { status: 400 });
  }

  const now = new Date().toISOString();

  // Field set per outcome. `verified` mirrors verify-bio's success branch
  // exactly; `rejected` clears the code (there is nothing left to prove) but
  // leaves the attempt counters, which are history.
  const patch =
    status === 'verified'
      ? {
          claim_status: 'verified',
          claimed_at: now,
          verification_code: null,
          verification_code_expires_at: null,
          verification_attempts: 0,
          last_verification_attempt_at: null,
          updated_at: now,
        }
      : {
          claim_status: 'rejected',
          verification_code: null,
          verification_code_expires_at: null,
          updated_at: now,
        };

  const admin = createSupabaseAdminClient();

  // Read before write, for the transition check only. Not a lock — two admins
  // approving the same row in the same second could both send — and not a
  // 404 gate either; the update below handles "no such row" on its own.
  const { data: before } = await admin
    .from('creator_profiles')
    .select('claim_status, display_name')
    .eq('id', creatorProfileId)
    .maybeSingle();
  const previousStatus: string | null = before?.claim_status ?? null;

  // Selected back so a creatorProfileId that matches nothing is a 404 rather
  // than a silent success, and so the funnel event below has its dimensions.
  const { data: updated, error } = await admin
    .from('creator_profiles')
    .update(patch)
    .eq('id', creatorProfileId)
    .select('id, creator_id, claim_status, locale')
    .maybeSingle();

  if (error) {
    console.error(`[admin-creators] failed to set ${creatorProfileId} to ${status}: ${error.message}`);
    return NextResponse.json({ error: 'Update failed', reason: 'update_failed' }, { status: 500 });
  }

  if (!updated) {
    return NextResponse.json({ error: 'Creator profile not found', reason: 'creator_not_found' }, { status: 404 });
  }

  // ── Creator email, only on pending/rejected/anything → verified ───────────
  // Runs after the update has committed and before the audit row so the
  // outcome lands on that row. Every branch produces an emailStatus; nothing
  // here can throw past sendEmail's own contract.
  let emailStatus: EmailStatus = 'skipped';
  let emailDetails: Record<string, string> = {};
  let resendId: string | undefined;

  if (status === 'verified' && previousStatus === 'verified') {
    emailDetails = { email: 'skipped', reason: 'already_verified' };
  } else if (status === 'verified') {
    const { data: authUser, error: authLookupError } = await admin.auth.admin.getUserById(creatorProfileId);
    const to = authUser?.user?.email ?? null;

    if (!to) {
      emailStatus = 'failed';
      const reason = authLookupError?.message ?? 'no_email_on_auth_user';
      emailDetails = { email: 'failed', error: reason };
      console.error(`[admin-creators] no email address for ${creatorProfileId}: ${reason}`);
    } else {
      // Greeting: the claimed profile's own display_name first, then the
      // scraped creator record — the same order app/admin/creators/page.tsx
      // uses at its :127.
      let scrapedName: string | null = null;
      if (updated.creator_id) {
        const { data: creator } = await admin
          .from('creators')
          .select('display_name')
          .eq('id', updated.creator_id)
          .maybeSingle();
        scrapedName = creator?.display_name ?? null;
      }

      const sent = await sendEmail({
        to,
        subject: CREATOR_APPROVED_SUBJECT,
        // createElement rather than JSX: Next's route-handler convention is
        // route.ts, and a .tsx rename is not in the file-convention list.
        react: createElement(CreatorApproved, {
          firstName: firstNameOf(before?.display_name, scrapedName),
          dashboardUrl: `${SITE_URL}/creator-dashboard`,
        }),
        replyTo: process.env.ADMIN_EMAIL,
        tags: [{ name: 'type', value: 'creator_approved' }],
      });

      if (sent.ok) {
        emailStatus = 'sent';
        resendId = sent.id;
        emailDetails = { email: 'sent', resend_id: sent.id };
      } else {
        emailStatus = 'failed';
        emailDetails = { email: 'failed', error: sent.error };
      }
    }
  }

  // Best-effort audit row, exactly as the client used to write it, plus the
  // actor in user_id and (on the verified path) the email outcome. Failure is
  // logged and swallowed: an audit row must never cost the operator their
  // action.
  const { error: logError } = await admin.from('activity_log').insert({
    event_type: status === 'verified' ? 'creator_verified' : 'creator_rejected',
    target_id: creatorProfileId,
    user_id: auth.userId,
    details: { action: status, ...emailDetails },
  });
  if (logError) {
    console.error(`[admin-creators] activity_log insert failed for ${creatorProfileId}: ${logError.message}`);
  }

  // Funnel: an admin-verified creator is a verified creator. Same event
  // verify-bio fires at its :215, with the handle resolved the same way (from
  // the profile's creator_id, never from the request), and a distinct `path`
  // so the two routes to verified stay separable in the data.
  if (status === 'verified') {
    let handle: string | null = null;
    let platform: string | null = null;
    if (updated.creator_id) {
      const { data: social } = await admin
        .from('social_profiles')
        .select('handle, platform')
        .eq('creator_id', updated.creator_id)
        .limit(1)
        .maybeSingle();
      handle = social?.handle ?? null;
      platform = social?.platform ?? null;
    }
    recordFunnelEvent({
      eventType: 'verified',
      handle,
      creatorId: updated.creator_id ?? null,
      creatorProfileId: updated.id,
      locale: updated.locale ?? null,
      userAgent: req.headers.get('user-agent'),
      details: { path: 'admin_approve', platform },
    });
  }

  return NextResponse.json({
    success: true,
    claim_status: updated.claim_status,
    emailStatus,
    ...(resendId ? { resendId } : {}),
  });
}
