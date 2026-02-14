import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const search = searchParams.get('search') ?? '';
  const minFollowers = searchParams.get('minFollowers');
  const maxFollowers = searchParams.get('maxFollowers');
  const minEngagement = searchParams.get('minEngagement');
  const category = searchParams.get('category');
  const platform = searchParams.get('platform');
  const verified = searchParams.get('verified');
  const sortBy = searchParams.get('sortBy') ?? 'total_followers';
  const sortDir = searchParams.get('sortDir') ?? 'desc';
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const limit = parseInt(searchParams.get('limit') ?? '24', 10);
  const offset = (page - 1) * limit;

  let query = supabase.from('v_creator_summary').select('*', { count: 'exact' });

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,instagram_handle.ilike.%${search}%,tiktok_handle.ilike.%${search}%`
    );
  }

  if (minFollowers) query = query.gte('total_followers', parseInt(minFollowers, 10));
  if (maxFollowers) query = query.lte('total_followers', parseInt(maxFollowers, 10));
  if (minEngagement) {
    query = query.or(
      `instagram_engagement.gte.${parseFloat(minEngagement)},tiktok_engagement.gte.${parseFloat(minEngagement)}`
    );
  }

  if (platform === 'instagram') query = query.not('instagram_handle', 'is', null);
  if (platform === 'tiktok') query = query.not('tiktok_handle', 'is', null);
  if (platform === 'both') {
    query = query.not('instagram_handle', 'is', null).not('tiktok_handle', 'is', null);
  }

  if (verified === 'true') {
    query = query.or('instagram_verified.eq.true,tiktok_verified.eq.true');
  }

  if (category) {
    const { data: profileMatches } = await supabase
      .from('social_profiles')
      .select('creator_id')
      .eq('platform_data->>category_name', category);
    const ids = (profileMatches ?? []).map((p) => p.creator_id);
    if (ids.length === 0) {
      return NextResponse.json({ creators: [], total: 0, page, limit, totalPages: 0 });
    }
    query = query.in('creator_id', ids);
  }

  const validSortFields: Record<string, string> = {
    total_followers: 'total_followers',
    instagram_followers: 'instagram_followers',
    tiktok_followers: 'tiktok_followers',
    instagram_engagement: 'instagram_engagement',
    tiktok_engagement: 'tiktok_engagement',
  };
  const safeSortBy = validSortFields[sortBy] ?? 'total_followers';

  query = query
    .order(safeSortBy, { ascending: sortDir === 'asc', nullsFirst: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const total = count ?? 0;
  return NextResponse.json({
    creators: data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}