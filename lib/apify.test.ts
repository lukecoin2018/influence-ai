import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * lib/apify.ts reads APIFY_API_TOKEN at module scope, so the token has to be
 * in place before the module is imported — hence the dynamic import below
 * rather than a static one at the top of the file. Without it every Apify
 * branch short-circuits to `unavailable` and half of these cases would pass
 * for the wrong reason.
 */
type ApifyModule = typeof import('./apify');
let checkBioForCode: ApifyModule['checkBioForCode'];
let tiktokSignatureFromHtml: ApifyModule['tiktokSignatureFromHtml'];

const HANDLE = 'lmg.media';
const CODE = 'IIT-K7M2QX';

/** A TikTok profile page as the server renders it for a desktop browser. */
function tiktokProfilePage(uniqueId: string, signature: unknown): string {
  const blob = {
    __DEFAULT_SCOPE__: {
      'webapp.app-context': { language: 'en' },
      'webapp.user-detail': {
        userInfo: { user: { id: '1', uniqueId, signature } },
        statusCode: 0,
      },
    },
  };
  return `<!DOCTYPE html><html><head><title>TikTok - Make Your Day</title></head><body><script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">${JSON.stringify(blob)}</script></body></html>`;
}

/** A 200 that is not a profile page: TikTok's challenge / consent interstitial. It even mentions the handle. */
const CHALLENGE_PAGE = `<!DOCTYPE html><html><head><title>Verify to continue</title></head><body><p>Please verify to continue to @${HANDLE}</p></body></html>`;

