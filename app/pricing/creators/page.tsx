'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Coins } from 'lucide-react';

const CREATOR_PLANS = [
  {
    tier: 'free',
    name: 'Free',
    tokens: 100,
    tokenLabel: '100 tokens (one-time)',
    price: null,
    priceLabel: 'Free',
    period: '',
    description: 'Try all tools and explore the platform.',
    popular: false,
    perks: ['Access all creator tools', 'Build your media kit', 'Browse brand opportunities', '100 one-time tokens'],
  },
  {
    tier: 'starter',
    name: 'Starter',
    tokens: 150,
    tokenLabel: '150 tokens/mo',
    price: '$19',
    priceLabel: '$19',
    period: '/mo',
    description: 'For creators managing a few deals.',
    popular: false,
    perks: ['Everything in Free', '150 tokens every month', 'Priority in brand search', 'Deal negotiation tools'],
  },
  {
    tier: 'active',
    name: 'Active',
    tokens: 500,
    tokenLabel: '500 tokens/mo',
    price: '$49',
    priceLabel: '$49',
    period: '/mo',
    description: 'Full tool access at scale.',
    popular: true,
    perks: ['Everything in Starter', '500 tokens every month', 'Advanced analytics', 'Bulk proposal tools', 'Priority support'],
  },
];

const TOPUP_PACKS = [
  {
    packId: 'creator_100',
    tokens: 100,
    price: '$15',
    pricePerToken: '$0.15/token',
    badge: null,
  },
  {
    packId: 'creator_250',
    tokens: 250,
    price: '$30',
    pricePerToken: '$0.12/token',
    badge: 'Best Value',
  },
];

