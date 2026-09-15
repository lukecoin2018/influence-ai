'use client';

// app/creator-dashboard/page.tsx

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { DashboardOverview } from '@/components/creator-dashboard/DashboardOverview';
import { AccountLoadError } from '@/components/creator-dashboard/AccountLoadError';
import type { CreatorBrandMatches } from '@/lib/reports/creator-brand-matches';
import { useLocale } from '@/lib/i18n/use-locale';
import { getDashboardStrings } from '@/lib/i18n/dashboard-strings';
import { useTrackOnMount } from '@/lib/dashboard/track';

export default function CreatorDashboardPage() {
  const { user, creatorProfile, userRole, loading, authError } = useAuth();
  // This route owns the session, so it resolves the locale and hands it to
  // DashboardOverview as a prop — that component is shared with the admin
  // preview, which renders it from a server component and must keep passing
  // plain props (see its header, and the note on the `locale` prop).
  const locale = useLocale();
  const t = getDashboardStrings(locale);
  // Fires on mount, before the session resolves; the route decides whether
  // there is a creator behind it. Recorded for pending creators too — the
  // only event that is (see app/api/creator/events/route.ts).
  useTrackOnMount('dashboard_opened');

  const [creatorData, setCreatorData] = useState<any>(null);
  const [socialProfiles, setSocialProfiles] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [brandMatches, setBrandMatches] = useState<CreatorBrandMatches | null>(null);
  // True when /api/creator/brand-matches did not answer 2xx (or the fetch
  // threw). Surfaced as a non-blocking line in the hero rather than left
  // silent: a null here used to render the "we're detecting brands" copy,
  // which claims we looked when we did not.
  const [brandMatchesFailed, setBrandMatchesFailed] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  // Separate from the rest of loadData so the hero's Retry re-runs only this
  // request. A non-2xx still yields null (the shape every caller types), and a
  // thrown fetch is caught here rather than rejecting the whole Promise.all
  // below, which previously left dataLoading stuck at true.
  const loadBrandMatches = useCallback(async () => {
    setBrandMatchesFailed(false);
    try {
      const res = await fetch('/api/creator/brand-matches');
      if (!res.ok) {
        setBrandMatchesFailed(true);
        setBrandMatches(null);
        return;
      }
      setBrandMatches(await res.json());
    } catch {
      setBrandMatchesFailed(true);
      setBrandMatches(null);
    }
  }, []);

  useEffect(() => {
    if (!creatorProfile || !creatorProfile.creator_id) {
      setDataLoading(false);
      return;
    }
    const creatorId = creatorProfile.creator_id;

    async function loadData() {
      setDataLoading(true);
      const [creatorRes, socialRes, inquiryRes] = await Promise.all([
        supabase.from('v_creator_summary').select('*').eq('creator_id', creatorId).single(),
        supabase.from('social_profiles').select('*').eq('creator_id', creatorId),
        supabase.from('inquiries')
          .select('id, campaign_type, budget_range, created_at, brand_profiles(company_name)')
          .eq('creator_id', creatorId)
          .order('created_at', { ascending: false })
          .limit(10),
        loadBrandMatches(),
      ]);
      setCreatorData(creatorRes.data ?? null);
      setSocialProfiles(socialRes.data ?? []);
      setInquiries(inquiryRes.data ?? []);
      setDataLoading(false);
    }

    loadData();
  }, [creatorProfile?.creator_id, loadBrandMatches]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <p style={{ color: '#9CA3AF' }}>{t.common.loading}</p>
    </div>
  );
  // Order matters. An error is checked before anything redirects: on a failed
  // session or role lookup, `user` may be null and `userRole` is undefined,
  // and neither is a fact about the account. Redirect only on determined
  // values — a real "no session", or a role that is known and is not creator.
  // A signed-out visitor (no user, no error) falls through to the existing
  // /login redirect below; a failed check renders the retry state instead.
  if (authError || (user && userRole === undefined)) return <AccountLoadError locale={locale} />;
  if (!user) { window.location.href = '/login'; return null; }
  if (userRole !== 'creator') { window.location.href = '/dashboard'; return null; }
  if (dataLoading || !creatorProfile) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <p style={{ color: '#9CA3AF' }}>{t.overview.loadingDashboard}</p>
    </div>
  );

  return (
    <DashboardOverview
      creatorProfile={creatorProfile}
      creatorData={creatorData}
      socialProfiles={socialProfiles}
      inquiries={inquiries}
      brandMatches={brandMatches}
      brandMatchesFailed={brandMatchesFailed}
      onRetryBrandMatches={loadBrandMatches}
      brandsHiringHref="/creator-dashboard/brands-hiring"
      locale={locale}
    />
  );
}
