// app/api/creators/claim/route.ts
// Creates creator account + generates verification code

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { recordFunnelEvent } from '@/lib/funnel/events';
import { generateVerificationCode, verificationCodeExpiresAt } from '@/lib/verification-code';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Machine-readable failure reasons, same contract as
 * app/api/creators/verify-bio/route.ts: this route returns a code and the
 * client maps it to localized copy (lib/i18n/auth-strings.ts). It used to
 * return `err.message` verbatim, which put raw Postgres text — including a
 * unique-constraint name and Supabase's "user already registered" — in front
 * of creators, in English, on a page that is otherwise bilingual.
 */
type Reason =
  | 'handle_missing'
  | 'handle_not_found'
  | 'already_claimed'
  | 'signup_failed'
  | 'unexpected';

/**
 * Same rule as the four existing normalizeHandle() copies (lib/funnel/events.ts
 * documents the list). social_profiles.handle is stored lowercased, so the
 * lookup below only resolves against a normalized value.
 */
function normalizeHandle(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const normalized = raw.trim().replace(/^@/, '').toLowerCase();
  return normalized || null;
}

/**
 * The UI locale the creator was shown on the claim teaser, forwarded by
 * app/auth/signup/page.tsx. Anything that isn't exactly 'en' or 'es' — absent,
 * misspelled, a region tag, a non-string — persists as NULL, which app code
 * reads as 'en'. Deliberately never throws and never 400s: a locale bug must
 * not be able to block a signup.
 */
function normalizeLocale(raw: unknown): 'en' | 'es' | null {
  return raw === 'en' || raw === 'es' ? raw : null;
}

/**
 * Public, unauthenticated, and about to be linked from DMs to real creators —
 * so nothing here may be taken on the caller's word.
 *
 * The body carries exactly four fields: email, password, handle, locale. It
 * used to also carry creatorId, platform and detectedEmail, all trusted:
 *
 *  - `detectedEmail` was compared against `email`, both from this same body,
 *    and a match wrote claim_status 'verified' outright. Two matching strings
 *    verified a claim. The auto-verify path is gone rather than repaired:
 *    detected_email is scraped from a PUBLIC bio, so even read correctly from
 *    the database it proves only that the caller can read a public string —
 *    and createUser() below passes email_confirm: true, so the mailbox is
 *    never proven either. The bio code is the only check here that
 *    demonstrates control of the account, so it is now the only path.
 *  - `creatorId` was written straight to creator_profiles.creator_id, so any
 *    caller could bind their account to any creator in the database. It is now
 *    resolved from `handle` server-side, along with `platform`.
 *
 * social_profiles has exactly one RLS policy and it is SELECT-only, so an
 * attacker cannot rewrite what this lookup reads.
 */
export async function POST(req: NextRequest) {
  try {
    const { email, password, handle, locale } = await req.json();

    const normalizedHandle = normalizeHandle(handle);
    if (!normalizedHandle) {
      return NextResponse.json(
        { error: 'Handle is required', reason: 'handle_missing' satisfies Reason },
        { status: 400 }
      );
    }

    // ── Resolve the creator from the database, not from the caller ──────────
    // One row: creators are single-platform by scrape source, and no creator
    // has more than one social_profiles row (measured 2026-07-31, zero).
    const { data: socialProfile } = await supabaseAdmin
      .from('social_profiles')
      .select('creator_id, platform')
      .eq('handle', normalizedHandle)
      .limit(1)
      .maybeSingle();

    if (!socialProfile?.creator_id) {
      return NextResponse.json(
        { error: 'Handle not indexed', reason: 'handle_not_found' satisfies Reason },
        { status: 404 }
      );
    }

    const creatorId: string = socialProfile.creator_id;
    const platform: 'instagram' | 'tiktok' =
      socialProfile.platform === 'tiktok' ? 'tiktok' : 'instagram';

    // ── Reject a second claim BEFORE creating an auth user ──────────────────
    // creator_profiles.creator_id carries a unique partial index, so a duplicate
    // would fail at the profile insert below — after createUser() had already
    // succeeded, leaving an auth user with no profile and an email that can
    // never be reused. Checking first keeps that out of the common case. The
    // index is still the real guard: two simultaneous claims can both pass this
    // check, and the loser gets 'unexpected' from the catch rather than a
    // corrupt row.
    const { data: existingClaim } = await supabaseAdmin
      .from('creator_profiles')
      .select('id')
      .eq('creator_id', creatorId)
      .maybeSingle();

    if (existingClaim) {
      return NextResponse.json(
        { error: 'Already claimed', reason: 'already_claimed' satisfies Reason },
        { status: 409 }
      );
    }

    // Create auth user via admin (bypasses email confirmation)
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    // Wrong password length, malformed address, email already registered. The
    // message is logged, never returned — it distinguishes "already registered"
    // from "too short", which is an account-enumeration oracle on a public
    // endpoint.
    if (authError || !authData?.user) {
      console.warn(`[claim] createUser failed for @${normalizedHandle}: ${authError?.message}`);
      return NextResponse.json(
        { error: 'Signup failed', reason: 'signup_failed' satisfies Reason },
        { status: 400 }
      );
    }

    const userId = authData.user.id;

    // Every claim now starts pending and proves itself through the bio code.
    const code = generateVerificationCode();
    const expiresAt = verificationCodeExpiresAt();

    // Create user role
    await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: userId, role: 'creator' });

    // Create creator profile
    const { error: profileError } = await supabaseAdmin
      .from('creator_profiles')
      .insert({
        id: userId,
        creator_id: creatorId,
        claim_status: 'pending',
        claimed_at: null,
        verification_code: code,
        verification_code_expires_at: expiresAt,
        verification_attempts: 0,
        locale: normalizeLocale(locale),
      });

    if (profileError) throw profileError;

    // ── Funnel capture ──────────────────────────────────────────────────────
    // The stitch. This is the only place in the codebase where the pre-claim
    // key (handle) and both post-claim keys (creator_id, and userId — which is
    // creator_profiles.id) are in scope at once, so it is the one point where
    // the two halves of the funnel can be joined.
    //
    // No `verified` event fires here any more. It used to, on the auto-verify
    // branch, with details { path: 'auto_email_match' } — that branch no longer
    // exists, so `verified` is now single-sourced from verify-bio and always
    // means a bio code was actually found. Historical rows keep their value;
    // nothing in the repo reads it.
    recordFunnelEvent({
      eventType: 'claim_completed',
      handle: normalizedHandle,
      // Now always resolved — a claim can no longer complete without a
      // creator_id, because the handle lookup above is what produces it.
      creatorId,
      creatorProfileId: userId,
      locale: normalizeLocale(locale),
      userAgent: req.headers.get('user-agent'),
      details: null,
    });

    return NextResponse.json({
      success: true,
      userId,
      code,
      expiresAt,
      platform,
      handle: normalizedHandle,
    });
  } catch (err) {
    console.error('[claim] unexpected failure:', err);
    return NextResponse.json(
      { error: 'Unexpected error', reason: 'unexpected' satisfies Reason },
      { status: 500 }
    );
  }
}
