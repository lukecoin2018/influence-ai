// app/api/creator/claim/route.ts
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
 * The UI locale the creator was shown on the claim teaser, forwarded by
 * app/auth/signup/page.tsx. Anything that isn't exactly 'en' or 'es' — absent,
 * misspelled, a region tag, a non-string — persists as NULL, which app code
 * reads as 'en'. Deliberately never throws and never 400s: a locale bug must
 * not be able to block a signup.
 */
function normalizeLocale(raw: unknown): 'en' | 'es' | null {
  return raw === 'en' || raw === 'es' ? raw : null;
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, handle, creatorId, platform, detectedEmail, locale } =
      await req.json();

    // Create auth user via admin (bypasses email confirmation)
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError) throw authError;
    if (!authData.user) throw new Error('No user created');

    const userId = authData.user.id;

    // Auto-verify if email matches the detected email on the scraped profile
    const autoVerified =
      !!detectedEmail &&
      detectedEmail.toLowerCase() === email.toLowerCase();

    const code = autoVerified ? null : generateVerificationCode();
    const expiresAt = autoVerified ? null : verificationCodeExpiresAt();

    // Create user role
    await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: userId, role: 'creator' });

    // Create creator profile
    const { error: profileError } = await supabaseAdmin
      .from('creator_profiles')
      .insert({
        id: userId,
        creator_id: creatorId ?? null,
        claim_status: autoVerified ? 'verified' : 'pending',
        claimed_at: autoVerified ? new Date().toISOString() : null,
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
    const userAgent = req.headers.get('user-agent');
    const normalizedLocale = normalizeLocale(locale);

    recordFunnelEvent({
      eventType: 'claim_completed',
      handle,
      // Client-supplied and nullable (see the insert above) — a claim can
      // complete without one, and those rows are exactly the ones that would
      // otherwise look like drop-off. Recorded as null rather than skipped.
      creatorId: creatorId ?? null,
      creatorProfileId: userId,
      locale: normalizedLocale,
      userAgent,
      details: { autoVerified },
    });

    // The auto-verify path never touches /api/creators/verify-bio: it writes
    // claim_status 'verified' in the insert above and the client goes straight
    // to the dashboard (app/auth/signup/_SignUpForm.tsx). Instrumenting only
    // the verify-bio route would drop this population from `verified`
    // entirely — and it is the population that converted with the least
    // friction, so its absence would skew the rate in the flattering direction.
    if (autoVerified) {
      recordFunnelEvent({
        eventType: 'verified',
        handle,
        creatorId: creatorId ?? null,
        creatorProfileId: userId,
        locale: normalizedLocale,
        userAgent,
        details: { path: 'auto_email_match' },
      });
    }

    return NextResponse.json({
      success: true,
      userId,
      autoVerified,
      code,
      expiresAt,
      platform: platform ?? 'instagram',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
