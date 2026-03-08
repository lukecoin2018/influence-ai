// app/api/creator/claim/route.ts
// Creates creator account + generates verification code

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  let code = 'IIT-';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, handle, creatorId, platform, detectedEmail } =
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

    const code = autoVerified ? null : generateCode();
    const expiresAt = autoVerified
      ? null
      : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

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
      });

    if (profileError) throw profileError;

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
