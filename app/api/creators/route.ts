import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const search = searchParams.get('search') ?? '';
  const minFollowers = searchParams.get('minFollowers');
  const maxFollowers = searchParams.get('maxFollowers');
  const minEngagement = searchParams.get('minEngagement');
  const category = searchParams.get('category');
  const verified = searchParams.get('verified');
  const sortBy = searchParams.get('sortBy') ?? 'follower_count';
  const sortDir = searchParams.get('sortDir') ?? 'desc';
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const limit = parseInt(searchParams.get('limit') ?? '24', 10);
  const offset = (page - 1) * limit;

  let query = supabase.from('creators').select('*', { count: 'exact' });

  // Text search across multiple fields
  if (search) {
    query = query.or(
      `instagram_handle.ilike.%${search}%,full_name.ilike.%${search}%,bio.ilike.%${search}%,category_name.ilike.%${search}%`
    );
  }

  if (minFollowers) query = query.gte('follower_count', parseInt(minFollowers, 10));
  if (maxFollowers) query = query.lte('follower_count', parseInt(maxFollowers, 10));
  if (minEngagement) query = query.gte('engagement_rate', parseFloat(minEngagement));
  if (category) query = query.eq('category_name', category);
  if (verified === 'true') query = query.eq('is_verified', true);

  const validSortFields = ['follower_count', 'engagement_rate', 'last_updated_at'];
  const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'follower_count';
  const safeSortDir = sortDir === 'asc' ? true : false;

  query = query
    .order(safeSortBy, { ascending: safeSortDir, nullsFirst: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const total = count ?? 0;
  const totalPages = Math.ceil(total / limit);

  return NextResponse.json({
    creators: data,
    total,
    page,
    limit,
    totalPages,
  });
}
