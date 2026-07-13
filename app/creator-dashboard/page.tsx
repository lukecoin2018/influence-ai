'use client';

// app/creator-dashboard/page.tsx

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { DashboardOverview } from '@/components/creator-dashboard/DashboardOverview';
import type { CreatorBrandMatches } from '@/lib/reports/creator-brand-matches';

export default function CreatorDashboardPage() {
  const { user, creatorProfile, userRole, loading } = useAuth();

  const [creatorData, setCreatorData] = useState<any>(null);
  const [socialProfiles, setSocialProfiles] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [brandMatches, setBrandMatches] = useState<CreatorBrandMatches | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!creatorProfile || !creatorProfile.creator_id) {
      setDataLoading(false);
      return;
    }
    const creatorId = creatorProfile.creator_id;

    async function loadData() {
      setDataLoading(true);
      const [creatorRes, socialRes, inquiryRes, brandMatchesRes] = await Promise.all([
        supabase.from('v_creator_summary').select('*').eq('creator_id', creatorId).single(),
        supabase.from('social_profiles').select('*').eq('creator_id', creatorId),
        supabase.from('inquiries')
          .select('id, campaign_type, budget_range, created_at, brand_profiles(company_name)')
          .eq('creator_id', creatorId)
          .order('created_at', { ascending: false })
          .limit(10),
        fetch('/api/creator/brand-matches').then((res) => (res.ok ? res.json() : null)),
      ]);
      setCreatorData(creatorRes.data ?? null);
      setSocialProfiles(socialRes.data ?? []);
      setInquiries(inquiryRes.data ?? []);
      setBrandMatches(brandMatchesRes);
      setDataLoading(false);
    }

    loadData();
  }, [creatorProfile?.creator_id]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <p style={{ color: '#9CA3AF' }}>Loading...</p>
    </div>
  );
  if (!user) { window.location.href = '/login'; return null; }
  if (userRole !== 'creator') { window.location.href = '/dashboard'; return null; }
  if (dataLoading || !creatorProfile) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <p style={{ color: '#9CA3AF' }}>Loading your dashboard...</p>
    </div>
  );

  return (
    <DashboardOverview
      creatorProfile={creatorProfile}
      creatorData={creatorData}
      socialProfiles={socialProfiles}
      inquiries={inquiries}
      brandMatches={brandMatches}
      brandsHiringHref="/creator-dashboard/brands-hiring"
    />
  );
}
