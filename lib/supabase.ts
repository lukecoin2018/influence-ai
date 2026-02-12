import { createClient } from '@supabase/supabase-js';
import type { Creator } from './types';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Type helper — cast Supabase responses to our Creator type
export type { Creator };