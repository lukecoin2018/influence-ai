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

export type BioPlatform = 'instagram' | 'tiktok';

// Not `!`-asserted: an unset token used to produce `token=undefined` in the
// request URL, a non-2xx from Apify, and a silent `false` that looked exactly
// like a creator error. Absent config is now `unavailable`, as it should be.
const APIFY_TOKEN = process.env.APIFY_API_TOKEN;

/**
 * Instagram serves a crawlable profile page to Googlebot. This is the
 * user-agent the Instagram path has always sent and it is deliberately not
 * shared with TikTok: TikTok's SEO gateway answers the same user-agent with a
 * bare 403 (measured 2026-09-22, body "Forbidden", 9 bytes), so the free path
 * never read a TikTok bio.
 */
const GOOGLEBOT_UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

/**
 * A desktop browser gets TikTok's server-rendered profile page, which carries
 * the bio inside the `__UNIVERSAL_DATA_FOR_REHYDRATION__` JSON blob (measured
 * 2026-09-22 against @lmg.media: 200, 371 KB, `signature` present).
 */
const DESKTOP_CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

const APIFY_RUN_SYNC = (actor: string) =>
  `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=60`;

/**
 * The bio of `handle` as TikTok's rehydration blob states it, or null when the
 * page is not a profile page for that handle.
 *
 * The shape is `__DEFAULT_SCOPE__['webapp.user-detail'].userInfo.user` with
 * `uniqueId` (the handle) and `signature` (the bio) — read off a real
 * response on 2026-09-22, not off documentation. Anything else — no script
 * tag, unparseable JSON, a blob for some other handle, a `signature` that is
 * not a string — is null, which the caller reports as `unavailable`. That is
 * the whole point of parsing rather than string-searching the page: TikTok
 * answers challenge and consent pages with a 200 too, and none of those
 * carry the code, so a plain miss on the raw HTML would read as a creator
 * error. Only a blob that names this handle is evidence of what their bio
 * says.
 *
 * Exported for tests only.
 */
export function tiktokSignatureFromHtml(html: string, handle: string): string | null {
  const match = html.match(
    /<script[^>]*\bid="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/
  );
  if (!match) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(match[1]);
  } catch {
    return null;
  }

  const scope = (parsed as { __DEFAULT_SCOPE__?: Record<string, unknown> } | null)
    ?.__DEFAULT_SCOPE__;
  const detail = scope?.['webapp.user-detail'] as
    | { userInfo?: { user?: { uniqueId?: unknown; signature?: unknown } } }
    | undefined;
  const user = detail?.userInfo?.user;

  if (typeof user?.uniqueId !== 'string') return null;
  if (user.uniqueId.toLowerCase() !== handle.toLowerCase()) return null;
  if (typeof user.signature !== 'string') return null;
  return user.signature;
}

async function directFetchInstagram(handle: string, code: string): Promise<BioCheckOutcome> {
  try {
    const res = await fetch(`https://www.instagram.com/${handle}/`, {
      headers: { 'User-Agent': GOOGLEBOT_UA },
      cache: 'no-store',
    });

    if (!res.ok) return 'unavailable';
    const html = await res.text();
    if (html.includes(code)) return 'found';

    // A 200 does not prove we got the profile. Instagram serves login walls,
    // consent interstitials and error pages with a 200 to an unknown
    // user-agent, and none of those contain the code — which would read as a
    // creator error. If the response doesn't even mention the handle, we are
    // not looking at their profile, so we know nothing.
    if (!html.toLowerCase().includes(handle.toLowerCase())) return 'unavailable';

    return 'absent';
  } catch {
    return 'unavailable';
  }
}

/**
 * Stricter than the Instagram path on purpose. `absent` needs a 200 whose
 * rehydration blob names this handle and carries a `signature`; a 403, a 200
 * without the blob (a challenge page) and a blob for someone else are all
 * `unavailable` and fall through to Apify. `found` is likewise read from the
 * parsed signature, never from the raw page.
 */
