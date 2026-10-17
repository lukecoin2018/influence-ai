'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

/**
 * What /admin shows an account that is an admin but may not use it right now,
 * rendered by app/admin/layout.tsx in place of the admin chrome.
 *
 *   paused      the owner has blocked this additional admin
 *   unverified  the admin check could not be made (auth or the admin_users
 *               lookup failed or timed out), so access is denied for now
 *
 * A screen rather than a silent redirect to /: a redirect looks like a bug,
 * which is how the first owner lockout went undiagnosed.
 */
export default function AdminAccessScreen({ state }: { state: 'paused' | 'unverified' }) {
  const { signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const paused = state === 'paused';

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: '#FAFAFA',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div style={{ width: '100%', maxWidth: '460px', textAlign: 'center' }}>
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            padding: '44px 36px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
            border: '1px solid #E5E7EB',
          }}
        >
          <div style={{ fontSize: '44px', marginBottom: '18px' }} aria-hidden="true">
            {paused ? '⏸️' : '⚠️'}
          </div>

          <h1
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: '#3A3A3A',
              margin: '0 0 12px 0',
              letterSpacing: '-0.02em',
            }}
          >
            {paused ? 'Your admin access is paused' : 'We could not confirm your admin access'}
          </h1>

          <p style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 28px 0', lineHeight: 1.65 }}>
            {paused
              ? 'The account owner has paused admin access for this account. Once they restore it, reload this page; you will not need to sign in again.'
              : 'This is usually temporary. Reload the page in a moment.'}
          </p>

          {!paused && (
            <button
              onClick={() => window.location.reload()}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '10px',
                backgroundColor: '#FFD700',
                color: '#3A3A3A',
                fontSize: '15px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                marginBottom: '18px',
              }}
            >
              Reload
            </button>
          )}

          <button
            onClick={() => { if (!signingOut) { setSigningOut(true); signOut(); } }}
            disabled={signingOut}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '13px',
              color: '#9CA3AF',
              cursor: signingOut ? 'default' : 'pointer',
            }}
          >
            {signingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      </div>
    </main>
  );
}
