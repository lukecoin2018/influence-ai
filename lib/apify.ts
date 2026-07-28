// lib/apify.ts
// Bio verification: direct fetch first (free), Apify fallback

/**
 * The outcome of trying to read a creator's bio and look for their code.
 *
 * The distinction that matters is `absent` vs `unavailable`. This module used
 * to collapse both into `false`, so a rate-limited Instagram, an exhausted
 * Apify balance, a 60s actor timeout and a missing API token were all
 * indistinguishable from a creator who simply hadn't pasted the code — and
 * each one burned one of their finite verification attempts. Only `absent`
 * means "we genuinely read the bio and the code was not in it"; only `absent`
 * should ever count against someone.
 */
export type BioCheckOutcome =
  /** The code is in the bio. */
  | 'found'
  /** We read the bio successfully; the code was not in it. */
  | 'absent'
  /** We could not read the bio at all. Says nothing about the creator. */
  | 'unavailable';

// Not `!`-asserted: an unset token used to produce `token=undefined` in the
// request URL, a non-2xx from Apify, and a silent `false` that looked exactly
// like a creator error. Absent config is now `unavailable`, as it should be.
const APIFY_TOKEN = process.env.APIFY_API_TOKEN;

async function directFetchBio(
  handle: string,
  platform: 'instagram' | 'tiktok',
  code: string
): Promise<BioCheckOutcome> {
  try {
    const url =
      platform === 'instagram'
        ? `https://www.instagram.com/${handle}/`
        : `https://www.tiktok.com/@${handle}`;

    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      },
      cache: 'no-store',
    });

    if (!res.ok) return 'unavailable';
    const html = await res.text();
    if (html.includes(code)) return 'found';

    // A 200 does not prove we got the profile. Both platforms serve login
    // walls, consent interstitials and error pages with a 200 to an unknown
    // user-agent, and none of those contain the code — which would read as a
    // creator error. If the response doesn't even mention the handle, we are
    // not looking at their profile, so we know nothing.
    if (!html.toLowerCase().includes(handle.toLowerCase())) return 'unavailable';

    return 'absent';
  } catch {
    return 'unavailable';
  }
}

async function apifyInstagramBio(handle: string, code: string): Promise<BioCheckOutcome> {
  if (!APIFY_TOKEN) return 'unavailable';
  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=60`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernames: [handle] }),
      }
    );

    // Covers rate limits, auth failures, exhausted credits and actor timeouts.
    if (!res.ok) return 'unavailable';
    const data = await res.json();
    // No row back means the scrape produced nothing, not that the bio is empty.
    if (!Array.isArray(data) || !data[0]) return 'unavailable';

    const bio: string = data[0].biography ?? data[0].bio ?? '';
    return bio.includes(code) ? 'found' : 'absent';
  } catch {
    return 'unavailable';
  }
}

async function apifyTikTokBio(handle: string, code: string): Promise<BioCheckOutcome> {
  if (!APIFY_TOKEN) return 'unavailable';
  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/clockworks~tiktok-profile-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=60`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profiles: [`https://www.tiktok.com/@${handle}`],
        }),
      }
    );

    if (!res.ok) return 'unavailable';
    const data = await res.json();
    if (!Array.isArray(data) || !data[0]) return 'unavailable';

    const bio: string =
      data[0].signature ?? data[0].bioDescription ?? data[0].bio ?? '';
    return bio.includes(code) ? 'found' : 'absent';
  } catch {
    return 'unavailable';
  }
}

/**
 * Direct fetch first (free, no Apify credits), scraper as fallback.
 *
 * Resolution across the two sources: either one finding the code settles it.
 * Otherwise the result only counts as a real miss if at least one source
 * actually managed to read the bio — if neither could, the answer is
 * `unavailable` and the creator keeps their attempt.
 */
export async function checkBioForCode(
  handle: string,
  platform: 'instagram' | 'tiktok',
  code: string
): Promise<BioCheckOutcome> {
  const direct = await directFetchBio(handle, platform, code);
  if (direct === 'found') return 'found';

  const fallback =
    platform === 'instagram'
      ? await apifyInstagramBio(handle, code)
      : await apifyTikTokBio(handle, code);
  if (fallback === 'found') return 'found';

  if (direct === 'absent' || fallback === 'absent') return 'absent';
  return 'unavailable';
}
