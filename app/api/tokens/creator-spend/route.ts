// Place at: app/api/tokens/creator-spend/route.ts

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { spendCreatorTokens, TOKEN_COSTS, type TokenAction } from '@/lib/tokens';
import { withNoStore } from '@/lib/http/no-store';

export const POST = withNoStore(handlePOST);

async function handlePOST(request: Request) {
  try {
    const { action } = await request.json();

    if (!action || !(action in TOKEN_COSTS)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify this is actually a creator
    const { data: creatorProfile, error: profileError } = await supabase
      .from('creator_profiles')
      .select('id, token_balance, claim_status')
      .eq('id', user.id)
      .maybeSingle();

    // A failed lookup is neither "not a creator" (which skips the charge) nor
    // "not verified" (which refuses it). Same split as brand-matches.
    if (profileError) {
      console.error(`[creator-spend] creator_profiles lookup failed for ${user.id.slice(0, 8)}…: ${profileError.message}`);
      return NextResponse.json({ error: 'Lookup failed', reason: 'lookup_failed' }, { status: 503 });
    }

    if (!creatorProfile) {
      // Not a creator — allow through without charging
      return NextResponse.json({ success: true, balance: 0, skipped: true });
    }

    // A pending claim can't spend. The tools this charges for are gated on
    // verification anyway; without this check an unproven claim could drain the
    // balance that belongs to the creator who eventually proves the account.
    if (creatorProfile.claim_status !== 'verified') {
      return NextResponse.json({ error: 'Forbidden', reason: 'not_verified' }, { status: 403 });
    }

    const result = await spendCreatorTokens(user.id, action as TokenAction);

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Insufficient tokens',
          balance: result.balance,
          needed: TOKEN_COSTS[action as TokenAction],
        },
        { status: 402 }
      );
    }

    return NextResponse.json({ success: true, balance: result.balance });
  } catch (err) {
    console.error('Creator token spend error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
