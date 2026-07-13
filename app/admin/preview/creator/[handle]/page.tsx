import { withTimeout } from '@/lib/withTimeout';
import { getCreatorBrandMatches } from '@/lib/reports/creator-brand-matches';
import { AdminPreviewShell } from '@/components/creator-dashboard/AdminPreviewShell';
import { DashboardOverview } from '@/components/creator-dashboard/DashboardOverview';
import { requireAdminPreviewAccess } from './_data';

// This route works for ANY creator handle on demand — always fetch fresh,
// never statically prerender or cache a specific creator's data.
export const dynamic = 'force-dynamic';

const DB_TIMEOUT_MS = 10_000;

export default async function AdminCreatorPreviewPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const { admin, creatorId, normalized, creatorProfile } = await requireAdminPreviewAccess(handle);

  const [creatorSummaryRes, socialProfilesRes, inquiriesRes, brandMatches] = await Promise.all([
    withTimeout(Promise.resolve(admin.from('v_creator_summary').select('*').eq('creator_id', creatorId).maybeSingle()), DB_TIMEOUT_MS),
    withTimeout(Promise.resolve(admin.from('social_profiles').select('*').eq('creator_id', creatorId)), DB_TIMEOUT_MS),
    withTimeout(
      Promise.resolve(
        admin.from('inquiries')
          .select('id, campaign_type, budget_range, created_at, brand_profiles(company_name)')
          .eq('creator_id', creatorId)
          .order('created_at', { ascending: false })
          .limit(10),
      ),
      DB_TIMEOUT_MS,
    ),
    withTimeout(getCreatorBrandMatches(admin, creatorId), DB_TIMEOUT_MS),
  ]);

  return (
    <AdminPreviewShell handle={normalized}>
      <DashboardOverview
        creatorProfile={creatorProfile}
        creatorData={creatorSummaryRes.data}
        socialProfiles={socialProfilesRes.data ?? []}
        inquiries={inquiriesRes.data ?? []}
        brandMatches={brandMatches}
        brandsHiringHref={`/admin/preview/creator/${normalized}/brands-hiring`}
      />
    </AdminPreviewShell>
  );
}
