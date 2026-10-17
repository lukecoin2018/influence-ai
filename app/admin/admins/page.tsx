import { requireOwner } from '@/lib/auth/server-guards';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import AdminsManager, { type AdminRow } from './_AdminsManager';

/**
 * /admin/admins — the owner adds, blocks, unblocks and removes additional
 * admins. OWNER ONLY, checked here and not left to the layout: the layout's
 * gate admits additional admins too, and a page under it still runs whatever
 * the layout renders. An additional admin who opens this URL is sent to
 * /admin; the sidebar never shows them the link.
 *
 * The list comes from admin_users_list() (0032) with the service-role key:
 * admin_users has no policies, and the emails live in auth.users.
 */
export default async function AdminsPage() {
  await requireOwner();

  const { data, error } = await createSupabaseAdminClient().rpc('admin_users_list');

  let loadError: 'migration_missing' | 'failed' | null = null;
  if (error) {
    loadError = error.code === 'PGRST202' || error.code === '42883' ? 'migration_missing' : 'failed';
    if (loadError === 'failed') console.error(`[admin-admins] list failed: ${error.message}`);
  }

  return <AdminsManager rows={(data ?? []) as AdminRow[]} loadError={loadError} />;
}
