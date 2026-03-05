import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { spendTokens, TOKEN_COSTS, type TokenAction } from '@/lib/tokens';

export async function POST(request: Request) {
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

    // Check this is a brand user
    const { data: brandProfile } = await supabase
      .from('brand_profiles')
      .select('id, token_balance')
      .eq('id', user.id)
      .maybeSingle();

    if (!brandProfile) {
      // Not a brand user — allow through without charging
      return NextResponse.json({ success: true, balance: 0, skipped: true });
    }

    const result = await spendTokens(user.id, action as TokenAction);

    if (!result.success) {
      return NextResponse.json({
        error: 'Insufficient tokens',
        balance: result.balance,
        needed: TOKEN_COSTS[action as TokenAction],
      }, { status: 402 });
    }

    return NextResponse.json({ success: true, balance: result.balance });
  } catch (err) {
    console.error('Token spend error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
