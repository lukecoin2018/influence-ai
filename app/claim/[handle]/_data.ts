import type { SupabaseClient } from '@supabase/supabase-js';
import { withTimeout } from '@/lib/withTimeout';
import type { RecencyBucket } from '@/lib/reports/recency-bucket';

const DB_TIMEOUT_MS = 10_000;

function normalizeHandle(handle: string): string {
  return handle.trim().replace(/^@/, '').toLowerCase();
}

type RawDisplayNameRow = { creators: { display_name: string | null } | { display_name: string | null }[] | null };

/**
 * Resolves a creator's display name for personalizing the headline —
 * separate from getCreatorBrandMatches(), which is deliberately scoped to
 * brand-match data only, not creator profile display fields.
 */
export async function resolveCreatorDisplayName(supabase: SupabaseClient, handle: string): Promise<string | null> {
  const { data } = await withTimeout(
    Promise.resolve(
      supabase
        .from('social_profiles')
        .select('creators!inner(display_name)')
        .eq('handle', normalizeHandle(handle))
        .limit(1)
        .maybeSingle(),
    ),
    DB_TIMEOUT_MS,
  );
  const row = data as RawDisplayNameRow | null;
  if (!row) return null;
  const creators = row.creators;
  const displayName = Array.isArray(creators) ? creators[0]?.display_name : creators?.display_name;
  return displayName ?? null;
}

/**
 * Presentation-only title-casing (does not touch the stored DB value) —
 * code-point-safe via Array.from, so it doesn't corrupt a surrogate-pair
 * leading character. "MANUELA" -> "Manuela"; a handle like "3milyball" is
 * left as-is since its first code point has no case.
 */
export function titleCase(word: string): string {
  const chars = Array.from(word);
  if (chars.length === 0) return word;
  return chars[0].toUpperCase() + chars.slice(1).join('').toLowerCase();
}

/**
 * First whitespace-separated token of the display name, title-cased; falls
 * back to the raw handle (also title-cased), then to null (meaning: render
 * the nameless headline variant — never a broken "— N brands" with a blank
 * in front of it).
 */
export function resolveGreetingName(displayName: string | null, handle: string): string | null {
  const token = displayName?.trim().split(/\s+/).filter(Boolean)[0];
  if (token) return titleCase(token);
  const trimmedHandle = handle.trim();
  return trimmedHandle ? titleCase(trimmedHandle) : null;
}

/** Code-point-safe first character for an avatar initial (Array.from splits by code point, not UTF-16 code unit, so surrogate pairs/emoji-prefixed names don't break). */
export function initialOf(name: string): string {
  const chars = Array.from(name.trim());
  return (chars[0] ?? '?').toUpperCase();
}

function daysSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 86_400_000;
}

function weeksSince(iso: string): number {
  return Math.max(1, Math.round(daysSince(iso) / 7));
}

function monthsSince(iso: string): number {
  return Math.max(1, Math.round(daysSince(iso) / 30));
}

function pluralize(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? '' : 's'}`;
}

/** Full-card recency wording — the editorializing, locked per-bucket copy. Computed here at render time from the raw date, never stored. */
export function recencyLineFull(bucket: RecencyBucket, mostRecentPost: string | null): string {
  if (!mostRecentPost) return 'Recency unknown';
  if (bucket === 'neutral') return `Last detected ${pluralize(monthsSince(mostRecentPost), 'month')} ago`;
  const weeksAgo = pluralize(weeksSince(mostRecentPost), 'week');
  return bucket === 'active' ? `Hiring right now — last detected ${weeksAgo} ago` : `Last hired ${weeksAgo} ago — often a good window to reach out`;
}

/**
 * Compact blurred-row recency wording. Unlike the full card, BlurredMatch
 * deliberately doesn't carry mostRecentPost (only the bucket enum — the read
 * layer's own gated-row contract), so this can't compute an exact "{n} weeks
 * ago" the way the full card does. Bucket-only phrasing, no invented number.
 */
export function recencyLineCompact(bucket: RecencyBucket): string {
  if (bucket === 'active') return 'hiring right now';
  if (bucket === 'window') return 'hired in the last few months';
  return 'detected a while back';
}

/** Percent position (design mock's exact formula: 8 + pct*0.84) for the "You · X" bracket marker, clamped into [p25, p75]. */
export function bracketMarkerPercent(followerCount: number, p25: number, p75: number): number {
  if (p75 === p25) return 8 + 50 * 0.84; // single-creator bracket, no real range — center the marker
  const clamped = Math.min(p75, Math.max(p25, followerCount));
  const pct = ((clamped - p25) / (p75 - p25)) * 100;
  return 8 + pct * 0.84;
}

export type BadgeKind = 'repeat-hirer' | 'program' | 'sighting';

/** The design only covers repeat-hirer programs and non-repeat-hirer sightings — a program that ISN'T (yet) a repeat hirer gets its own "Program" label rather than being forced into either existing pill. */
export function badgeFor(isProgram: boolean, isRepeatHirer: boolean): BadgeKind {
  if (isRepeatHirer) return 'repeat-hirer';
  if (isProgram) return 'program';
  return 'sighting';
}

export type AggregateProof = {
  creators: number;
  brandDeals: number;
};

/**
 * Platform-wide reassurance numbers for the zero-match state — "we haven't
 * detected a match for YOU yet, but here's proof the platform has real
 * activity." Reuses the same public_stats() RPC the homepage already reads
 * (app/_queries.ts's getPublicStats), called directly here since that
 * module's helper is tied to the anon browser client via React's cache().
 */
export async function resolveAggregateProof(supabase: SupabaseClient): Promise<AggregateProof | null> {
  const { data, error } = await withTimeout(Promise.resolve(supabase.rpc('public_stats')), DB_TIMEOUT_MS);
  if (error || !data) return null;
  return { creators: data.creators, brandDeals: data.brand_deals };
}
