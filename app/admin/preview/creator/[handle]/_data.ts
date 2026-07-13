import { notFound, redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { withTimeout } from '@/lib/withTimeout';

const DB_TIMEOUT_MS = 10_000;

export function normalizeHandle(handle: string): string {
  return handle.trim().replace(/^@/, '').toLowerCase();
}

interface AdminPreviewContext {
  admin: SupabaseClient;
  creatorId: string;
  normalized: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  creatorProfile: any;
}

/**
 * Shared server-side gate for every /admin/preview/creator/[handle]/* route:
 * checks the caller is an admin (session + user_roles), resolves the handle
 * to a creator_id via the service-role client, and 404s if the handle hasn't
 * claimed a profile yet (no creator-dashboard data model to preview for
 * them). Mirrors requireAdmin() in app/api/admin/targeting/route.ts. Each
 * route still fetches its own page-specific data (brand matches, inquiries,
 * etc.) after this.
 */
export async function requireAdminPreviewAccess(handle: string): Promise<AdminPreviewContext> {
  const session = await createSupabaseServerClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) redirect('/login');

  const { data: roleData } = await session.from('user_roles').select('role').eq('user_id', user.id).single();
  if (roleData?.role !== 'admin') redirect('/');

  const admin = createSupabaseAdminClient();
  const normalized = normalizeHandle(handle);

  const { data: socialMatch } = await withTimeout(
    Promise.resolve(admin.from('social_profiles').select('creator_id').eq('handle', normalized).limit(1).maybeSingle()),
    DB_TIMEOUT_MS,
  );
  const creatorId = socialMatch?.creator_id;
  if (!creatorId) notFound();

  const { data: creatorProfile } = await withTimeout(
    Promise.resolve(admin.from('creator_profiles').select('*').eq('creator_id', creatorId).maybeSingle()),
    DB_TIMEOUT_MS,
  );
  if (!creatorProfile) notFound();

  return { admin, creatorId, normalized, creatorProfile };
}
