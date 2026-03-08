// lib/apify.ts
// Bio verification: direct fetch first (free), Apify fallback

const APIFY_TOKEN = process.env.APIFY_API_TOKEN!;

async function directFetchBio(
  handle: string,
  platform: 'instagram' | 'tiktok',
  code: string
): Promise<boolean> {
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

    if (!res.ok) return false;
    const html = await res.text();
    return html.includes(code);
  } catch {
    return false;
  }
}

async function apifyInstagramBio(handle: string, code: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=60`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernames: [handle] }),
      }
    );

    if (!res.ok) return false;
    const data = await res.json();
    if (!Array.isArray(data) || !data[0]) return false;

    const bio: string = data[0].biography ?? data[0].bio ?? '';
    return bio.includes(code);
  } catch {
    return false;
  }
}

async function apifyTikTokBio(handle: string, code: string): Promise<boolean> {
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

    if (!res.ok) return false;
    const data = await res.json();
    if (!Array.isArray(data) || !data[0]) return false;

    const bio: string =
      data[0].signature ?? data[0].bioDescription ?? data[0].bio ?? '';
    return bio.includes(code);
  } catch {
    return false;
  }
}

export async function checkBioForCode(
  handle: string,
  platform: 'instagram' | 'tiktok',
  code: string
): Promise<boolean> {
  // Try direct fetch first (free, no Apify credits)
  const direct = await directFetchBio(handle, platform, code);
  if (direct) return true;

  // Fallback to Apify scraper
  return platform === 'instagram'
    ? apifyInstagramBio(handle, code)
    : apifyTikTokBio(handle, code);
}
