import { withTimeout } from '@/lib/withTimeout';
import { getCreatorBrandMatches } from '@/lib/reports/creator-brand-matches';
import { AdminPreviewShell } from '@/components/creator-dashboard/AdminPreviewShell';
import { BrandsHiring } from '@/components/creator-dashboard/BrandsHiring';
import { requireAdminPreviewAccess } from '../_data';

// This route works for ANY creator handle on demand — always fetch fresh,
// never statically prerender or cache a specific creator's data.
export const dynamic = 'force-dynamic';

const DB_TIMEOUT_MS = 10_000;

export default async function AdminBrandsHiringPreviewPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const { admin, creatorId, normalized } = await requireAdminPreviewAccess(handle);

  const [brandMatches, socialRow] = await Promise.all([
    withTimeout(getCreatorBrandMatches(admin, creatorId), DB_TIMEOUT_MS),
    withTimeout(
      Promise.resolve(admin.from('social_profiles').select('detected_niche').eq('creator_id', creatorId).limit(1).maybeSingle()),
      DB_TIMEOUT_MS,
    ),
  ]);

  return (
    <AdminPreviewShell handle={normalized}>
      <BrandsHiring
        matches={brandMatches?.matches ?? []}
        creatorFollowers={brandMatches?.creatorFollowers ?? null}
        detectedNiche={socialRow.data?.detected_niche ?? null}
      />
    </AdminPreviewShell>
  );
}
