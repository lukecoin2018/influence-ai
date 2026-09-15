/**
 * The greeting name for a creator email.
 *
 * Whitespace-split first token of the first candidate that has one, or
 * undefined so the template falls back to "there". Callers pass candidates in
 * preference order — the claimed profile's own display_name first, then the
 * scraped creators.display_name — the same order app/admin/creators/page.tsx
 * uses for its headline.
 *
 * Lived inside app/api/admin/creators/status/route.ts until the nudge cron
 * needed the same split; one definition so the two emails can never greet the
 * same person differently.
 */
export function firstNameOf(...candidates: (string | null | undefined)[]): string | undefined {
  for (const c of candidates) {
    const token = c?.trim().split(/\s+/)[0];
    if (token) return token;
  }
  return undefined;
}
