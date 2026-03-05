'use client';

import { Lock, X } from 'lucide-react';

interface TokenGateModalProps {
  balance: number;
  needed: number;
  toolName: string;
  onDismiss: () => void;
}

export function TokenGateModal({ balance, needed, toolName, onDismiss }: TokenGateModalProps) {
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
          backgroundColor: '#FEF3C7',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <Lock size={24} color="#92400E" />
        </div>

        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#3A3A3A', margin: '0 0 8px', textAlign: 'center' }}>
          You're out of tokens
        </h2>
        <p style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 6px', textAlign: 'center', lineHeight: 1.5 }}>
          Using <strong>{toolName}</strong> costs <strong>{needed} tokens</strong>.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '0 0 24px', textAlign: 'center' }}>
          Your balance: <strong>{balance} tokens</strong>
        </p>

        <a
          href="/pricing/brands"
          style={{
            display: 'block', width: '100%', padding: '12px',
            backgroundColor: '#FFD700', borderRadius: '10px',
            fontSize: '15px', fontWeight: 700, color: '#3A3A3A',
            textDecoration: 'none', textAlign: 'center',
            marginBottom: '10px', boxSizing: 'border-box',
          }}
        >
          Get More Tokens
        </a>
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