function html(body: string, status = 200): Response {
  return new Response(body, { status, headers: { 'Content-Type': 'text/html' } });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();

/** Route the mocked fetch by host: one answer for tiktok/instagram, one for Apify. */
function route(direct: () => Response, apify: () => Response = () => json([])) {
  fetchMock.mockImplementation(async (url) =>
    url.startsWith('https://api.apify.com/') ? apify() : direct()
  );
}

function calls(): { url: string; init?: RequestInit }[] {
  return fetchMock.mock.calls.map(([url, init]) => ({ url, init }));
}

beforeAll(async () => {
  process.env.APIFY_API_TOKEN = 'test-token';
  const mod = await import('./apify');
  checkBioForCode = mod.checkBioForCode;
  tiktokSignatureFromHtml = mod.tiktokSignatureFromHtml;
});

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('tiktokSignatureFromHtml', () => {
  it('reads the bio out of the rehydration blob for the requested handle', () => {
    expect(tiktokSignatureFromHtml(tiktokProfilePage(HANDLE, `hello ${CODE}`), HANDLE)).toBe(`hello ${CODE}`);
  });

  it('matches the handle case-insensitively, since social_profiles stores it lowercased', () => {
    expect(tiktokSignatureFromHtml(tiktokProfilePage('LMG.Media', 'bio'), HANDLE)).toBe('bio');
  });

  it('is null for a page without the blob', () => {
    expect(tiktokSignatureFromHtml(CHALLENGE_PAGE, HANDLE)).toBeNull();
  });

  it('is null for a blob that names a different handle', () => {
    expect(tiktokSignatureFromHtml(tiktokProfilePage('someone.else', CODE), HANDLE)).toBeNull();
  });

  it('is null when the signature is not a string', () => {
    expect(tiktokSignatureFromHtml(tiktokProfilePage(HANDLE, null), HANDLE)).toBeNull();
    expect(tiktokSignatureFromHtml(tiktokProfilePage(HANDLE, undefined), HANDLE)).toBeNull();
  });

  it('is null for an unparseable blob', () => {
    const broken = '<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">{not json</script>';
    expect(tiktokSignatureFromHtml(broken, HANDLE)).toBeNull();
  });
});

describe('checkBioForCode — TikTok direct fetch', () => {
  it('sends a desktop browser user-agent to tiktok.com, not Googlebot', async () => {
    route(() => html(tiktokProfilePage(HANDLE, CODE)));
    await checkBioForCode(HANDLE, 'tiktok', CODE);

    const [first] = calls();
    expect(first.url).toBe(`https://www.tiktok.com/@${HANDLE}`);
    const ua = String((first.init?.headers as Record<string, string>)['User-Agent']);
    expect(ua).toContain('Chrome/');
    expect(ua).not.toContain('Googlebot');
  });

  it('is found from the blob alone, without spending an Apify run', async () => {
    route(() => html(tiktokProfilePage(HANDLE, `LMG Media influencer services ${CODE}`)));
    expect(await checkBioForCode(HANDLE, 'tiktok', CODE)).toBe('found');
    expect(calls()).toHaveLength(1);
  });

  it('a 403 is unavailable and falls through to Apify', async () => {
    route(
      () => html('Forbidden', 403),
      () => json([{ username: HANDLE, bio: `bio ${CODE}` }])
    );
    expect(await checkBioForCode(HANDLE, 'tiktok', CODE)).toBe('found');
    expect(calls()).toHaveLength(2);
  });

  it('a 200 challenge page without the blob is unavailable, never absent', async () => {
    // The page mentions the handle, which is what the Instagram guard keys
    // on — for TikTok that is not enough, and this case is why.
    route(() => html(CHALLENGE_PAGE), () => json([]));
    expect(await checkBioForCode(HANDLE, 'tiktok', CODE)).toBe('unavailable');
    expect(calls()).toHaveLength(2);
  });

  it('a blob for a different handle is unavailable', async () => {
    route(() => html(tiktokProfilePage('someone.else', CODE)), () => json([]));
    expect(await checkBioForCode(HANDLE, 'tiktok', CODE)).toBe('unavailable');
  });

  it('a blob for this handle whose bio lacks the code is absent', async () => {
    route(() => html(tiktokProfilePage(HANDLE, 'LMG Media influencer services')), () => json([{ bio: 'still nothing' }]));
    expect(await checkBioForCode(HANDLE, 'tiktok', CODE)).toBe('absent');
  });

  it('a network error is unavailable', async () => {
    fetchMock.mockImplementation(async (url) => {
      if (url.startsWith('https://api.apify.com/')) return json([]);
      throw new Error('ECONNRESET');
    });
    expect(await checkBioForCode(HANDLE, 'tiktok', CODE)).toBe('unavailable');
  });
});

describe('checkBioForCode — TikTok Apify fallback (abe~tiktok-profile-scraper)', () => {
  beforeEach(() => {
    // Every case here starts from the direct fetch being blocked.
    route(() => html('Forbidden', 403));
  });

  it('runs abe synchronously with { usernames: [handle] } and a 60s timeout', async () => {
    route(() => html('Forbidden', 403), () => json([{ bio: CODE }]));
    await checkBioForCode(HANDLE, 'tiktok', CODE);

    const apify = calls()[1];
    expect(apify.url).toContain('/v2/acts/abe~tiktok-profile-scraper/run-sync-get-dataset-items?');
    expect(apify.url).toContain('token=test-token');
    expect(apify.url).toContain('timeout=60');
    expect(apify.init?.method).toBe('POST');
    expect(JSON.parse(String(apify.init?.body))).toEqual({ usernames: [HANDLE] });
  });

  it('an item whose bio carries the code is found', async () => {
    route(() => html('Forbidden', 403), () => json([{ username: HANDLE, bio: `LMG Media ${CODE}`, tagline: 'LMG Media' }]));
    expect(await checkBioForCode(HANDLE, 'tiktok', CODE)).toBe('found');
  });

  it('an item whose bio lacks the code is absent', async () => {
    route(() => html('Forbidden', 403), () => json([{ username: HANDLE, bio: 'LMG Media influencer services' }]));
    expect(await checkBioForCode(HANDLE, 'tiktok', CODE)).toBe('absent');
  });

  it('an empty dataset is unavailable', async () => {
    route(() => html('Forbidden', 403), () => json([]));
    expect(await checkBioForCode(HANDLE, 'tiktok', CODE)).toBe('unavailable');
  });

  it('an item carrying an error field is unavailable, even if it has a bio', async () => {
    route(() => html('Forbidden', 403), () => json([{ username: HANDLE, error: 'Profile not found', bio: '' }]));
    expect(await checkBioForCode(HANDLE, 'tiktok', CODE)).toBe('unavailable');
  });

  it('an item without a string bio is unavailable', async () => {
    route(() => html('Forbidden', 403), () => json([{ username: HANDLE }]));
    expect(await checkBioForCode(HANDLE, 'tiktok', CODE)).toBe('unavailable');
    route(() => html('Forbidden', 403), () => json([{ username: HANDLE, bio: null }]));
    expect(await checkBioForCode(HANDLE, 'tiktok', CODE)).toBe('unavailable');
  });

  it('a non-2xx from Apify (plan, credit, auth, timeout) is unavailable', async () => {
    route(() => html('Forbidden', 403), () => json({ error: { type: 'insufficient-permissions' } }, 403));
    expect(await checkBioForCode(HANDLE, 'tiktok', CODE)).toBe('unavailable');
  });
});

describe('checkBioForCode — Instagram is untouched', () => {
  it('still sends Googlebot and falls back to the Instagram actor, never abe', async () => {
    route(
      () => html(`<html><body>@${HANDLE} profile</body></html>`),
      () => json([{ username: HANDLE, biography: `bio ${CODE}` }])
    );
    expect(await checkBioForCode(HANDLE, 'instagram', CODE)).toBe('found');

    const [direct, apify] = calls();
    expect(direct.url).toBe(`https://www.instagram.com/${HANDLE}/`);
    expect(String((direct.init?.headers as Record<string, string>)['User-Agent'])).toContain('Googlebot');
    expect(apify.url).toContain('/v2/acts/apify~instagram-profile-scraper/');
    expect(apify.url).not.toContain('abe~');
  });

  it('a 200 that mentions the handle but not the code is absent, as before', async () => {
    route(() => html(`<html><body>@${HANDLE} profile</body></html>`), () => json([]));
    expect(await checkBioForCode(HANDLE, 'instagram', CODE)).toBe('absent');
  });
});

describe('checkBioForCode — log line', () => {
  it('names platform, both paths and the outcome, and never the code', async () => {
    route(() => html('Forbidden', 403), () => json([{ bio: CODE }]));
    await checkBioForCode(HANDLE, 'tiktok', CODE);

    const lines = (console.info as unknown as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]));
    const line = lines.find((l) => l.startsWith('[verify-bio]'));
    expect(line).toBe(`[verify-bio] platform=tiktok handle=@${HANDLE} direct=unavailable apify=found outcome=found`);
    expect(line).not.toContain(CODE);
  });

  it('reports the Apify path as skipped when the direct fetch settled it', async () => {
    route(() => html(tiktokProfilePage(HANDLE, CODE)));
    await checkBioForCode(HANDLE, 'tiktok', CODE);
    const lines = (console.info as unknown as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]));
    expect(lines.find((l) => l.startsWith('[verify-bio]'))).toContain('direct=found apify=skipped outcome=found');
  });
});
