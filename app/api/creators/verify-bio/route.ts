// app/api/creator/verify-bio/route.ts
// Checks Instagram/TikTok bio for verification code via direct fetch + Apify fallback

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkBioForCode } from '@/lib/apify';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { creatorProfileId, handle, platform, code } = await req.json();

    // Fetch profile
    const { data: profile } = await supabaseAdmin
      .from('creator_profiles')
      .select(
        'verification_code, verification_code_expires_at, verification_attempts, claim_status'
      )
      .eq('id', creatorProfileId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Already verified
    if (profile.claim_status === 'verified') {
      return NextResponse.json({ success: true, verified: true });
    }

    // Code mismatch
    if (profile.verification_code !== code) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    // Expired
    if (
      profile.verification_code_expires_at &&
      new Date(profile.verification_code_expires_at) < new Date()
    ) {
      return NextResponse.json(
        {
          error: 'Verification code expired. Go to your dashboard to get a new code.',
          expired: true,
        },
        { status: 400 }
      );
    }

    // Too many attempts
    if ((profile.verification_attempts ?? 0) >= 5) {
      return NextResponse.json(
        { error: 'Too many failed attempts. Please contact support.' },
        { status: 400 }
      );
    }

    // Increment attempts before checking (prevents race conditions)
    await supabaseAdmin
      .from('creator_profiles')
      .update({
        verification_attempts: (profile.verification_attempts ?? 0) + 1,
      })
      .eq('id', creatorProfileId);

    // Check bio — direct fetch first, Apify fallback
    const found = await checkBioForCode(
      handle,
      platform as 'instagram' | 'tiktok',
      code
    );

    if (found) {
      await supabaseAdmin
        .from('creator_profiles')
        .update({
          claim_status: 'verified',
          claimed_at: new Date().toISOString(),
          verification_code: null,
          verification_code_expires_at: null,
        })
        .eq('id', creatorProfileId);

      return NextResponse.json({ success: true, verified: true });
    }

    return NextResponse.json({
      success: true,
      verified: false,
      message:
        'Code not found in bio. Make sure you saved your profile and try again.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
