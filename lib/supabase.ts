import { createBrowserClient } from '@supabase/ssr';
import type { Creator } from './types';

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type { Creator };