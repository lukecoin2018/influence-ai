// lib/creator-requests/shared.ts
//
// Pure helpers shared by the public request form and the route that receives
// it. No `server-only`, no node:crypto, no Supabase — this module is imported
// from a 'use client' file, so anything that cannot cross that boundary
// belongs in the route instead (the IP hashing does).
//
// The point of sharing them is that the form and the route agree about what a
// handle IS. The form normalizes so the creator sees what will be stored; the
// route normalizes again because the form's output is untrusted input by the
// time it arrives.

/**
 * Both platforms the request form offers. `creator_requests.platform` has no
 * CHECK constraint, so THIS is the whitelist — the route validates against it
 * and rejects anything else, and the partial unique index on
 * `(platform, handle)` means the same handle can be requested once per
 * platform, which is correct: they are different accounts.
 *
 * The order is the order the form's <select> shows them.
 */
export const REQUEST_PLATFORMS = ['instagram', 'tiktok'] as const;
export type RequestPlatform = (typeof REQUEST_PLATFORMS)[number];

/** What a request with no `platform` field is taken to mean. */
export const DEFAULT_PLATFORM: RequestPlatform = 'instagram';

/**
 * Untrusted input, and deliberately NOT falling back to a default: an unknown
 * platform is a caller error the route answers with a 400, not something to
 * silently file under Instagram. Absent is handled by the caller, which
 * substitutes DEFAULT_PLATFORM before calling this.
 */
export function normalizeRequestPlatform(raw: string | null | undefined): RequestPlatform | null {
  return REQUEST_PLATFORMS.includes(raw as RequestPlatform) ? (raw as RequestPlatform) : null;
}

/**
 * Public profile URL for a stored handle. One definition, because three
 * surfaces need it and they must agree: the admin queue's handle link, the
 * admin notification email, and anything added later.
 *
 * The two differ by more than the domain — TikTok puts the `@` back in the
 * path, Instagram does not — which is exactly the kind of detail that goes
 * wrong when it is written out at each call site. Handles are stored
 * normalized (no `@`), so the `@` here is added, never doubled.
 */
export function profileUrl(platform: string, handle: string): string {
  return platform === 'tiktok'
    ? `https://tiktok.com/@${handle}`
    : `https://instagram.com/${handle}`;
}

/** Display name for a platform value. Brand names, so never translated. */
export function platformLabel(platform: string): string {
  return platform === 'tiktok' ? 'TikTok' : 'Instagram';
}

/**
 * Platforms whose requests may be AUTO-FULFILLED — closed and sent a claim
 * link. A strict subset of REQUEST_PLATFORMS, and the gap between the two is
 * deliberate: a creator may ASK to be added on TikTok, and we will add them,
 * but nothing automatically tells them to go and claim.
 *
 * ── WHY TIKTOK IS HELD BACK ────────────────────────────────────────────────
 *
 * TikTok verification has never run successfully — CLAUDE.md, "Known open
 * items", and the note in the "Creator requests" section. The claim link in
 * RequestFulfilled says claiming unlocks the dashboard, and for a TikTok
 * creator that lands them on a bio-code step nobody has proven works. Sending
 * it would be the "don't promise what the product can't do" rule broken by
 * automation, which is the worst way to break it: at volume, unattended.
 *
 * Adding 'tiktok' here is the ONE change that turns the whole path on, once
 * TikTok verification is proven. Both callers of fulfilRequest() route through
 * this, so neither can be switched on by accident without the other.
 */
export const FULFIL_ENABLED_PLATFORMS = ['instagram'] as const;

export function isFulfilEnabled(platform: string): boolean {
  return (FULFIL_ENABLED_PLATFORMS as readonly string[]).includes(platform);
}

/**
 * Where the request came from. Whitelisted rather than free text: it is
 * written to a NOT NULL column straight from a `?from=` query param, and the
 * only reason it exists is to compare entry points against each other, which
 * an open set makes impossible.
 */
export const REQUEST_SOURCES = ['signup_not_found', 'claim_not_found', 'footer', 'direct'] as const;
export type RequestSource = (typeof REQUEST_SOURCES)[number];

export const DEFAULT_SOURCE: RequestSource = 'direct';

export function normalizeSource(raw: string | null | undefined): RequestSource {
  return REQUEST_SOURCES.includes(raw as RequestSource) ? (raw as RequestSource) : DEFAULT_SOURCE;
}

export const NOTE_MAX_LENGTH = 300;

/**
 * Letters, digits, periods and underscores, up to 30 characters. Applied AFTER
 * normalization, so it is a check on what would be stored rather than on what
 * was typed.
 *
 * ONE pattern for both platforms, and it is Instagram's (the looser of the
 * two — TikTok caps at 24). Deliberate: this is a typo guard, not an
 * authority on what exists. The only thing that settles whether a handle is
 * real is a person opening the profile, which the admin queue links to, and a
 * platform-specific length rule here would reject a valid handle on the
 * strength of a rule the platform could change tomorrow.
 */
const HANDLE_PATTERN = /^[a-z0-9._]{1,30}$/;

/**
 * Deliberately loose. This is a "did they mean to type an address" check, not
 * an RFC 5322 parser: the only thing that proves an address is real is the
 * email we send to it, and a stricter regex here would reject valid addresses
 * and cost us the creator.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * "@Foo_Bar", "https://www.instagram.com/foo.bar/?hl=en" and " foo bar " all
 * become the handle that would be stored. Returns null when nothing is left.
 *
 * Same destination as the four existing normalizeHandle() copies
 * (lib/funnel/events.ts documents the list) — lowercased, @ stripped — plus
 * the URL and whitespace handling those do not need, because those receive a
 * handle the app already resolved and this receives whatever a creator pasted
 * out of their own profile. A stored value that does not match
 * social_profiles.handle would never be matched by the fulfil pass.
 */
export function normalizeRequestHandle(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;

  let s = raw.trim();
  if (!s) return null;

  // A pasted profile URL, with or without scheme and www, on either platform.
  // TikTok profile URLs are `tiktok.com/@handle` — the `@` is inside the path,
  // which is why it is stripped after the path split below rather than before.
  const url = s.match(/^(?:https?:\/\/)?(?:[a-z0-9-]+\.)*(?:instagram|tiktok)\.com\/(.*)$/i);
  if (url) s = url[1];

  s = s.split(/[?#]/)[0];
  // First non-empty path segment: ".../foo/" and ".../foo/reels" both give foo.
  s = s.split('/').filter(Boolean)[0] ?? '';
  // TikTok URLs carry the @ inside the path, so this runs after the split.
  s = s.replace(/\s+/g, '').replace(/^@+/, '').toLowerCase();

  return s || null;
}

export function isValidRequestHandle(normalized: string): boolean {
  return HANDLE_PATTERN.test(normalized);
}

export function normalizeRequestEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed || null;
}

export function isValidRequestEmail(email: string): boolean {
  return email.length <= 254 && EMAIL_PATTERN.test(email);
}

/** Trimmed, capped, and empty-as-null so the column stays NULL rather than ''. */
export function normalizeRequestNote(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, NOTE_MAX_LENGTH);
}
