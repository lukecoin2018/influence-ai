import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await supabase
    .from('social_profiles')
    .select('platform_data');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const categories = Array.from(
    new Set(
      (data ?? [])
        .map((p) => p.platform_data?.category_name)
        .filter((c): c is string => !!c && c !== 'None' && c.trim() !== '')
    )
  ).sort();

  return NextResponse.json({ categories });
}