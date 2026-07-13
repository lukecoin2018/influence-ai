'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { BrandsHiring } from '@/components/creator-dashboard/BrandsHiring';
import type { CreatorBrandMatches } from '@/lib/reports/creator-brand-matches';

type BrandMatchesResponse = CreatorBrandMatches & { detectedNiche: string | null };

export default function BrandsHiringPage() {
  const { user, creatorProfile, userRole, loading } = useAuth();

  const [data, setData] = useState<BrandMatchesResponse | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!creatorProfile || !creatorProfile.creator_id) {
      setDataLoading(false);
      return;
    }

    setDataLoading(true);
    fetch('/api/creator/brand-matches')
      .then((res) => res.json())
      .then((json) => setData(json))
      .finally(() => setDataLoading(false));
  }, [creatorProfile?.creator_id]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <p style={{ color: '#9CA3AF' }}>Loading...</p>
    </div>
  );
  if (!user) { window.location.href = '/login'; return null; }
  if (userRole !== 'creator') { window.location.href = '/dashboard'; return null; }
  if (dataLoading || !data) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <p style={{ color: '#9CA3AF' }}>Loading your brand matches...</p>
    </div>
  );

  return (
    <BrandsHiring
      matches={data.matches}
      creatorFollowers={data.creatorFollowers}
      detectedNiche={data.detectedNiche}
    />
  );
}
