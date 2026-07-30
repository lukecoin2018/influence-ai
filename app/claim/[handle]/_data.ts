import type { SupabaseClient } from '@supabase/supabase-js';
import { withTimeout } from '@/lib/withTimeout';
import type { RecencyBucket } from '@/lib/reports/recency-bucket';
import { getClaimStrings, type Locale } from './_strings';

const DB_TIMEOUT_MS = 10_000;

function normalizeHandle(handle: string): string {
  return handle.trim().replace(/^@/, '').toLowerCase();
}

type RawCreatorProfileRow = {
  detected_niche: string | null;
  creators: { display_name: string | null } | { display_name: string | null }[] | null;
};

export type CreatorProfileInfo = {
  displayName: string | null;
  /** social_profiles.detected_niche — the clean, ~98%-populated content-niche field. NOT platform_data->>category_name (Instagram's noisy account-type label) — deliberately not that column. */
  detectedNiche: string | null;
};

/**
 * Resolves a creator's display name + detected niche in one query — both are
 * creator-profile display fields, separate from getCreatorBrandMatches(),
 * which is deliberately scoped to brand-match data only. One round trip
 * against social_profiles (detected_niche lives there directly; display_name
 * is a joined creators column) rather than two.
 */
export async function resolveCreatorProfileInfo(supabase: SupabaseClient, handle: string): Promise<CreatorProfileInfo> {
  const { data } = await withTimeout(
    Promise.resolve(
      supabase
        .from('social_profiles')
        .select('detected_niche, creators!inner(display_name)')
        .eq('handle', normalizeHandle(handle))
        .limit(1)
        .maybeSingle(),
    ),
    DB_TIMEOUT_MS,
  );
  const row = data as RawCreatorProfileRow | null;
  if (!row) return { displayName: null, detectedNiche: null };
  const creators = row.creators;
  const displayName = Array.isArray(creators) ? creators[0]?.display_name : creators?.display_name;
  return { displayName: displayName ?? null, detectedNiche: row.detected_niche ?? null };
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
 * Emoji, pictographs, and the joiners and modifiers that decorate them —
 * variation selectors, ZWJ, skin-tone modifiers, regional indicators.
 *
 * Replaced with a SPACE rather than deleted, so a name written "Ana🌸Sofia"
 * splits into two tokens instead of fusing into one "Ana Sofia" word.
 */
const EMOJI_AND_MODIFIERS =
  /[\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Regional_Indicator}\u200D\uFE0E\uFE0F]/gu;

/**
 * A token can only serve as a name if it contains a letter. Skips the
 * separators Instagram display names are full of ("|", "/", "·", "♡") and
 * any stray digits left behind once emoji are gone.
 *
 * Deliberately not global: `.test()` on a /g regex is stateful across calls.
 */
const HAS_LETTER = /\p{L}/u;

/**
 * First usable token of the display name, title-cased; falls back to the raw
 * handle (also title-cased), then to null (meaning: render the nameless
 * headline variant — never a broken "— N brands" with a blank in front of
 * it).
 *
 * "Usable" does real work here, because Instagram display names are not
 * names. Three things happen before titleCase() sees a token:
 *
 *  1. NFKC normalization, which folds stylized code points back to plain
 *     letters — "𝗔𝗡𝗔" -> "ANA", "𝒞𝒶𝓇𝑜𝓁𝒾𝓃𝒶" -> "Carolina". NFKC and not NFKD:
 *     NFKD would decompose accents into base + combining mark, and titleCase
 *     lowercases everything after the first code point, so "ANGÉLICA" would
 *     come back as "Angélica" with a detached accent. NFKC keeps them
 *     composed, which is the one case this function already got right.
 *  2. Emoji stripped. A LEADING emoji used to become the entire greeting
 *     name ("🌸 Christina" -> "🌸"), and a hugging one defeated titleCase
 *     outright: "✨Sofía✨" -> "✨sofía✨", because ✨ has no uppercase, so
 *     the first-character toUpperCase() was inert while the rest was still
 *     lowercased — destroying the real initial.
 *  3. The first token containing a letter, not simply the first token, so
 *     "DANI DESAFIO XXI ♡" and "CAMILA VELEZ / CONTENT CREATOR 🦋" resolve
 *     to the name rather than to punctuation.
 *
 * titleCase() itself is unchanged — with a clean token it was always
 * correct, so the whole fix belongs in this caller.
 *
 * Known and deliberately NOT handled: hyphenated names still collapse
 * ("JOSÉ-LUIS" -> "José-luis"). That is a separate concern from emoji.
 */
export function resolveGreetingName(displayName: string | null, handle: string): string | null {
  const cleaned = (displayName ?? '').normalize('NFKC').replace(EMOJI_AND_MODIFIERS, ' ');
  const token = cleaned.split(/\s+/).find((t) => HAS_LETTER.test(t));
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

/** Full-card recency wording — the editorializing, locked per-bucket copy. Computed here at render time from the raw date, never stored. Locale defaults to 'en' so existing (dashboard, English teaser) callers are unaffected. */
export function recencyLineFull(bucket: RecencyBucket, mostRecentPost: string | null, locale: Locale = 'en'): string {
  const t = getClaimStrings(locale).recencyFull;
  if (!mostRecentPost) return t.unknown;
  if (bucket === 'neutral') return t.neutral(monthsSince(mostRecentPost));
  const weeksAgo = weeksSince(mostRecentPost);
  return bucket === 'active' ? t.active(weeksAgo) : t.window(weeksAgo);
}

/**
 * Compact blurred-row recency wording. Unlike the full card, BlurredMatch
 * deliberately doesn't carry mostRecentPost (only the bucket enum — the read
 * layer's own gated-row contract), so this can't compute an exact "{n} weeks
 * ago" the way the full card does. Bucket-only phrasing, no invented number.
 * Locale defaults to 'en' so existing callers are unaffected.
 */
export function recencyLineCompact(bucket: RecencyBucket, locale: Locale = 'en'): string {
  const t = getClaimStrings(locale).recencyCompact;
  if (bucket === 'active') return t.active;
  if (bucket === 'window') return t.window;
  return t.neutral;
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
