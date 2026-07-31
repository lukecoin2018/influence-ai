import { NextRequest, NextResponse } from 'next/server';
import { stripe, PRICE_IDS } from '@/lib/stripe';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { withNoStore } from '@/lib/http/no-store';

export const POST = withNoStore(handlePOST);

async function handlePOST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountType, tier } = await req.json();

    if (!accountType || !tier) {
      return NextResponse.json({ error: 'Missing accountType or tier' }, { status: 400 });
    }

    const priceId = (PRICE_IDS as any)[accountType]?.[tier];
    if (!priceId) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const profileTable = accountType === 'brand' ? 'brand_profiles' : 'creator_profiles';
    const { data: profile } = await supabase
      .from(profileTable)
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
          account_type: accountType,
        },
      });
      customerId = customer.id;

      // Service-role for the write: stripe_customer_id is one of the columns
      // supabase/migrations/0015 stops an authenticated caller from changing,
      // and profileTable is creator_profiles for a creator. The row is still
      // scoped to user.id from the session read above.
      await createSupabaseAdminClient()
        .from(profileTable)
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/${accountType === 'brand' ? 'dashboard' : 'creator-dashboard'}?checkout=success`,
      cancel_url: `${baseUrl}/pricing/${accountType}s?checkout=canceled`,
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
