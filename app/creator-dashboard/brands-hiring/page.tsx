'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { BrandsHiring } from '@/components/creator-dashboard/BrandsHiring';
import { AccountLoadError } from '@/components/creator-dashboard/AccountLoadError';
import type { CreatorBrandMatches } from '@/lib/reports/creator-brand-matches';
import { useLocale } from '@/lib/i18n/use-locale';
import { getDashboardStrings } from '@/lib/i18n/dashboard-strings';

type BrandMatchesResponse = CreatorBrandMatches & { detectedNiche: string | null };

export default function BrandsHiringPage() {
  const { user, creatorProfile, userRole, loading, authError } = useAuth();
  // This route owns the session, so it resolves the locale and passes it down —
  // see the `locale` prop note in BrandsHiring.tsx.
  const locale = useLocale();
  const t = getDashboardStrings(locale);

  const [data, setData] = useState<BrandMatchesResponse | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  // `blocked` is ONLY a 403 whose body says reason 'not_verified' — the one
  // response that actually means "your claim is not verified yet". Everything
  // else (a 503 lookup_failed, a 5xx, a dropped connection, a 403 with any
  // other reason) is `loadFailed`: it says nothing about the creator's claim,
  // and rendering the pending sentence for it told verified creators they
  // were unverified whenever the API hiccuped.
  //
  // Tracked separately from `data` because the old code fed the error body
  // straight into setData, so a non-2xx produced an object with no `matches`
  // and the page rendered undefined into BrandsHiring.
  const [blocked, setBlocked] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  // Bumped by the Retry button; re-runs the effect below.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!creatorProfile || !creatorProfile.creator_id) {
      setDataLoading(false);
      return;
    }

    setDataLoading(true);
    setBlocked(false);
    setLoadFailed(false);
    fetch('/api/creator/brand-matches')
      .then(async (res) => {
        if (res.ok) return res.json();
        if (res.status === 403) {
          const body = await res.json().catch(() => null);
          if (body?.reason === 'not_verified') {
            setBlocked(true);
            return null;
          }
        }
        setLoadFailed(true);
        return null;
      })
      .then((json) => setData(json))
      .catch(() => setLoadFailed(true))
      .finally(() => setDataLoading(false));
  }, [creatorProfile?.creator_id, attempt]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <p style={{ color: '#9CA3AF' }}>{t.common.loading}</p>
    </div>
  );
  // Never redirect on an error: see app/creator-dashboard/page.tsx for the
  // ordering and why an undetermined role is not "not a creator".
  // A signed-out visitor (no user, no error) falls through to the existing
  // /login redirect below; a failed check renders the retry state instead.
  if (authError || (user && userRole === undefined)) return <AccountLoadError locale={locale} />;
  if (!user) { window.location.href = '/login'; return null; }
  if (userRole !== 'creator') { window.location.href = '/dashboard'; return null; }
  if (loadFailed) return (
    <AccountLoadError
      locale={locale}
      message={t.brandsHiring.loadFailed}
      onRetry={() => setAttempt((n) => n + 1)}
    />
  );
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
