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
  // The route now returns 403 until the claim is verified. Tracked separately
  // from `data` because the old code fed the error body straight into setData,
  // so a non-2xx produced an object with no `matches` and the page rendered
  // undefined into BrandsHiring.
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (!creatorProfile || !creatorProfile.creator_id) {
      setDataLoading(false);
      return;
    }

    setDataLoading(true);
    setBlocked(false);
    fetch('/api/creator/brand-matches')
      .then(async (res) => {
        if (!res.ok) {
          setBlocked(true);
          return null;
        }
        return res.json();
      })
      .then((json) => setData(json))
      .catch(() => setBlocked(true))
      .finally(() => setDataLoading(false));
  }, [creatorProfile?.creator_id]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <p style={{ color: '#9CA3AF' }}>{t.common.loading}</p>
    </div>
  );
  if (!user) { window.location.href = '/login'; return null; }
  if (userRole !== 'creator') { window.location.href = '/dashboard'; return null; }
  // Not the "no matches" card: that one says we looked and found nothing. Here
  // we didn't look. The layout's verification gate renders over this with the
  // CTA, so this only has to be calm and true rather than a stuck spinner.
  if (blocked) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '24px' }}>
      <p style={{ color: '#9CA3AF', maxWidth: 420, textAlign: 'center' }}>
        {t.overview.pendingVerificationBody}
      </p>
    </div>
  );
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
