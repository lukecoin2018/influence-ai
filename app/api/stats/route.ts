import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await supabase
    .from('creators')
    .select('engagement_rate, category_name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const totalCreators = data.length;

  const rates = data
    .map((c) => c.engagement_rate)
    .filter((r): r is number => r != null);
  const avgEngagementRate =
    rates.length > 0
      ? Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 10) / 10
      : 0;

  const categories = new Set(
    data.map((c) => c.category_name).filter(Boolean)
  );
  const categoryCount = categories.size;

  // Get newest creator date separately
  const { data: newest } = await supabase
    .from('creators')
    .select('first_discovered_at')
    .order('first_discovered_at', { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json({
    totalCreators,
    avgEngagementRate,
    categoryCount,
    newestCreatorDate: newest?.first_discovered_at ?? null,
  });
}