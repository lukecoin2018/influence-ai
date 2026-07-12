import { notFound, redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { withTimeout } from '@/lib/withTimeout';
import { AdminPreviewShell } from '@/components/creator-dashboard/AdminPreviewShell';
import { DashboardOverview } from '@/components/creator-dashboard/DashboardOverview';

// This route works for ANY creator handle on demand — always fetch fresh,
// never statically prerender or cache a specific creator's data.
export const dynamic = 'force-dynamic';

const DB_TIMEOUT_MS = 10_000;

function normalizeHandle(handle: string): string {
  return handle.trim().replace(/^@/, '').toLowerCase();
}

export default async function AdminCreatorPreviewPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;

  // Server-side admin gate — checked on every request, independent of (and
  // stronger than) any client-side role check or RLS policy on
  // creator_profiles. Mirrors requireAdmin() in app/api/admin/targeting/route.ts.
  const session = await createSupabaseServerClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) redirect('/login');

  const { data: roleData } = await session.from('user_roles').select('role').eq('user_id', user.id).single();
  if (roleData?.role !== 'admin') redirect('/');

  // Service-role client — the admin is previewing someone else's data, not
  // reading their own row, so this isn't a normal logged-in-user fetch.
  const admin = createSupabaseAdminClient();
  const normalized = normalizeHandle(handle);

  const { data: socialMatch } = await withTimeout(
    Promise.resolve(admin.from('social_profiles').select('creator_id').eq('handle', normalized).limit(1).maybeSingle()),
    DB_TIMEOUT_MS,
  );
  const creatorId = socialMatch?.creator_id;
  if (!creatorId) notFound();

  const [creatorProfileRes, creatorSummaryRes, socialProfilesRes, inquiriesRes] = await Promise.all([
    withTimeout(Promise.resolve(admin.from('creator_profiles').select('*').eq('creator_id', creatorId).maybeSingle()), DB_TIMEOUT_MS),
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
  ]);

  // No creator_profiles row means this handle hasn't claimed a profile yet —
  // there's no creator-dashboard data model to preview for them.
  if (!creatorProfileRes.data) notFound();

  return (
    <AdminPreviewShell handle={normalized}>
      <DashboardOverview
        creatorProfile={creatorProfileRes.data}
        creatorData={creatorSummaryRes.data}
        socialProfiles={socialProfilesRes.data ?? []}
        inquiries={inquiriesRes.data ?? []}
      />
    </AdminPreviewShell>
  );
}
