import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';

// Writes the manual "DMed" flag for the admin creator-targeting panel
// (app/admin/targeting). creator_outreach has RLS enabled with no policies
// (see supabase/migrations/0008_creator_outreach.sql) — only this
// service-role-backed, admin-auth-gated route can write it.
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
  if (roleData?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const { creatorId, status, notes } = body as { creatorId?: string; status?: string; notes?: string };
    if (!creatorId || typeof creatorId !== 'string') {
      return NextResponse.json({ error: 'Missing creatorId' }, { status: 400 });
    }
    if (status !== 'not_contacted' && status !== 'dmed') {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const payload: Record<string, unknown> = {
      creator_id: creatorId,
      status,
      dmed_at: status === 'dmed' ? new Date().toISOString() : null,
      dmed_by: status === 'dmed' ? user.id : null,
      updated_at: new Date().toISOString(),
    };
    // Omit notes entirely when not provided, so toggling status alone never
    // clobbers a previously-saved note on conflict-update.
    if (typeof notes === 'string') payload.notes = notes;

    const { error } = await admin.from('creator_outreach').upsert(payload);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Failed to update creator_outreach:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to update' }, { status: 500 });
  }
}
