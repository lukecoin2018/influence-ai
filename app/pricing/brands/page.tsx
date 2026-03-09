'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Coins } from 'lucide-react';

const BRAND_PLANS = [
  {
    tier: 'trial',
    name: 'Free Trial',
    tokens: 100,
    tokenLabel: '100 tokens',
    price: null,
    priceLabel: 'Free',
    period: '1 week',
    description: 'Full tool access for 1 week to explore the platform.',
    popular: false,
    perks: ['Access all brand tools', 'Search & discover creators', 'Send collaboration requests', '100 one-time tokens'],
  },
  {
    tier: 'starter',
    name: 'Starter',
    tokens: 400,
    tokenLabel: '400 tokens/mo',
    price: '$99',
    priceLabel: '$99',
    period: '/mo',
    description: 'For getting started with influencer marketing.',
    popular: false,
    perks: ['Everything in Free Trial', '400 tokens every month', 'Priority search results', 'Campaign analytics'],
  },
  {
    tier: 'growth',
    name: 'Growth',
    tokens: 1200,
    tokenLabel: '1,200 tokens/mo',
    price: '$299',
    priceLabel: '$299',
    period: '/mo',
    description: 'For brands running regular influencer campaigns.',
    popular: true,
    perks: ['Everything in Starter', '1,200 tokens every month', 'Advanced creator matching', 'Bulk campaign tools', 'Dedicated support'],
  },
  {
    tier: 'pro',
    name: 'Pro',
    tokens: 3000,
    tokenLabel: '3,000 tokens/mo',
    price: '$499',
    priceLabel: '$499',
    period: '/mo',
    description: 'Full access for high-volume campaign management.',
    popular: false,
    perks: ['Everything in Growth', '3,000 tokens every month', 'API access', 'Custom integrations', 'Priority support'],
  },
];


