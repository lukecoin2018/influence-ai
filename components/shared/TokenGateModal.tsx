'use client';

import { Lock, X } from 'lucide-react';
import { useState } from 'react';

interface TokenGateModalProps {
  // Original props (used by existing tools)
  balance: number;
  needed: number;
  toolName: string;
  onDismiss: () => void;
  accountType?: 'brand' | 'creator';
  // New subscription-aware props (optional)
  subscriptionTier?: string | null;
  trialExpired?: boolean;
}

export function TokenGateModal({
  balance,
  needed,
  toolName,
  onDismiss,
  accountType = 'brand',
  subscriptionTier,
  trialExpired = false,
}: TokenGateModalProps) {
  const [topUpLoading, setTopUpLoading] = useState<string | null>(null);

  const tier = subscriptionTier || 'free';
  const isFreeUser = tier === 'free' || tier === 'trial';
  const isSubscribed = !isFreeUser && tier !== 'trial_expired';

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

  const pricingUrl = accountType === 'creator' ? '/pricing/creators' : '/pricing/brands';

  // Determine what to show based on subscription status
  const showTrialExpired = accountType === 'brand' && (trialExpired || tier === 'trial_expired');
  const showCreatorTopUp = accountType === 'creator' && isSubscribed;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      backgroundColor: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '380px',
        width: '100%',
        boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
        position: 'relative',
      }}>
        {/* Close */}
        <button
          onClick={onDismiss}
          style={{
            position: 'absolute', top: '16px', right: '16px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#9CA3AF', padding: '4px',
          }}
        >
          <X size={18} />
        </button>

        {/* Icon */}
        <div style={{
          width: '52px', height: '52px', borderRadius: '14px',
          backgroundColor: showTrialExpired ? '#FEE2E2' : '#FEF3C7',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <Lock size={24} color={showTrialExpired ? '#DC2626' : '#92400E'} />
        </div>

        {/* ===== Brand: Trial Expired ===== */}
        {showTrialExpired && (
          <>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#3A3A3A', margin: '0 0 8px', textAlign: 'center' }}>
              Your trial has ended
            </h2>
            <p style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 24px', textAlign: 'center', lineHeight: 1.5 }}>
              Subscribe to a plan to continue using InfluenceIT and get fresh tokens every month.
            </p>
            <a
              href={pricingUrl}
              style={{
                display: 'block', width: '100%', padding: '12px',
                backgroundColor: '#3AAFF4', borderRadius: '10px',
                fontSize: '15px', fontWeight: 700, color: 'white',
                textDecoration: 'none', textAlign: 'center',
                marginBottom: '10px', boxSizing: 'border-box',
              }}
            >
              View Brand Plans
            </a>
          </>
        )}

        {/* ===== Creator Subscribed: Show top-up + upgrade ===== */}
        {!showTrialExpired && showCreatorTopUp && (
          <>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#3A3A3A', margin: '0 0 8px', textAlign: 'center' }}>
              You&apos;re out of tokens
            </h2>
            <p style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 6px', textAlign: 'center', lineHeight: 1.5 }}>
              Using <strong>{toolName}</strong> costs <strong>{needed} tokens</strong>.
            </p>
            <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '0 0 20px', textAlign: 'center' }}>
              Your balance: <strong>{balance} tokens</strong>
            </p>

            {/* Top-up buttons */}
            <button
              onClick={() => handleTopUp('creator_100')}
              disabled={topUpLoading === 'creator_100'}
              style={{
                display: 'flex', width: '100%', padding: '12px 14px',
                alignItems: 'center', justifyContent: 'space-between',
                backgroundColor: '#F9FAFB', borderRadius: '10px',
                border: '1px solid #E5E7EB', cursor: 'pointer',
                marginBottom: '8px', opacity: topUpLoading === 'creator_100' ? 0.7 : 1,
              }}
            >
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#3A3A3A' }}>🪙 100 tokens</span>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#3A3A3A' }}>
                {topUpLoading === 'creator_100' ? 'Loading...' : '$15'}
              </span>
            </button>

            <button
              onClick={() => handleTopUp('creator_250')}
              disabled={topUpLoading === 'creator_250'}
              style={{
                display: 'flex', width: '100%', padding: '12px 14px',
                alignItems: 'center', justifyContent: 'space-between',
                backgroundColor: '#F9FAFB', borderRadius: '10px',
                border: '1px solid #E5E7EB', cursor: 'pointer',
                marginBottom: '16px', opacity: topUpLoading === 'creator_250' ? 0.7 : 1,
              }}
            >
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#3A3A3A' }}>
                🪙 250 tokens
                <span style={{
                  fontSize: '10px', fontWeight: 700, color: '#92400E',
                  backgroundColor: '#FEF3C7', padding: '2px 6px',
                  borderRadius: '999px', marginLeft: '6px',
                }}>BEST VALUE</span>
              </span>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#3A3A3A' }}>
                {topUpLoading === 'creator_250' ? 'Loading...' : '$30'}
              </span>
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '0 0 16px' }}>
              <div style={{ flex: 1, borderTop: '1px solid #E5E7EB' }} />
              <span style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase' }}>or</span>
              <div style={{ flex: 1, borderTop: '1px solid #E5E7EB' }} />
            </div>

            <a
              href={pricingUrl}
              style={{
                display: 'block', width: '100%', padding: '12px',
                backgroundColor: '#FF4D94', borderRadius: '10px',
                fontSize: '15px', fontWeight: 700, color: 'white',
                textDecoration: 'none', textAlign: 'center',
                marginBottom: '10px', boxSizing: 'border-box',
              }}
            >
              Upgrade Plan
            </a>
          </>
        )}

        {/* ===== Default: Original behavior (free users + subscribed brands) ===== */}
        {!showTrialExpired && !showCreatorTopUp && (
          <>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#3A3A3A', margin: '0 0 8px', textAlign: 'center' }}>
              You&apos;re out of tokens
            </h2>
            <p style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 6px', textAlign: 'center', lineHeight: 1.5 }}>
              Using <strong>{toolName}</strong> costs <strong>{needed} tokens</strong>.
            </p>
            <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '0 0 24px', textAlign: 'center' }}>
              Your balance: <strong>{balance} tokens</strong>
            </p>

            <a
              href={pricingUrl}
              style={{
                display: 'block', width: '100%', padding: '12px',
                backgroundColor: '#FFD700', borderRadius: '10px',
                fontSize: '15px', fontWeight: 700, color: '#3A3A3A',
                textDecoration: 'none', textAlign: 'center',
                marginBottom: '10px', boxSizing: 'border-box',
              }}
            >
              {isSubscribed ? 'Upgrade Plan' : 'Get More Tokens'}
            </a>
          </>
        )}

        <button
          onClick={onDismiss}
          style={{
            display: 'block', width: '100%', padding: '10px',
            background: 'none', border: '1px solid #E5E7EB',
            borderRadius: '10px', fontSize: '14px',
            color: '#6B7280', cursor: 'pointer',
          }}
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
