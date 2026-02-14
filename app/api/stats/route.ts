import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await supabase
    .from('v_creator_summary')
    .select('instagram_engagement, tiktok_engagement, instagram_handle, tiktok_handle');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const totalCreators = data.length;

  const rates: number[] = [];
  data.forEach((c) => {
    if (c.instagram_engagement != null) rates.push(Number(c.instagram_engagement));
    if (c.tiktok_engagement != null) rates.push(Number(c.tiktok_engagement));
  });
  const avgEngagementRate = rates.length > 0
    ? Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 10) / 10
    : 0;

  const { data: catData } = await supabase
    .from('social_profiles')
    .select('platform_data');

  const categories = new Set<string>();
  (catData ?? []).forEach((p) => {
    const cat = p.platform_data?.category_name;
    if (cat && cat !== 'None') categories.add(cat);
  });

  const instagram = data.filter((c) => c.instagram_handle).length;
  const tiktok = data.filter((c) => c.tiktok_handle).length;
  const both = data.filter((c) => c.instagram_handle && c.tiktok_handle).length;

  return NextResponse.json({
    totalCreators,
    avgEngagementRate,
    categoryCount: categories.size,
    platformBreakdown: { instagram, tiktok, both },
  });
}