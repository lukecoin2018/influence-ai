import { NextRequest, NextResponse } from 'next/server';
import { stripe, TIER_TOKENS, TOPUP_TOKENS } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Use service role client for webhook (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { user_id, account_type, type, pack_id, tier } = session.metadata || {};

  if (!user_id || !account_type) return;

  const profileTable = account_type === 'brand' ? 'brand_profiles' : 'creator_profiles';

  // Handle top-up purchase
  if (type === 'topup' && pack_id) {
    const tokens = (TOPUP_TOKENS as Record<string, number>)[pack_id];
    if (!tokens) return;

    // Atomic token increment via RPC
    await supabaseAdmin.rpc('increment_tokens', {
      p_user_id: user_id,
      p_account_type: 'creator',
      p_amount: tokens,
    });

    // Log transaction
    await supabaseAdmin.from('token_transactions').insert({
      user_id,
      account_type: 'creator',
      action: `topup_${pack_id}`,
      amount: tokens,
      description: `Purchased ${tokens} token top-up pack`,
    });

    return;
  }

  // Handle new subscription — tokens are credited via invoice.paid event
  // Just create the subscription record here
  if (session.subscription && tier) {
    const tierTokens = TIER_TOKENS as Record<string, Record<string, number>>;
    const tokenAmount = tierTokens[account_type]?.[tier] || 0;

    // Create subscription record
    await supabaseAdmin.from('subscriptions').insert({
      user_id,
      account_type,
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: session.subscription as string,
      tier,
      status: 'active',
      monthly_token_allowance: tokenAmount,
    });

    // Update profile tier + stripe_customer_id
    await supabaseAdmin
      .from(profileTable)
      .update({
        subscription_tier: tier,
        stripe_customer_id: session.customer as string,
      })
      .eq('id', user_id);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleInvoicePaid(invoice: any) {
  // This fires on every successful payment including renewals
  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;

  // Get subscription details from our DB
  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (!sub) return;

  // Get the Stripe subscription for period dates
  const stripeSub = await stripe.subscriptions.retrieve(subscriptionId) as any;

  // Update subscription period
  await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'active',
      current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
      current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', sub.id);

  // Credit monthly tokens — reset to tier allowance (no rollover)
  const tokens = sub.monthly_token_allowance;
  const profileTable = sub.account_type === 'brand' ? 'brand_profiles' : 'creator_profiles';

  await supabaseAdmin
    .from(profileTable)
    .update({ token_balance: tokens })
    .eq('id', sub.user_id);

  // Log transaction
  await supabaseAdmin.from('token_transactions').insert({
    user_id: sub.user_id,
    account_type: sub.account_type,
    action: 'subscription_renewal',
    amount: tokens,
    description: `Monthly token refresh — ${sub.tier} plan (${tokens} tokens)`,
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handlePaymentFailed(invoice: any) {
  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;

  await supabaseAdmin
    .from('subscriptions')
    .update({ status: 'past_due', updated_at: new Date().toISOString() })
    .eq('stripe_subscription_id', subscriptionId);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSubscriptionUpdated(subscription: any) {
  const { user_id, account_type, tier } = subscription.metadata || {};
  if (!user_id) return;

  const tierTokens = TIER_TOKENS as Record<string, Record<string, number>>;
  const tokenAmount = tierTokens[account_type]?.[tier] || 0;
  const profileTable = account_type === 'brand' ? 'brand_profiles' : 'creator_profiles';

  // Update subscription record
  await supabaseAdmin
    .from('subscriptions')
    .update({
      tier: tier || 'free',
      status: subscription.status === 'active' ? 'active' : subscription.status,
      monthly_token_allowance: tokenAmount,
      cancel_at_period_end: subscription.cancel_at_period_end,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  // Update profile tier
  await supabaseAdmin
    .from(profileTable)
    .update({ subscription_tier: tier || 'free' })
    .eq('id', user_id);

  // If this is a tier change (upgrade), immediately set new token balance
  if (tokenAmount > 0) {
    await supabaseAdmin
      .from(profileTable)
      .update({ token_balance: tokenAmount })
      .eq('id', user_id);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSubscriptionDeleted(subscription: any) {
  const { user_id, account_type } = subscription.metadata || {};
  if (!user_id) return;

  const profileTable = account_type === 'brand' ? 'brand_profiles' : 'creator_profiles';

  // Mark subscription as canceled
  await supabaseAdmin
    .from('subscriptions')
    .update({ status: 'canceled', updated_at: new Date().toISOString() })
    .eq('stripe_subscription_id', subscription.id);

  // Revert profile to free tier
  await supabaseAdmin
    .from(profileTable)
    .update({ subscription_tier: 'free' })
    .eq('id', user_id);
}
