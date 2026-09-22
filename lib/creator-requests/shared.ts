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

/** Instagram only today — see supabase/migrations/0022_creator_requests.sql. */
export const REQUEST_PLATFORMS = ['instagram'] as const;
export type RequestPlatform = (typeof REQUEST_PLATFORMS)[number];

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
 * Instagram's own rule: letters, digits, periods and underscores, up to 30
 * characters. Applied AFTER normalization, so it is a check on what would be
 * stored rather than on what was typed.
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

  // A pasted profile URL, with or without scheme and www.
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
