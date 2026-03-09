'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const CREATOR_PLANS = [
  {
    tier: 'free',
    name: 'Free',
    price: '$0',
    period: '',
    tokens: 100,
    tokenLabel: '100 tokens (one-time)',
    description: 'Try all tools',
    features: [
      'Access all creator tools',
      'Build your media kit',
      'Browse brand opportunities',
      '100 one-time tokens',
    ],
    cta: 'Current Plan',
    highlighted: false,
  },
  {
    tier: 'starter',
    name: 'Starter',
    price: '$19',
    period: '/mo',
    tokens: 150,
    tokenLabel: '150 tokens/mo',
    description: 'For creators managing a few deals',
    features: [
      'Everything in Free',
      '150 tokens every month',
      'Priority in brand search',
      'Deal negotiation tools',
    ],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    tier: 'active',
    name: 'Active',
    price: '$49',
    period: '/mo',
    tokens: 500,
    tokenLabel: '500 tokens/mo',
    description: 'Full tool access at scale',
    features: [
      'Everything in Starter',
      '500 tokens every month',
      'Advanced analytics',
      'Bulk proposal tools',
      'Priority support',
    ],
    cta: 'Get Started',
    highlighted: true,
    badge: 'Most Popular',
  },
];

const TOPUP_PACKS = [
  {
    packId: 'creator_100',
    tokens: 100,
    price: '$15',
    pricePerToken: '$0.15',
  },
  {
    packId: 'creator_250',
    tokens: 250,
    price: '$30',
    pricePerToken: '$0.12',
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
    <div className="min-h-screen bg-[#0F0F0F] text-white">
      {/* Header */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 text-center">
        <p className="text-sm font-semibold tracking-widest uppercase text-[#FF4D94] mb-4">
          Creator Plans
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
          Grow your brand deals,{' '}
          <span className="text-[#FFD700]">your way</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto">
          Every plan includes full access to all creator tools. Pick the token
          volume that matches your hustle.
        </p>

        {isSubscribed && (
          <div className="mt-6">
            <button
              onClick={handleManageSubscription}
              disabled={loading === 'manage'}
              className="inline-flex items-center gap-2 text-sm text-[#FF4D94] hover:text-[#ff6faa] transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {loading === 'manage' ? 'Opening...' : 'Manage Subscription'}
            </button>
          </div>
        )}
      </div>

      {/* Pricing Cards */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {CREATOR_PLANS.map((plan) => {
            const isCurrentPlan = currentTier === plan.tier;

            return (
              <div
                key={plan.tier}
                className={`relative rounded-2xl p-6 flex flex-col transition-all duration-200 ${
                  plan.highlighted
                    ? 'bg-gradient-to-b from-[#FF4D94]/10 to-[#FF4D94]/5 border-2 border-[#FF4D94]/40 shadow-lg shadow-[#FF4D94]/10'
                    : 'bg-[#1A1A1A] border border-gray-800 hover:border-gray-700'
                }`}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-[#FF4D94] text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                      {plan.badge}
                    </span>
                  </div>
                )}

                {/* Current plan indicator */}
                {isCurrentPlan && (
                  <div className="absolute -top-3 right-4">
                    <span className="bg-[#FFD700] text-black text-xs font-bold px-3 py-1 rounded-full">
                      Current Plan
                    </span>
                  </div>
                )}

                {/* Plan header */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-1">{plan.name}</h3>
                  <p className="text-sm text-gray-400">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-gray-400 text-sm">{plan.period}</span>
                  <div className="mt-2">
                    <span className="inline-flex items-center gap-1.5 text-sm text-[#FFD700] font-medium">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="12" r="10" opacity="0.2" />
                        <circle cx="12" cy="12" r="6" />
                      </svg>
                      {plan.tokenLabel}
                    </span>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-gray-300">
                      <svg className="w-4 h-4 text-[#FF4D94] mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {plan.tier === 'free' ? (
                  <div className="mt-auto">
                    <div className="w-full py-3 px-4 rounded-xl text-center text-sm font-medium bg-gray-800 text-gray-400 cursor-default">
                      Included on Signup
                    </div>
                  </div>
                ) : (
                  <div className="mt-auto">
                    <button
                      onClick={() => handleSubscribe(plan.tier)}
                      disabled={isCurrentPlan || loading === plan.tier}
                      className={`w-full py-3 px-4 rounded-xl text-center text-sm font-semibold transition-all duration-200 cursor-pointer ${
                        isCurrentPlan
                          ? 'bg-gray-800 text-gray-400 cursor-default'
                          : plan.highlighted
                          ? 'bg-[#FF4D94] text-white hover:bg-[#ff6faa] shadow-md shadow-[#FF4D94]/25'
                          : 'bg-white text-black hover:bg-gray-100'
                      } disabled:opacity-50`}
                    >
                      {loading === plan.tier
                        ? 'Redirecting...'
                        : isCurrentPlan
                        ? 'Current Plan'
                        : plan.cta}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Top-Up Section (subscribers only) */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="border-t border-gray-800 pt-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-white mb-2">Need more tokens?</h2>
            <p className="text-gray-400">
              {isSubscribed
                ? 'Top up your balance anytime. Tokens are added instantly.'
                : 'Subscribe to a plan to unlock token top-up packs.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-lg mx-auto">
            {TOPUP_PACKS.map((pack) => (
              <div
                key={pack.packId}
                className={`relative rounded-2xl p-6 flex flex-col items-center text-center transition-all duration-200 ${
                  isSubscribed
                    ? 'bg-[#1A1A1A] border border-gray-800 hover:border-[#FF4D94]/40'
                    : 'bg-[#1A1A1A]/50 border border-gray-800/50 opacity-60'
                }`}
              >
                {pack.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-[#FFD700] text-black text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                      {pack.badge}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-1.5 text-[#FFD700] mb-3">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="10" opacity="0.2" />
                    <circle cx="12" cy="12" r="6" />
                  </svg>
                  <span className="text-2xl font-bold">{pack.tokens}</span>
                  <span className="text-sm text-gray-400 ml-1">tokens</span>
                </div>

                <div className="mb-1">
                  <span className="text-3xl font-bold text-white">{pack.price}</span>
                </div>
                <p className="text-xs text-gray-500 mb-5">{pack.pricePerToken}/token</p>

                <button
                  onClick={() => handleTopUp(pack.packId)}
                  disabled={!isSubscribed || loading === pack.packId}
                  className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    isSubscribed
                      ? 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
                      : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  } disabled:opacity-50`}
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
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            All plans include full access to every creator tool. Tokens reset monthly — unused tokens do not roll over.
            Top-up tokens are also reset on renewal.
          </p>
        </div>
      </div>
    </div>
  );
}
