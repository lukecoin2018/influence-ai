'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const BRAND_PLANS = [
  {
    tier: 'trial',
    name: 'Free Trial',
    price: '$0',
    period: '1 week',
    tokens: 100,
    tokenLabel: '100 tokens',
    description: 'Full tool access for 1 week',
    features: [
      'Access all brand tools',
      'Search & discover creators',
      'Send collaboration requests',
      '100 one-time tokens',
    ],
    cta: 'Current Plan',
    highlighted: false,
  },
  {
    tier: 'starter',
    name: 'Starter',
    price: '$99',
    period: '/mo',
    tokens: 400,
    tokenLabel: '400 tokens/mo',
    description: 'For getting started',
    features: [
      'Everything in Free Trial',
      '400 tokens every month',
      'Priority search results',
      'Campaign analytics',
    ],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    tier: 'growth',
    name: 'Growth',
    price: '$299',
    period: '/mo',
    tokens: 1200,
    tokenLabel: '1,200 tokens/mo',
    description: 'For regular campaigns',
    features: [
      'Everything in Starter',
      '1,200 tokens every month',
      'Advanced creator matching',
      'Bulk campaign tools',
      'Dedicated support',
    ],
    cta: 'Get Started',
    highlighted: true,
    badge: 'Most Popular',
  },
  {
    tier: 'pro',
    name: 'Pro',
    price: '$499',
    period: '/mo',
    tokens: 3000,
    tokenLabel: '3,000 tokens/mo',
    description: 'High-volume campaign management',
    features: [
      'Everything in Growth',
      '3,000 tokens every month',
      'API access',
      'Custom integrations',
      'Priority support',
    ],
    cta: 'Get Started',
    highlighted: false,
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
        // Check if trial has expired
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

    if (tier === 'trial') return; // Can't subscribe to trial

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
    <div className="min-h-screen bg-[#0F0F0F] text-white">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 text-center">
        <p className="text-sm font-semibold tracking-widest uppercase text-[#3AAFF4] mb-4">
          Brand Plans
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
          Find your perfect creators,{' '}
          <span className="text-[#FFD700]">at scale</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto">
          Every plan includes full access to all brand tools. Choose the token
          volume that fits your campaign needs.
        </p>

        {currentTier === 'trial_expired' && (
          <div className="mt-6 inline-flex items-center gap-2 bg-yellow-900/40 border border-yellow-600/50 text-yellow-200 px-5 py-3 rounded-lg text-sm">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Your free trial has ended. Subscribe to continue using InfluenceIT.
          </div>
        )}

        {isSubscribed && (
          <div className="mt-6">
            <button
              onClick={handleManageSubscription}
              disabled={loading === 'manage'}
              className="inline-flex items-center gap-2 text-sm text-[#3AAFF4] hover:text-[#5bc0ff] transition-colors cursor-pointer"
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {BRAND_PLANS.map((plan) => {
            const isCurrent = currentTier === plan.tier || (currentTier === 'trial_expired' && plan.tier === 'trial');
            const isCurrentPlan = currentTier === plan.tier && currentTier !== 'trial_expired';

            return (
              <div
                key={plan.tier}
                className={`relative rounded-2xl p-6 flex flex-col transition-all duration-200 ${
                  plan.highlighted
                    ? 'bg-gradient-to-b from-[#3AAFF4]/10 to-[#3AAFF4]/5 border-2 border-[#3AAFF4]/40 shadow-lg shadow-[#3AAFF4]/10'
                    : 'bg-[#1A1A1A] border border-gray-800 hover:border-gray-700'
                }`}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-[#3AAFF4] text-black text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
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
                      <svg className="w-4 h-4 text-[#3AAFF4] mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {plan.tier === 'trial' ? (
                  <div className="mt-auto">
                    <div className="w-full py-3 px-4 rounded-xl text-center text-sm font-medium bg-gray-800 text-gray-400 cursor-default">
                      {currentTier === 'trial_expired' ? 'Trial Expired' : 'Included on Signup'}
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
                          ? 'bg-[#3AAFF4] text-black hover:bg-[#5bc0ff] shadow-md shadow-[#3AAFF4]/25'
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

        {/* Bottom note */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            All plans include full access to every brand tool. Tokens reset monthly — unused tokens do not roll over.
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Need a custom plan?{' '}
            <a href="mailto:hello@influenceit.app" className="text-[#3AAFF4] hover:underline">
              Contact us
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
