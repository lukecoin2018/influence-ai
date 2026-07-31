// app/api/creators/verify-bio/route.ts
// Checks Instagram/TikTok bio for the verification code via direct fetch + Apify fallback.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { recordFunnelEvent } from '@/lib/funnel/events';
import { checkBioForCode } from '@/lib/apify';
import { withNoStore } from '@/lib/http/no-store';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Attempts inside one cooling-off window. Raised from 5: the counter records
 * "times we asked and didn't find it", which includes causes that are not the
 * creator's fault, and 5 was reachable without ever making a mistake.
 */
const MAX_ATTEMPTS = 15;

/**
 * Attempts older than this are ignored entirely. Combined with MAX_ATTEMPTS
 * this turns a permanent lockout into a wait — nothing needs to reset the
 * counter, because a lapsed window makes it irrelevant.
 */
const ATTEMPT_WINDOW_MS = 60 * 60 * 1000;

/**
 * Machine-readable failure reasons. The client maps these to localized copy
 * (lib/i18n/auth-strings.ts) — this route deliberately returns no
 * user-facing English prose, because whatever it sent used to win over the
 * client's string table and land untranslated in front of Spanish creators.
 */
type Reason =
  | 'not_signed_in'
  | 'profile_not_found'
  | 'handle_unresolved'
  | 'invalid_code'
  | 'code_expired'
  | 'too_many_attempts'
  | 'code_absent'
  | 'check_unavailable'
  | 'unexpected';

/**
 * Reads a session, so it must never be stored by a shared cache — the VPS's
 * nginx keys on URI alone. See lib/http/no-store.ts.
 */
export const POST = withNoStore(handlePOST);

/**
 * Identity comes from the session cookie; the only thing taken from the body
 * is the code the creator was shown.
 *
 * It used to take `creatorProfileId`, `handle` and `platform` from the body,
 * and that is what made it forgeable: the bio it checked belonged to the
 * caller-supplied handle, never to the profile it was about to mark verified.
 * Claiming someone else's creator_id, then pasting the real code into your own
 * bio, passed. The handle checked is now derived from the profile's creator_id,
 * so the account proven is always the account claimed.
 *
 * Same shape as app/api/creators/regenerate-code/route.ts, whose docstring
 * makes the same argument about the same class of body parameter — the session
 * client establishes who the caller is, the service-role client does the write,
 * because creator_profiles' RLS policies are not guaranteed to permit it.
 */
