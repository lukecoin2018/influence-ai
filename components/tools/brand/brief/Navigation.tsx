'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, Save } from 'lucide-react';
import { useState } from 'react';
import { TokenGateModal } from '@/components/shared/TokenGateModal';

interface NavigationProps {
  currentStep: number;
  totalSteps: number;
  nextHref?: string;
  prevHref?: string;
  onSave?: () => void;
  onContinue?: () => void;
  canProceed?: boolean;
  // Optional token gate — only charges on step 1
  tokenAction?: string;
  toolName?: string;
}

export default function Navigation({
  currentStep,
  totalSteps,
  nextHref,
  prevHref,
  onSave,
  onContinue,
  canProceed = true,
  tokenAction,
  toolName = 'this tool',
}: NavigationProps) {
  const [checking, setChecking] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [balance, setBalance] = useState(0);
  const [needed, setNeeded] = useState(0);
  const [charged, setCharged] = useState(false);

  // Token-gated continue handler — only charges on step 1
  const handleContinue = async () => {
    if (tokenAction && currentStep === 1) {
      setChecking(true);
      try {
        const res = await fetch('/api/tokens/spend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: tokenAction }),
        });
        const data = await res.json();

        if (res.status === 402) {
          setBalance(data.balance ?? 0);
          setNeeded(data.needed ?? 0);
          setBlocked(true);
          setChecking(false);
          return;
        }

        setCharged(true);
      } catch {
        // Network error — allow through silently
      } finally {
        setChecking(false);
      }
    }

    // Proceed normally
    if (onContinue) onContinue();
  };

  const continueButton = (
    <button
      onClick={handleContinue}
      disabled={!canProceed || checking}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '10px 22px', borderRadius: 8,
        fontWeight: 600, fontSize: 14, border: 'none',
        backgroundColor: canProceed && !checking ? '#FFD700' : '#F3F4F6',
        color: canProceed && !checking ? '#3A3A3A' : '#9CA3AF',
        cursor: canProceed && !checking ? 'pointer' : 'not-allowed',
        opacity: canProceed ? 1 : 0.6,
      }}
    >
      {checking ? 'Checking...' : nextHref ? 'Continue' : 'Complete'}
      <ArrowRight style={{ width: 16, height: 16 }} />
    </button>
  );

  return (
    <>
      {blocked && (
        <TokenGateModal
          balance={balance}
          needed={needed}
          toolName={toolName}
          onDismiss={() => setBlocked(false)}
        />
      )}

      <div style={{
        position: 'sticky', bottom: 0,
        backgroundColor: '#FFFFFF', borderTop: '1px solid #E5E7EB',
        padding: '14px 24px', zIndex: 10,
      }}>
        <div style={{
          maxWidth: 1280, margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>

          {/* Back / Exit */}
          <div>
            {prevHref ? (
              <Link href={prevHref} style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                color: '#6B7280', fontSize: 14, textDecoration: 'none', fontWeight: 500,
              }}>
                <ArrowLeft style={{ width: 18, height: 18 }} />
                Back
              </Link>
            ) : (
              <Link href="/" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                color: '#6B7280', fontSize: 14, textDecoration: 'none', fontWeight: 500,
              }}>
                <ArrowLeft style={{ width: 18, height: 18 }} />
                Exit
              </Link>
            )}
          </div>

          {/* Save & progress */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {onSave && (
              <button
                onClick={onSave}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'none', border: 'none',
                  color: '#3AAFF4', fontSize: 14, fontWeight: 500, cursor: 'pointer',
                }}
              >
                <Save style={{ width: 16, height: 16 }} />
                <span>Save Progress</span>
              </button>
            )}
            <span style={{ fontSize: 13, color: '#9CA3AF' }}>
              {currentStep} of {totalSteps}
            </span>
          </div>

          {/* Continue / Complete */}
          <div>
            {/* If token gate is active OR onContinue is provided, use button */}
            {(tokenAction || onContinue) ? (
              continueButton
            ) : nextHref ? (
              <Link
                href={canProceed ? nextHref : '#'}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '10px 22px', borderRadius: 8,
                  fontWeight: 600, fontSize: 14, textDecoration: 'none',
                  backgroundColor: canProceed ? '#FFD700' : '#F3F4F6',
                  color: canProceed ? '#3A3A3A' : '#9CA3AF',
                  pointerEvents: canProceed ? 'auto' : 'none',
                  opacity: canProceed ? 1 : 0.6,
                }}
              >
                Continue
                <ArrowRight style={{ width: 16, height: 16 }} />
              </Link>
            ) : (
              <button
                disabled={!canProceed}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '10px 22px', borderRadius: 8,
                  fontWeight: 600, fontSize: 14, border: 'none',
                  backgroundColor: canProceed ? '#FFD700' : '#F3F4F6',
                  color: canProceed ? '#3A3A3A' : '#9CA3AF',
                  cursor: canProceed ? 'pointer' : 'not-allowed',
                  opacity: canProceed ? 1 : 0.6,
                }}
              >
                Complete
                <ArrowRight style={{ width: 16, height: 16 }} />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