export default function CreatorPricingPage() {
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
        .from('creator_profiles')
        .select('subscription_tier')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setCurrentTier(profile.subscription_tier || 'free');
      }
    }

    fetchSubscription();
  }, []);

  async function handleSubscribe(tier: string) {
    if (!isLoggedIn) {
      router.push('/login?redirect=/pricing/creators');
      return;
    }

    if (tier === 'free') return;

    setLoading(tier);

    try {
      const res = await fetch('/api/checkout/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountType: 'creator', tier }),
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

  async function handleTopUp(packId: string) {
    if (!isLoggedIn) {
      router.push('/login?redirect=/pricing/creators');
      return;
    }

    setLoading(packId);

    try {
      const res = await fetch('/api/checkout/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('Top-up error:', data.error);
        alert(data.error || 'Something went wrong');
      }
    } catch (err) {
      console.error('Top-up error:', err);
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
        body: JSON.stringify({ accountType: 'creator' }),
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

  const isSubscribed = currentTier && !['free'].includes(currentTier);

  return (
    <div style={{ backgroundColor: '#FAFAFA', minHeight: '100vh', paddingBottom: '80px' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', padding: '64px 24px 48px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '999px', backgroundColor: '#FFF0F6', marginBottom: '16px' }}>
          <Coins size={14} color="#FF4D94" />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#FF4D94' }}>Creator Plans</span>
        </div>
        <h1 style={{ fontSize: '40px', fontWeight: 800, color: '#3A3A3A', margin: '0 0 12px', letterSpacing: '-0.02em' }}>
          Grow Your Brand Deals
        </h1>
        <p style={{ fontSize: '16px', color: '#6B7280', margin: '0 auto', maxWidth: '500px', lineHeight: 1.6 }}>
          Subscribe to get monthly tokens and full access to all creator tools. Pick the plan that matches your hustle.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '12px' }}>
          New accounts receive <strong style={{ color: '#3A3A3A' }}>100 free tokens</strong> on signup.
        </p>

        {/* Manage subscription link */}
        {isSubscribed && (
          <div style={{ marginTop: '20px' }}>
            <button
              onClick={handleManageSubscription}
              disabled={loading === 'manage'}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                fontSize: '14px', fontWeight: 600, color: '#FF4D94',
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
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
        {CREATOR_PLANS.map((plan) => {
          const isCurrentPlan = currentTier === plan.tier;

          return (
            <div key={plan.tier} style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              border: plan.popular ? '2px solid #FF4D94' : '1px solid #E5E7EB',
              padding: '28px',
              position: 'relative',
              boxShadow: plan.popular ? '0 4px 24px rgba(255,77,148,0.15)' : '0 1px 4px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column' as const,
            }}>
              {/* Popular badge */}
              {plan.popular && (
                <div style={{
                  position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)',
                  backgroundColor: '#FF4D94', borderRadius: '999px',
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
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#FF4D94', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
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
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#FF4D94' }} />
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#FF4D94' }}>{plan.tokenLabel}</span>
              </div>

              {/* Perks */}
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '8px', marginBottom: '24px', flex: 1 }}>
                {plan.perks.map((perk) => (
                  <div key={perk} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '16px', height: '16px', borderRadius: '50%',
                      backgroundColor: '#FFF0F6',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#FF4D94" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                    <span style={{ fontSize: '13px', color: '#374151' }}>{perk}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              {plan.tier === 'free' ? (
                <button disabled style={{
                  width: '100%', padding: '11px',
                  borderRadius: '10px', border: 'none',
                  backgroundColor: '#F3F4F6', color: '#9CA3AF',
                  fontSize: '14px', fontWeight: 600, cursor: 'not-allowed',
                }}>
                  Included on Signup
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
                      ? '#FF4D94'
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

      {/* Top-Up Section */}
      <div style={{ maxWidth: '540px', margin: '56px auto 0', padding: '0 24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#3A3A3A', margin: '0 0 6px', textAlign: 'center' }}>
          Need more tokens?
        </h2>
        <p style={{ fontSize: '14px', color: '#9CA3AF', margin: '0 0 20px', textAlign: 'center' }}>
          {isSubscribed
            ? 'Top up your balance anytime. Tokens are added instantly.'
            : 'Subscribe to a plan to unlock token top-up packs.'}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {TOPUP_PACKS.map((pack) => (
            <div key={pack.packId} style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              border: '1px solid #E5E7EB',
              padding: '20px',
              textAlign: 'center',
              position: 'relative',
              opacity: isSubscribed ? 1 : 0.5,
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}>
              {pack.badge && (
                <div style={{
                  position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)',
                  backgroundColor: '#FFD700', borderRadius: '999px',
                  padding: '3px 12px', fontSize: '11px', fontWeight: 700, color: '#3A3A3A',
                  whiteSpace: 'nowrap',
                }}>
                  {pack.badge}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#FF4D94' }} />
                <span style={{ fontSize: '24px', fontWeight: 800, color: '#3A3A3A' }}>{pack.tokens}</span>
                <span style={{ fontSize: '13px', color: '#6B7280' }}>tokens</span>
              </div>

              <p style={{ fontSize: '28px', fontWeight: 800, color: '#3A3A3A', margin: '0 0 2px' }}>{pack.price}</p>
              <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '0 0 16px' }}>{pack.pricePerToken}</p>

              <button
                onClick={() => handleTopUp(pack.packId)}
                disabled={!isSubscribed || loading === pack.packId}
                style={{
                  width: '100%', padding: '9px',
                  borderRadius: '8px',
                  border: isSubscribed ? '1px solid #E5E7EB' : 'none',
                  backgroundColor: isSubscribed ? 'white' : '#F3F4F6',
                  color: isSubscribed ? '#3A3A3A' : '#9CA3AF',
                  fontSize: '13px', fontWeight: 600,
                  cursor: isSubscribed ? 'pointer' : 'not-allowed',
                  opacity: loading === pack.packId ? 0.7 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                {loading === pack.packId
                  ? 'Redirecting...'
                  : isSubscribed
                  ? 'Buy Now'
                  : 'Subscribe First'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom note */}
      <div style={{ textAlign: 'center', marginTop: '40px' }}>
        <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '0 0 4px' }}>
          All plans include full access to every creator tool. Tokens reset monthly — unused tokens do not roll over.
        </p>
      </div>
    </div>
  );
}