async function handlePOST(req: NextRequest) {
  try {
    const { code } = await req.json();

    const session = await createSupabaseServerClient();
    const {
      data: { user },
    } = await session.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, reason: 'not_signed_in' satisfies Reason },
        { status: 401 }
      );
    }

    // select('*') rather than a column list so this route keeps working if
    // 0010 hasn't been applied yet: PostgREST errors on an unknown column in
    // an explicit select, which would surface as a bogus "profile not found"
    // and block verification entirely. One row by primary key, server-side
    // only — nothing here is returned to the client.
    const { data: profile } = await supabaseAdmin
      .from('creator_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json(
        { ok: false, reason: 'profile_not_found' satisfies Reason },
        { status: 404 }
      );
    }

    // Already verified
    if (profile.claim_status === 'verified') {
      return NextResponse.json({ ok: true, verified: true });
    }

    if (profile.verification_code !== code) {
      return NextResponse.json(
        { ok: false, reason: 'invalid_code' satisfies Reason },
        { status: 400 }
      );
    }

    if (
      profile.verification_code_expires_at &&
      new Date(profile.verification_code_expires_at) < new Date()
    ) {
      return NextResponse.json(
        { ok: false, reason: 'code_expired' satisfies Reason },
        { status: 400 }
      );
    }

    // ── Effective attempt count ───────────────────────────────────────────
    // Computed at read time rather than zeroed by a separate write: a lapsed
    // window simply makes the stored number irrelevant, so there is no
    // bookkeeping update to get wrong and no state to fall out of sync.
    //
    // A missing column (0010 not applied), a NULL, and an unparseable value
    // all land on "no attempt recorded" -> window lapsed -> not locked out.
    // This path must never be the reason someone can't claim their profile.
    const storedAttempts: number = profile.verification_attempts ?? 0;
    const lastAttemptMs = profile.last_verification_attempt_at
      ? new Date(profile.last_verification_attempt_at).getTime()
      : NaN;
    const windowLapsed =
      !Number.isFinite(lastAttemptMs) || Date.now() - lastAttemptMs >= ATTEMPT_WINDOW_MS;
    const effectiveAttempts = windowLapsed ? 0 : storedAttempts;

    if (effectiveAttempts >= MAX_ATTEMPTS) {
      const msRemaining = lastAttemptMs + ATTEMPT_WINDOW_MS - Date.now();
      return NextResponse.json(
        {
          ok: false,
          reason: 'too_many_attempts' satisfies Reason,
          // Always at least 1 — "try again in 0 minutes" reads as broken.
          minutesRemaining: Math.max(1, Math.ceil(msRemaining / 60_000)),
        },
        { status: 400 }
      );
    }

    // ── Which account are we about to prove? ──────────────────────────────
    // The profile's own, resolved here rather than accepted from the caller.
    // A profile with no creator_id can't name an account to check — the claim
    // route no longer produces one, but a row predating that fix can exist.
    if (!profile.creator_id) {
      return NextResponse.json(
        { ok: false, reason: 'handle_unresolved' satisfies Reason },
        { status: 400 }
      );
    }

    const { data: socialProfile } = await supabaseAdmin
      .from('social_profiles')
      .select('handle, platform')
      .eq('creator_id', profile.creator_id)
      .limit(1)
      .maybeSingle();

    if (!socialProfile?.handle) {
      return NextResponse.json(
        { ok: false, reason: 'handle_unresolved' satisfies Reason },
        { status: 400 }
      );
    }

    const handle: string = socialProfile.handle;
    const platform: 'instagram' | 'tiktok' =
      socialProfile.platform === 'tiktok' ? 'tiktok' : 'instagram';

    // ── The check itself ──────────────────────────────────────────────────
    // Runs BEFORE the counter moves, which reverses the previous order. That
    // order existed to narrow a race, but it also meant every call was charged
    // an attempt before we knew whether the creator had done anything wrong —
    // the specific thing this change exists to stop. The race is handled below
    // instead, without pre-charging.
    const outcome = await checkBioForCode(handle, platform, code);

    if (outcome === 'found') {
      await supabaseAdmin
        .from('creator_profiles')
        .update({
          claim_status: 'verified',
          claimed_at: new Date().toISOString(),
          verification_code: null,
          verification_code_expires_at: null,
          // Cleared on success so a later re-verification never inherits a
          // stale count from this one.
          verification_attempts: 0,
          last_verification_attempt_at: null,
        })
        .eq('id', user.id);

      // `verified` is now single-sourced here. The claim route's auto-verify
      // branch used to fire the other half with details { path:
      // 'auto_email_match' }; that branch is gone, so every `verified` row
      // written from now on means a bio code was actually found.
      //
      // Deliberately NOT fired by the already-verified early return above:
      // that path is an idempotent re-check of a creator who was verified at
      // some earlier point, and counting it would let one creator inflate the
      // funnel by reloading.
      recordFunnelEvent({
        eventType: 'verified',
        handle,
        // profile came from select('*'), so these are present when the columns
        // exist and undefined when they don't (0009 unapplied) — either way
        // this coalesces to null rather than failing the write.
        creatorId: profile.creator_id ?? null,
        creatorProfileId: user.id,
        locale: profile.locale ?? null,
        userAgent: req.headers.get('user-agent'),
        details: { path: 'bio_code', platform },
      });

      return NextResponse.json({ ok: true, verified: true });
    }

    if (outcome === 'unavailable') {
      // We could not read the bio. Nothing is recorded — this says nothing
      // about the creator, and charging for our own outage is what made the
      // old ceiling reachable without any mistake.
      return NextResponse.json({
        ok: true,
        verified: false,
        reason: 'check_unavailable' satisfies Reason,
      });
    }

    // outcome === 'absent': a real miss, and the only case that costs an attempt.
    //
    // Race safety, replacing the pre-increment: the write is conditional on the
    // counter still holding the value this request read. If a concurrent
    // request already incremented, this update matches zero rows and is
    // dropped rather than clobbering it — so two overlapping attempts can
    // never collapse into one. No retry: the count did move, which is all the
    // ceiling needs.
    await supabaseAdmin
      .from('creator_profiles')
      .update({
        verification_attempts: effectiveAttempts + 1,
        last_verification_attempt_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .eq('verification_attempts', storedAttempts);

    return NextResponse.json({
      ok: true,
      verified: false,
      reason: 'code_absent' satisfies Reason,
    });
  } catch (err) {
    // `error` is for logs, not for display — the client keys off `reason`.
    return NextResponse.json(
      {
        ok: false,
        reason: 'unexpected' satisfies Reason,
        error: err instanceof Error ? err.message : 'Unexpected error',
      },
      { status: 500 }
    );
  }
}
