import { describe, expect, it } from 'vitest';
import { isBotUserAgent } from './bot-detection';

/**
 * The two directions are not symmetric, and the tests are written to say so.
 * A missed bot inflates teaser_viewed slightly. A misclassified human is
 * deleted from the funnel with no error anywhere — so the "must stay human"
 * block is the one that matters, and it is deliberately first.
 */
describe('isBotUserAgent — must classify as HUMAN', () => {
  it('keeps the Instagram in-app browser, which is a real creator arriving from the DM', () => {
    // The single most important row in funnel_events. Its user-agent contains
    // "Instagram" — matching that string would delete the exact population the
    // funnel exists to measure.
    expect(
      isBotUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 336.0.0.32.90 (iPhone14,3; iOS 17_5_1; es_ES; es-ES; scale=3.00; 1284x2778)',
      ),
    ).toBe(false);
    expect(
      isBotUserAgent(
        'Mozilla/5.0 (Linux; Android 13; SM-A536B Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/122.0.6261.119 Mobile Safari/537.36 Instagram 322.0.0.37.95 Android',
      ),
    ).toBe(false);
  });

  it('keeps CUBOT handsets — "bot" as a bare substring is a trap', () => {
    // CUBOT is a budget Android brand common in this funnel's target markets.
    expect(
      isBotUserAgent(
        'Mozilla/5.0 (Linux; Android 11; CUBOT NOTE 20) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Mobile Safari/537.36',
      ),
    ).toBe(false);
    expect(
      isBotUserAgent(
        'Mozilla/5.0 (Linux; Android 12; CUBOT_KING_KONG_5_PRO) AppleWebKit/537.36 Chrome/110.0.0.0 Mobile Safari/537.36',
      ),
    ).toBe(false);
  });

  it('keeps ordinary browsers', () => {
    expect(
      isBotUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
      ),
    ).toBe(false);
    expect(
      isBotUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      ),
    ).toBe(false);
  });

  it('treats a missing or empty user-agent as human, not as a bot', () => {
    // Fails in the recoverable direction: if a proxy strips the header, this
    // over-counts. The inverse would mark 100% of real traffic as bots and
    // zero the funnel silently. See the function's docstring.
    expect(isBotUserAgent(null)).toBe(false);
    expect(isBotUserAgent(undefined)).toBe(false);
    expect(isBotUserAgent('')).toBe(false);
  });
});

describe('isBotUserAgent — must classify as BOT', () => {
  it("catches Meta's link-preview crawler, which hits every DMed teaser link", () => {
    // The reason this module exists.
    expect(isBotUserAgent('facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)')).toBe(true);
    expect(isBotUserAgent('facebookexternalhit/1.1')).toBe(true);
    expect(
      isBotUserAgent('meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)'),
    ).toBe(true);
  });

  it('catches other messaging and social previews', () => {
    expect(isBotUserAgent('WhatsApp/2.23.20.0 A')).toBe(true);
    expect(isBotUserAgent('Twitterbot/1.0')).toBe(true);
  });

  it('catches search crawlers', () => {
    expect(isBotUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).toBe(true);
    expect(isBotUserAgent('Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)')).toBe(true);
    expect(isBotUserAgent('Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)')).toBe(true);
  });

  it('catches HTTP clients and headless browsers', () => {
    expect(isBotUserAgent('curl/8.4.0')).toBe(true);
    expect(isBotUserAgent('python-requests/2.31.0')).toBe(true);
    expect(isBotUserAgent('Go-http-client/2.0')).toBe(true);
    expect(
      isBotUserAgent(
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36',
      ),
    ).toBe(true);
  });

  it('catches an unlisted bot via the bot/<version> convention', () => {
    // The generic fallback: `Somebot/1.0` matches, `CUBOT NOTE 20` does not.
    expect(isBotUserAgent('Mozilla/5.0 (compatible; SomeUnknownBot/1.0; +http://example.com)')).toBe(true);
  });
});
