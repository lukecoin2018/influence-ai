import { NextRequest, NextResponse } from 'next/server';
import { stripe, TOPUP_PRICE_IDS } from '@/lib/stripe';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { withNoStore } from '@/lib/http/no-store';

export const POST = withNoStore(handlePOST);

async function handlePOST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { packId } = await req.json();

    const priceId = (TOPUP_PRICE_IDS as any)[packId];
    if (!priceId) {
      return NextResponse.json({ error: 'Invalid pack' }, { status: 400 });
    }

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

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;

    const session = await stripe.checkout.sessions.create({
      customer: profile.stripe_customer_id,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/creator-dashboard?topup=success`,
      cancel_url: `${baseUrl}/creator-dashboard?topup=canceled`,
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
