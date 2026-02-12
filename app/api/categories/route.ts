import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await supabase
    .from('creators')
    .select('category_name')
    .not('category_name', 'is', null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const categories = Array.from(
    new Set(data.map((c) => c.category_name).filter(Boolean))
  ).sort() as string[];

  return NextResponse.json({ categories });
}