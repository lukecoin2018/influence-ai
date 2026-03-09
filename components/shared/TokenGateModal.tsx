'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface TokenGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountType: 'brand' | 'creator';
  subscriptionTier?: string | null;
  tokenBalance?: number;
  trialExpired?: boolean;
}

export default function TokenGateModal({
  isOpen,
  onClose,
  accountType,
  subscriptionTier = 'free',
  tokenBalance = 0,
  trialExpired = false,
}: TokenGateModalProps) {
  const router = useRouter();
  const [topUpLoading, setTopUpLoading] = useState<string | null>(null);

  if (!isOpen) return null;

  const tier = subscriptionTier || 'free';
  const isFreeUser = tier === 'free' || tier === 'trial';
  const isSubscribed = !isFreeUser && tier !== 'trial_expired';

  // Determine the modal state
  const getModalState = () => {
    // Brand: trial expired
    if (accountType === 'brand' && (trialExpired || tier === 'trial_expired')) {
      return 'brand_trial_expired';
    }
    // Free user with no tokens
    if (isFreeUser && tokenBalance <= 0) {
      return 'free_no_tokens';
    }
    // Subscribed brand with no tokens → upgrade
    if (accountType === 'brand' && isSubscribed && tokenBalance <= 0) {
      return 'brand_subscribed_no_tokens';
    }
    // Subscribed creator with no tokens → topup or upgrade
    if (accountType === 'creator' && isSubscribed && tokenBalance <= 0) {
      return 'creator_subscribed_no_tokens';
    }
    // Fallback
    return 'free_no_tokens';
  };

  const modalState = getModalState();

  async function handleTopUp(packId: string) {
    setTopUpLoading(packId);
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
        alert(data.error || 'Something went wrong');
      }
    } catch {
      alert('Something went wrong. Please try again.');
    } finally {
      setTopUpLoading(null);
    }
  }

  const pricingUrl = `/pricing/${accountType}s`;

  const nextTierMap: Record<string, { name: string; tokens: string }> = {
    // Brand tiers
    starter: { name: 'Growth', tokens: '1,200' },
    growth: { name: 'Pro', tokens: '3,000' },
    pro: { name: 'Pro', tokens: '3,000' }, // Already max
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[#1A1A1A] rounded-2xl border border-gray-800 p-6 sm:p-8 max-w-md w-full shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center ${
              modalState === 'brand_trial_expired'
                ? 'bg-yellow-900/30'
                : 'bg-[#FFD700]/10'
            }`}
          >
            <svg
              className={`w-7 h-7 ${
                modalState === 'brand_trial_expired'
                  ? 'text-yellow-400'
                  : 'text-[#FFD700]'
              }`}
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <circle cx="12" cy="12" r="10" opacity="0.2" />
              <circle cx="12" cy="12" r="6" />
            </svg>
          </div>
        </div>

        {/* ===== Brand: Trial Expired ===== */}
        {modalState === 'brand_trial_expired' && (
          <>
            <h2 className="text-xl font-bold text-white text-center mb-2">
              Your trial has ended
            </h2>
            <p className="text-sm text-gray-400 text-center mb-6">
              Subscribe to a plan to continue using InfluenceIT and get fresh
              tokens every month.
            </p>
            <button
              onClick={() => router.push(pricingUrl)}
              className="w-full py-3 rounded-xl bg-[#3AAFF4] text-black font-semibold hover:bg-[#5bc0ff] transition-colors cursor-pointer"
            >
              View Brand Plans
            </button>
          </>
        )}

        {/* ===== Free User: No Tokens ===== */}
        {modalState === 'free_no_tokens' && (
          <>
            <h2 className="text-xl font-bold text-white text-center mb-2">
              You&apos;re out of tokens
            </h2>
            <p className="text-sm text-gray-400 text-center mb-6">
              Subscribe to get tokens every month and keep using all{' '}
              {accountType === 'brand' ? 'brand' : 'creator'} tools.
            </p>
            <button
              onClick={() => router.push(pricingUrl)}
              className={`w-full py-3 rounded-xl font-semibold transition-colors cursor-pointer ${
                accountType === 'brand'
                  ? 'bg-[#3AAFF4] text-black hover:bg-[#5bc0ff]'
                  : 'bg-[#FF4D94] text-white hover:bg-[#ff6faa]'
              }`}
            >
              View Plans
            </button>
          </>
        )}

        {/* ===== Brand Subscribed: No Tokens ===== */}
        {modalState === 'brand_subscribed_no_tokens' && (
          <>
            <h2 className="text-xl font-bold text-white text-center mb-2">
              You&apos;ve used all your tokens
            </h2>
            <p className="text-sm text-gray-400 text-center mb-2">
              Your tokens will refresh at the start of your next billing cycle.
            </p>
            {tier !== 'pro' && nextTierMap[tier] && (
              <p className="text-sm text-gray-400 text-center mb-6">
                Or upgrade to{' '}
                <span className="text-[#FFD700] font-medium">
                  {nextTierMap[tier].name}
                </span>{' '}
                for {nextTierMap[tier].tokens} tokens/month.
              </p>
            )}
            <button
              onClick={() => router.push(pricingUrl)}
              className="w-full py-3 rounded-xl bg-[#3AAFF4] text-black font-semibold hover:bg-[#5bc0ff] transition-colors cursor-pointer"
            >
              {tier === 'pro' ? 'View Plans' : 'Upgrade Plan'}
            </button>
          </>
        )}

        {/* ===== Creator Subscribed: No Tokens ===== */}
        {modalState === 'creator_subscribed_no_tokens' && (
          <>
            <h2 className="text-xl font-bold text-white text-center mb-2">
              You&apos;ve used all your tokens
            </h2>
            <p className="text-sm text-gray-400 text-center mb-6">
              Buy a top-up pack to keep going, or upgrade your plan for more
              monthly tokens.
            </p>

            {/* Top-up buttons */}
            <div className="space-y-3 mb-4">
              <button
                onClick={() => handleTopUp('creator_100')}
                disabled={topUpLoading === 'creator_100'}
                className="w-full py-3 rounded-xl bg-white/10 text-white font-medium border border-white/20 hover:bg-white/20 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-between px-4"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#FFD700]" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="10" opacity="0.2" />
                    <circle cx="12" cy="12" r="6" />
                  </svg>
                  100 tokens
                </span>
                <span className="text-gray-400">
                  {topUpLoading === 'creator_100' ? 'Loading...' : '$15'}
                </span>
              </button>

              <button
                onClick={() => handleTopUp('creator_250')}
                disabled={topUpLoading === 'creator_250'}
                className="w-full py-3 rounded-xl bg-white/10 text-white font-medium border border-white/20 hover:bg-white/20 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-between px-4"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#FFD700]" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="10" opacity="0.2" />
                    <circle cx="12" cy="12" r="6" />
                  </svg>
                  250 tokens
                  <span className="text-[10px] bg-[#FFD700] text-black px-1.5 py-0.5 rounded-full font-bold">
                    BEST VALUE
                  </span>
                </span>
                <span className="text-gray-400">
                  {topUpLoading === 'creator_250' ? 'Loading...' : '$30'}
                </span>
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 border-t border-gray-700" />
              <span className="text-xs text-gray-500 uppercase">or</span>
              <div className="flex-1 border-t border-gray-700" />
            </div>

            {/* Upgrade CTA */}
            <button
              onClick={() => router.push(pricingUrl)}
              className="w-full py-3 rounded-xl bg-[#FF4D94] text-white font-semibold hover:bg-[#ff6faa] transition-colors cursor-pointer"
            >
              Upgrade Plan
            </button>
          </>
        )}

        {/* Dismiss link */}
        <button
          onClick={onClose}
          className="w-full mt-3 py-2 text-center text-sm text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
