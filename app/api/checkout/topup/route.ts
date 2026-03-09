import { NextRequest, NextResponse } from 'next/server';
import { stripe, TOPUP_PRICE_IDS } from '@/lib/stripe';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { packId } = await req.json();

    // Validate pack
    const priceId = TOPUP_PRICE_IDS[packId as keyof typeof TOPUP_PRICE_IDS];
    if (!priceId) {
      return NextResponse.json({ error: 'Invalid pack' }, { status: 400 });
    }

    // Verify user is a creator with an active subscription
    const { data: profile } = await supabase
      .from('creator_profiles')
      .select('stripe_customer_id, subscription_tier')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Creator profile not found' }, { status: 404 });
    }

    if (!profile.subscription_tier || profile.subscription_tier === 'free') {
      return NextResponse.json({ error: 'Active subscription required to purchase top-ups' }, { status: 403 });
    }

    if (!profile.stripe_customer_id) {
      return NextResponse.json({ error: 'No Stripe customer found' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      customer: profile.stripe_customer_id,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${req.nextUrl.origin}/creator-dashboard?topup=success`,
      cancel_url: `${req.nextUrl.origin}/creator-dashboard?topup=canceled`,
      metadata: {
        user_id: user.id,
        account_type: 'creator',
        type: 'topup',
        pack_id: packId,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Top-up checkout error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
