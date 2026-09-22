import 'server-only';
import { createElement } from 'react';
import type { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { sendEmail, SITE_URL } from '@/lib/email/client';
import { firstNameOf } from '@/lib/email/first-name';
import { CreatorApproved, CREATOR_APPROVED_SUBJECT } from '@/lib/email/templates/CreatorApproved';

/**
 * The "You're verified on InfluenceIT" email, for either road to verified.
 *
 * ── ONE FUNCTION, TWO CALLERS ──────────────────────────────────────────────
 *
 * app/api/admin/creators/status/route.ts sends it when an admin clicks
 * Approve; app/api/creators/verify-bio/route.ts sends it when the creator
 * proves the bio code themselves. Until 2026-09-22 only the admin route sent
 * anything, so a creator who verified on their own — the path the whole
 * funnel is built to produce — never heard from us. Same recipient rule, same
 * greeting order, same Reply-To and tag, in one place, so the two paths can
 * never drift apart.
 *
 * ── WHAT THIS DOES NOT DECIDE ──────────────────────────────────────────────
 *
 * Whether a transition to verified actually happened. That check belongs to
 * the caller, which has the row's previous status in hand (the admin route
 * reads it before writing; verify-bio returns early on an already-verified
 * profile). This function assumes it is being called because a claim just
 * became verified, and sends.
 *
 * ── CONTRACT ───────────────────────────────────────────────────────────────
 *
 * Never throws. Both callers have just committed a database write, and a mail
 * problem must not turn that write into a reported failure. Every path — a
 * missing auth user, a profile row that has vanished, a Resend error, a
 * lookup that throws — comes back as `{ email: 'failed', error }` and one
 * console.error, so the caller can put the outcome on its audit row and carry
 * on. The shape matches what the nudge cron and the fulfil helper already
 * write to activity_log.details.
 *
 * The recipient is auth.users.email for the profile's id: creator_profiles has
 * no email column, and its id IS the auth user id (claim/route.ts inserts
 * `id: userId` from auth.admin.createUser).
 */

export type CreatorApprovedEmailOutcome =
  | { email: 'sent'; resend_id: string }
  | { email: 'failed'; error: string };

type Admin = ReturnType<typeof createSupabaseAdminClient>;

export async function sendCreatorApproved(
  admin: Admin,
  creatorProfileId: string,
): Promise<CreatorApprovedEmailOutcome> {
  try {
    const { data: authUser, error: authLookupError } = await admin.auth.admin.getUserById(creatorProfileId);
    const to = authUser?.user?.email ?? null;

    if (!to) {
      const reason = authLookupError?.message ?? 'no_email_on_auth_user';
      console.error(`[creator-approved] no email address for ${creatorProfileId}: ${reason}`);
      return { email: 'failed', error: reason };
    }

    // Greeting: the claimed profile's own display_name first, then the
    // scraped creator record — the same order app/admin/creators/page.tsx
    // uses for its headline, and the same order the nudge uses.
    const { data: profile } = await admin
      .from('creator_profiles')
      .select('display_name, creator_id')
      .eq('id', creatorProfileId)
      .maybeSingle();

    let scrapedName: string | null = null;
    if (profile?.creator_id) {
      const { data: creator } = await admin
        .from('creators')
        .select('display_name')
        .eq('id', profile.creator_id)
        .maybeSingle();
      scrapedName = creator?.display_name ?? null;
    }

    const sent = await sendEmail({
      to,
      subject: CREATOR_APPROVED_SUBJECT,
      // createElement rather than JSX: this file is imported from route.ts
      // handlers and stays a .ts like them.
      react: createElement(CreatorApproved, {
        firstName: firstNameOf(profile?.display_name, scrapedName),
        dashboardUrl: `${SITE_URL}/creator-dashboard`,
      }),
      replyTo: process.env.ADMIN_EMAIL,
      tags: [{ name: 'type', value: 'creator_approved' }],
    });

    return sent.ok ? { email: 'sent', resend_id: sent.id } : { email: 'failed', error: sent.error };
  } catch (err) {
    // sendEmail() never throws, so this catches the Supabase lookups above.
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[creator-approved] threw for ${creatorProfileId}: ${message}`);
    return { email: 'failed', error: message };
  }
}
