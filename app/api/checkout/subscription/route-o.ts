import { NextRequest, NextResponse } from 'next/server';
import { stripe, PRICE_IDS } from '@/lib/stripe';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountType, tier } = await req.json();

    // Validate inputs
    if (!accountType || !tier) {
      return NextResponse.json({ error: 'Missing accountType or tier' }, { status: 400 });
    }

    // Get the correct price ID
    const priceId = (PRICE_IDS as any)[accountType]?.[tier];
    if (!priceId) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Check if user already has a Stripe customer ID
    const profileTable = accountType === 'brand' ? 'brand_profiles' : 'creator_profiles';
    const { data: profile } = await supabase
      .from(profileTable)
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
          account_type: accountType,
        },
      });
      customerId = customer.id;

      // Save customer ID to profile
      await supabase
        .from(profileTable)
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${req.nextUrl.origin}/${accountType === 'brand' ? 'dashboard' : 'creator-dashboard'}?checkout=success`,
      cancel_url: `${req.nextUrl.origin}/pricing/${accountType}s?checkout=canceled`,
      metadata: {
        user_id: user.id,
        account_type: accountType,
        tier: tier,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          account_type: accountType,
          tier: tier,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
