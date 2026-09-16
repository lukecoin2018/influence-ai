/**
 * The handle to show for a scraped creator on admin pages.
 *
 * Handles live on social_profiles, one row per platform, not on creators:
 * creators.instagram_handle is populated on 382 of 8,721 rows (measured
 * 2026-09-16) and creators.tiktok_handle was never selected, so every admin
 * row read `@unknown`. Select the nested join instead and pick from it here.
 *
 * Instagram first, else the first row. Creators are single-platform by
 * scrape source, so "first row" is the only row in practice.
 */

/** Select fragment for the creators join; pairs with primaryHandle(). */
export const CREATOR_HANDLE_SELECT = 'creators!creator_id(display_name, social_profiles(platform, handle))';

export type SocialHandleRow = { platform: string | null; handle: string | null };

export function primaryHandle(rows: SocialHandleRow[] | null | undefined): string | null {
  if (!rows || rows.length === 0) return null;
  const ig = rows.find((r) => r.platform === 'instagram' && r.handle);
  return ig?.handle ?? rows.find((r) => r.handle)?.handle ?? null;
}
