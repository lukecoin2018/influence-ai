'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { BrandsHiring } from '@/components/creator-dashboard/BrandsHiring';
import type { CreatorBrandMatches } from '@/lib/reports/creator-brand-matches';
import { useLocale } from '@/lib/i18n/use-locale';
import { getDashboardStrings } from '@/lib/i18n/dashboard-strings';

type BrandMatchesResponse = CreatorBrandMatches & { detectedNiche: string | null };

export default function BrandsHiringPage() {
  const { user, creatorProfile, userRole, loading } = useAuth();
  // This route owns the session, so it resolves the locale and passes it down —
  // see the `locale` prop note in BrandsHiring.tsx.
  const locale = useLocale();
  const t = getDashboardStrings(locale);

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
      <p style={{ color: '#9CA3AF' }}>{t.common.loading}</p>
    </div>
  );
  if (!user) { window.location.href = '/login'; return null; }
  if (userRole !== 'creator') { window.location.href = '/dashboard'; return null; }
  if (dataLoading || !data) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <p style={{ color: '#9CA3AF' }}>{t.brandsHiring.loadingMatches}</p>
    </div>
  );

  return (
    <BrandsHiring
      matches={data.matches}
      creatorFollowers={data.creatorFollowers}
      detectedNiche={data.detectedNiche}
      outreachBasePath="/creator-dashboard/outreach"
      locale={locale}
    />
  );
}
