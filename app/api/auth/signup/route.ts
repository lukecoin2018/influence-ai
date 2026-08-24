import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withNoStore } from '@/lib/http/no-store';

// Service role client bypasses RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** Machine-readable failure codes. The client maps these; it never shows our prose. */
type Reason =
  | 'missing_fields'
  | 'signup_failed'
  | 'profile_failed';

export const POST = withNoStore(handlePOST);

/**
 * Brand signup — the main entry point (nav, login, blog, discover all link to
 * /signup, which posts here).
 *
 * ── WHAT WAS BROKEN ────────────────────────────────────────────────────────
 *
 * It wrote `status: 'approved'`. brand_profiles has no `status` column, so
 * PostgREST rejected every insert and no brand account has been created
 * through this route since it was written. Two consequences, both fixed here:
 *
 *  1. The raw error was returned to the browser, which is how a brand read
 *     "Could not find the 'status' column of 'brand_profiles' in the schema
 *     cache" on the signup form.
 *
 *  2. createUser() had already succeeded, and nothing cleaned up. Every failed
 *     signup left an auth user with no profile row and no user_roles row — the
 *     ~18 orphaned accounts dating back to April, whose email addresses could
 *     not be reused because the auth user still held them.
 */
async function handlePOST(req: NextRequest) {
  const { email, password, companyName, contactName, website, industry } = await req.json();

  // company_name and email are NOT NULL on brand_profiles (verified against the
  // live schema), so a missing value fails at the database rather than here.
  // Checked up front so it fails before an auth user exists.
  if (!email?.trim() || !password || !companyName?.trim()) {
    return NextResponse.json(
      { error: 'Missing required fields', reason: 'missing_fields' satisfies Reason },
      { status: 400 },
    );
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  // Logged, never returned. The message distinguishes "email already
  // registered" from "password too short", which is an account-enumeration
  // oracle on a public endpoint. Same reasoning as the claim route.
  if (authError || !authData?.user) {
    console.warn(`[brand-signup] createUser failed: ${authError?.message}`);
    return NextResponse.json(
      { error: 'Signup failed', reason: 'signup_failed' satisfies Reason },
      { status: 400 },
    );
  }

  const userId = authData.user.id;

  const { error: profileError } = await supabaseAdmin.from('brand_profiles').insert({
    id: userId,
    company_name: companyName.trim(),
    contact_name: contactName?.trim() || null,
    email: email.trim(),
    website: website?.trim() || null,
    industry: industry || null,
    // Every brand starts pending and is approved by a person. Was
    // `status: 'approved'` — the wrong column AND the wrong default: the brand
    // dashboard opens onto the whole creator database, which is the asset.
    approval_status: 'pending',
  });

  if (profileError) {
    // ── The line that stops new orphans ───────────────────────────────────
    // The auth user exists at this point and the profile does not. Left alone
    // that is a dead account which nonetheless owns its email address forever,
    // so the person cannot even retry with the same address. Deleting it puts
    // the world back as it was and lets them try again.
    //
    // Best-effort: if the delete itself fails there is nothing further to do
    // from here, but it must be logged loudly, because that is the case that
    // silently produces another orphan.
    console.error(`[brand-signup] profile insert failed for ${userId}: ${profileError.message}`);

    const { error: cleanupError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (cleanupError) {
      console.error(
        `[brand-signup] ORPHAN CREATED — could not delete auth user ${userId} after a failed ` +
        `profile insert: ${cleanupError.message}. This account has no brand_profiles row and ` +
        'holds its email address.',
      );
    }

    return NextResponse.json(
      { error: 'Could not create account', reason: 'profile_failed' satisfies Reason },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
