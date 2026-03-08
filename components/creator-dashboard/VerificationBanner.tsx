'use client';

// components/creator-dashboard/VerificationBanner.tsx
// Shows when creator has claim_status === 'pending'

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export function VerificationBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('creator_profiles')
        .select('claim_status')
        .eq('id', user.id)
        .single();

      if (data?.claim_status === 'pending') {
        setShow(true);
      }
    }
    check();
  }, []);

  if (!show) return null;

  return (
    <div
      style={{
        backgroundColor: '#FFFBEB',
        border: '1px solid #FDE68A',
        borderRadius: '10px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        marginBottom: '20px',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '16px' }}>⚠️</span>
        <div>
          <p
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#92400E',
              margin: 0,
            }}
          >
            Profile verification required
          </p>
          <p style={{ fontSize: '12px', color: '#A16207', margin: 0 }}>
            Complete bio verification to unlock all features and appear as
            verified.
          </p>
        </div>
      </div>
      <Link
        href="/creator-dashboard/verify"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 14px',
          borderRadius: '8px',
          backgroundColor: '#F59E0B',
          color: 'white',
          fontSize: '13px',
          fontWeight: 600,
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        Verify Now →
      </Link>
    </div>
  );
}
