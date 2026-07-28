// app/api/creators/regenerate-code/route.ts
// Mints a fresh bio-verification code for the signed-in creator.
//
// This file previously contained a byte-for-byte copy of verify-bio/route.ts:
// it verified a code instead of issuing one, and rejected every caller at its
// `verification_code !== code` guard because /creator-dashboard/verify sends no
// code. Replaced wholesale rather than patched — there was nothing here to keep.

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import {
  generateVerificationCode,
  verificationCodeExpiresAt,
  VERIFICATION_CODE_TTL_MS,
} from '@/lib/verification-code';

/**
 * Re-issuing inside this window returns the existing code rather than minting a
 * new one. Not a security boundary — a caller can simply wait 60s — but it stops
 * a re-render loop on /creator-dashboard/verify from rotating the code out from
 * under a creator who has already pasted the old one into their bio.
 */
const REISSUE_THROTTLE_MS = 60_000;

/**
 * Takes no request body. The row to write is resolved from the session cookie,
 * never from caller-supplied input: accepting a creatorProfileId (as the old
 * caller sent) would let anyone rotate anyone else's verification code by
 * guessing a UUID, locking the real owner out of claiming their own profile.
 *
 * Identity comes from the anon-key session client; the write then goes through
 * the service-role client scoped to that same id, since creator_profiles' RLS
 * policies live in the database rather than this repo and are not guaranteed to
 * permit a self-update of these columns. Same split as
 * app/api/creator/brand-matches/route.ts.
 */
export async function POST() {
  try {
    const session = await createSupabaseServerClient();
    const {
      data: { user },
    } = await session.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    const admin = createSupabaseAdminClient();

    const { data: profile } = await admin
      .from('creator_profiles')
      .select('claim_status, verification_code, verification_code_expires_at')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (profile.claim_status === 'verified') {
      return NextResponse.json(
        { error: 'This profile is already verified — there is no code to regenerate.' },
        { status: 400 }
      );
    }

    // No issued_at column exists, so derive it from the stored expiry. A row
    // with a code but no expiry can't be dated and simply falls through to a
    // fresh mint.
    if (profile.verification_code && profile.verification_code_expires_at) {
      const issuedAt =
        new Date(profile.verification_code_expires_at).getTime() - VERIFICATION_CODE_TTL_MS;
      if (Number.isFinite(issuedAt) && Date.now() - issuedAt < REISSUE_THROTTLE_MS) {
        return NextResponse.json({
          success: true,
          code: profile.verification_code,
          expiresAt: profile.verification_code_expires_at,
        });
      }
    }

    const code = generateVerificationCode();
    const expiresAt = verificationCodeExpiresAt();

    // verification_attempts is deliberately left alone. Attempts are spent
    // against a creator, not against a particular code, so handing out a fresh
    // code must not quietly reset someone back to five tries.
    const { error } = await admin
      .from('creator_profiles')
      .update({
        verification_code: code,
        verification_code_expires_at: expiresAt,
      })
      .eq('id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, code, expiresAt });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