async function directFetchTikTok(handle: string, code: string): Promise<BioCheckOutcome> {
  try {
    const res = await fetch(`https://www.tiktok.com/@${handle}`, {
      headers: { 'User-Agent': DESKTOP_CHROME_UA },
      cache: 'no-store',
    });

    if (!res.ok) return 'unavailable';
    const signature = tiktokSignatureFromHtml(await res.text(), handle);
    if (signature === null) return 'unavailable';
    return signature.includes(code) ? 'found' : 'absent';
  } catch {
    return 'unavailable';
  }
}

async function apifyInstagramBio(handle: string, code: string): Promise<BioCheckOutcome> {
  if (!APIFY_TOKEN) return 'unavailable';
  try {
    const res = await fetch(APIFY_RUN_SYNC('apify~instagram-profile-scraper'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernames: [handle] }),
    });

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

/**
 * abe~tiktok-profile-scraper: one dataset item per username, with the bio in
 * `bio`. Same actor and input shape the scraper runs in production
 * (inf-scraper sends `{ usernames }` from app/api/tiktok/start-profile-scrape
 * and reads `bio` and `tagline` off the items in its lib/apify.ts), which is
 * why it replaced
 * clockworks~tiktok-profile-scraper here: that actor emits one item per
 * VIDEO with the bio nested at `authorMeta.signature`, so the top-level read
 * this function used to do came back empty on every successful run and
 * charged the creator an attempt for a code that was in their bio — and it
 * billed per video, up to 100 of them, for the privilege.
 *
 * `unavailable`, never `absent`, for anything short of a readable bio: an
 * empty dataset, an item carrying an `error` field, an item whose `bio` is
 * not a string. A bio we did not read is not a bio without the code in it.
 */
async function apifyTikTokBio(handle: string, code: string): Promise<BioCheckOutcome> {
  if (!APIFY_TOKEN) return 'unavailable';
  try {
    const res = await fetch(APIFY_RUN_SYNC('abe~tiktok-profile-scraper'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernames: [handle] }),
    });

    // The status and the first part of the body are logged because a plan or
    // access refusal from Apify looks, to the creator, exactly like a network
    // blip — and the only way to tell a misconfigured account from a bad day
    // is this line. The code is not in either.
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn(`[verify-bio] abe run failed: HTTP ${res.status} ${body.slice(0, 300)}`);
      return 'unavailable';
    }
    const data = await res.json();
    if (!Array.isArray(data) || !data[0]) {
      console.warn(`[verify-bio] abe returned no items for @${handle}`);
      return 'unavailable';
    }

    const item = data[0] as { bio?: unknown; error?: unknown };
    if (item.error != null) {
      console.warn(`[verify-bio] abe item for @${handle} carries an error: ${String(item.error).slice(0, 300)}`);
      return 'unavailable';
    }
    if (typeof item.bio !== 'string') return 'unavailable';
    return item.bio.includes(code) ? 'found' : 'absent';
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
 *
 * One `[verify-bio]` log line per call names the platform, what each path
 * answered and the outcome, so a verification can be traced to the path that
 * settled it without reading the code — which is never logged.
 */
export async function checkBioForCode(
  handle: string,
  platform: BioPlatform,
  code: string
): Promise<BioCheckOutcome> {
  const direct =
    platform === 'instagram'
      ? await directFetchInstagram(handle, code)
      : await directFetchTikTok(handle, code);

  let fallback: BioCheckOutcome | 'skipped' = 'skipped';
  let outcome: BioCheckOutcome;

  if (direct === 'found') {
    outcome = 'found';
  } else {
    fallback =
      platform === 'instagram'
        ? await apifyInstagramBio(handle, code)
        : await apifyTikTokBio(handle, code);
    if (fallback === 'found') outcome = 'found';
    else if (direct === 'absent' || fallback === 'absent') outcome = 'absent';
    else outcome = 'unavailable';
  }

  console.info(
    `[verify-bio] platform=${platform} handle=@${handle} direct=${direct} apify=${fallback} outcome=${outcome}`
  );
  return outcome;
}
