import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase-server';

// /report/[slug] is ISR-cached (revalidate = 60s, see that page) so a
// bursty spike of visits to the same report doesn't recompute Tier 1/2/3
// from creator_posts on every single request. Admin-only and gated on
// purpose: without an auth check, this endpoint would itself be a way to
// force constant regeneration — the exact load pattern the cache exists to
// avoid.
export async function POST(req: NextRequest) {
  try {
    const { slug } = await req.json();
    if (!slug || typeof slug !== 'string') {
      return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
    if (roleData?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    revalidatePath(`/report/${slug}`);
    return NextResponse.json({ revalidated: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to revalidate' }, { status: 500 });
  }
}