export default function BrandPricingPage() {
  const [currentTier, setCurrentTier] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function fetchSubscription() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setIsLoggedIn(false);
        return;
      }

      setIsLoggedIn(true);

      const { data: profile } = await supabase
        .from('brand_profiles')
        .select('subscription_tier, trial_ends_at')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        if (
          profile.subscription_tier === 'trial' &&
          profile.trial_ends_at &&
          new Date(profile.trial_ends_at) < new Date()
        ) {
          setCurrentTier('trial_expired');
        } else {
          setCurrentTier(profile.subscription_tier || 'free');
        }
      }
    }

    fetchSubscription();
  }, []);

  async function handleSubscribe(tier: string) {
    if (!isLoggedIn) {
      router.push('/login?redirect=/pricing/brands');
      return;
    }

    if (tier === 'trial') return;

    setLoading(tier);

    try {
      const res = await fetch('/api/checkout/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountType: 'brand', tier }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('Checkout error:', data.error);
        alert(data.error || 'Something went wrong');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(null);
    }
  }

  async function handleManageSubscription() {
    setLoading('manage');
    try {
      const res = await fetch('/api/subscription/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountType: 'brand' }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('Portal error:', data.error);
      }
    } catch (err) {
      console.error('Portal error:', err);
    } finally {
      setLoading(null);
    }
  }

  const isSubscribed = currentTier && !['free', 'trial', 'trial_expired'].includes(currentTier);

  return (
    <div style={{ backgroundColor: '#FAFAFA', minHeight: '100vh', paddingBottom: '80px' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', padding: '64px 24px 48px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '999px', backgroundColor: '#EBF5FF', marginBottom: '16px' }}>
          <Coins size={14} color="#3AAFF4" />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#3AAFF4' }}>Brand Plans</span>
        </div>
        <h1 style={{ fontSize: '40px', fontWeight: 800, color: '#3A3A3A', margin: '0 0 12px', letterSpacing: '-0.02em' }}>
          Simple, Transparent Pricing
        </h1>
        <p style={{ fontSize: '16px', color: '#6B7280', margin: '0 auto', maxWidth: '500px', lineHeight: 1.6 }}>
          Subscribe to get monthly tokens and full access to all brand tools. No hidden fees.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '12px' }}>
          New accounts receive <strong style={{ color: '#3A3A3A' }}>100 free tokens</strong> and a 1-week free trial on signup.
        </p>

        {/* Trial expired banner */}
        {currentTier === 'trial_expired' && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '10px 20px', borderRadius: '10px',
            backgroundColor: '#FFFBEB', border: '1px solid #FDE68A',
            marginTop: '20px', fontSize: '14px', color: '#92400E',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Your free trial has ended. Subscribe to continue using InfluenceIT.
          </div>
        )}

        {/* Manage subscription link */}
        {isSubscribed && (
          <div style={{ marginTop: '20px' }}>
            <button
              onClick={handleManageSubscription}
              disabled={loading === 'manage'}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                fontSize: '14px', fontWeight: 600, color: '#3AAFF4',
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 0,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
              {loading === 'manage' ? 'Opening...' : 'Manage Subscription'}
            </button>
          </div>
        )}
      </div>

      {/* Plan Cards */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        {BRAND_PLANS.map((plan) => {
          const isCurrentPlan = currentTier === plan.tier && currentTier !== 'trial_expired';
          const isTrialExpired = currentTier === 'trial_expired' && plan.tier === 'trial';

          return (
            <div key={plan.tier} style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              border: plan.popular ? '2px solid #3AAFF4' : '1px solid #E5E7EB',
              padding: '28px',
              position: 'relative',
              boxShadow: plan.popular ? '0 4px 24px rgba(58,175,244,0.15)' : '0 1px 4px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column' as const,
            }}>
              {/* Popular badge */}
              {plan.popular && (
                <div style={{
                  position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)',
                  backgroundColor: '#3AAFF4', borderRadius: '999px',
                  padding: '4px 14px', fontSize: '12px', fontWeight: 700, color: 'white',
                  whiteSpace: 'nowrap',
                }}>
                  Most Popular
                </div>
              )}

              {/* Current plan badge */}
              {isCurrentPlan && (
                <div style={{
                  position: 'absolute', top: '-13px', right: '16px',
                  backgroundColor: '#FFD700', borderRadius: '999px',
                  padding: '4px 14px', fontSize: '12px', fontWeight: 700, color: '#3A3A3A',
                  whiteSpace: 'nowrap',
                }}>
                  Current Plan
                </div>
              )}

              {/* Tier label */}
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#3AAFF4', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {plan.name}
              </p>
              <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 16px', lineHeight: 1.5 }}>
                {plan.description}
              </p>

              {/* Price */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '4px' }}>
                <span style={{ fontSize: '42px', fontWeight: 800, color: '#3A3A3A', lineHeight: 1 }}>
                  {plan.price || '$0'}
                </span>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#9CA3AF' }}>
                  {plan.period}
                </span>
              </div>

              {/* Token amount */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '20px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3AAFF4' }} />
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#3AAFF4' }}>{plan.tokenLabel}</span>
              </div>

              {/* Perks */}
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '8px', marginBottom: '24px', flex: 1 }}>
                {plan.perks.map((perk) => (
                  <div key={perk} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '16px', height: '16px', borderRadius: '50%',
                      backgroundColor: '#EFF6FF',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#3AAFF4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                    <span style={{ fontSize: '13px', color: '#374151' }}>{perk}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              {plan.tier === 'trial' ? (
                <button disabled style={{
                  width: '100%', padding: '11px',
                  borderRadius: '10px', border: 'none',
                  backgroundColor: '#F3F4F6', color: '#9CA3AF',
                  fontSize: '14px', fontWeight: 600, cursor: 'not-allowed',
                }}>
                  {isTrialExpired ? 'Trial Expired' : 'Included on Signup'}
                </button>
              ) : (
                <button
                  onClick={() => handleSubscribe(plan.tier)}
                  disabled={isCurrentPlan || loading === plan.tier}
                  style={{
                    width: '100%', padding: '11px',
                    borderRadius: '10px', border: 'none',
                    backgroundColor: isCurrentPlan
                      ? '#F3F4F6'
                      : plan.popular
                      ? '#3AAFF4'
                      : '#3A3A3A',
                    color: isCurrentPlan ? '#9CA3AF' : 'white',
                    fontSize: '14px', fontWeight: 600,
                    cursor: isCurrentPlan ? 'not-allowed' : 'pointer',
                    opacity: loading === plan.tier ? 0.7 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  {loading === plan.tier
                    ? 'Redirecting...'
                    : isCurrentPlan
                    ? 'Current Plan'
                    : 'Get Started'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom note */}
      <div style={{ textAlign: 'center', marginTop: '40px' }}>
        <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '0 0 4px' }}>
          All plans include full access to every brand tool. Tokens reset monthly — unused tokens do not roll over.
        </p>
      </div>
    </div>
  );
}
