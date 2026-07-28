/**
 * User-agent-only bot classification for funnel_events.is_bot
 * (supabase/migrations/0011_funnel_events.sql).
 *
 * User-agent ONLY, by decision: it is the single identifying signal that is
 * identical on Vercel and on the VPS. IP and geo headers are not — Vercel
 * injects x-vercel-ip-* and x-real-ip, the VPS forwards whatever its reverse
 * proxy is configured to forward, and this repo carries no proxy config to
 * confirm what that is. A rule built on headers that exist in one deployment
 * and not the other produces two different funnels for the same product.
 *
 * The classifier is deliberately CONSERVATIVE — it would rather miss an
 * unknown bot than mislabel a real creator. A bot counted as human inflates
 * teaser_viewed a little; a human counted as a bot is deleted from the funnel
 * silently, and the humans most at risk of that are exactly this audience
 * (see the CUBOT note below). funnel_events keeps the raw user_agent, so
 * is_bot can be recomputed later if this turns out too loose.
 *
 * Pure, dependency-free, and safe to import from any runtime — including
 * middleware's edge bundle.
 */

/**
 * Matched as plain substrings against the lowercased user-agent. Every entry
 * is long enough to be unambiguous on its own.
 *
 * facebookexternalhit is the entry that justifies this whole file: it is
 * Meta's link-preview crawler, and it fetches every /claim/[handle] link the
 * moment it is pasted into an Instagram DM. That route has no generateMetadata
 * and no route-level opengraph-image, so the crawler pulls the full page HTML
 * — a complete server render, indistinguishable from a creator's visit except
 * by this string.
 *
 * NOTE what is deliberately NOT in this list: the bare string "instagram".
 * Instagram's in-app browser also puts "Instagram <version>" in its
 * user-agent, and that is a REAL creator arriving from the DM — the single
 * most important row in this table. Matching "instagram" would silently
 * delete the exact population this funnel exists to measure.
 */
const BOT_SUBSTRINGS: readonly string[] = [
  // Social / messaging link previews — the ones that will actually hit a DMed link
  'facebookexternalhit',
  'facebookcatalog',
  'facebot',
  'meta-externalagent',
  'meta-externalfetcher',
  'whatsapp',
  'telegrambot',
  'twitterbot',
  'linkedinbot',
  'discordbot',
  'slackbot',
  'slack-imgproxy',
  'redditbot',
  'pinterest',
  'embedly',
  'quora link preview',
  'skypeuripreview',
  'vkshare',
  'tumblr',
  'nuzzel',
  'outbrain',
  // Search / SEO crawlers
  'googlebot',
  'google-inspectiontool',
  'storebot-google',
  'bingbot',
  'applebot',
  'yandexbot',
  'duckduckbot',
  'baiduspider',
  'sogou',
  'ahrefsbot',
  'semrushbot',
  'mj12bot',
  'dotbot',
  'petalbot',
  'bytespider',
  'gptbot',
  'ccbot',
  'claudebot',
  'perplexitybot',
  // Headless browsers and automation
  'headlesschrome',
  'chrome-lighthouse',
  'lighthouse',
  'phantomjs',
  'puppeteer',
  'playwright',
  'selenium',
  // HTTP clients — no human behind these
  'python-requests',
  'python-urllib',
  'aiohttp',
  'go-http-client',
  'okhttp',
  'java/',
  'axios/',
  'node-fetch',
  'undici',
  'libwww-perl',
  'curl/',
  'wget/',
  'httpie',
  'postmanruntime',
  'insomnia',
  // Uptime / infrastructure probes
  'uptimerobot',
  'pingdom',
  'statuscake',
  'betteruptime',
  'newrelicpinger',
  'datadog',
  'vercel-screenshot',
  'vercel-favicon',
];

/**
 * Generic tokens, matched with boundaries rather than as bare substrings.
 *
 * "bot" as a plain substring is a trap: CUBOT is a budget Android phone brand
 * whose user-agent reads `... Android 11; CUBOT NOTE 20 ...`, and those
 * handsets are common in exactly the markets this funnel targets. Substring
 * matching would classify those creators as crawlers and delete them.
 *
 * Two alternations:
 *   1. the token standing alone, i.e. not glued to another letter on either
 *      side — catches `(compatible; bot)` but not `cubot`.
 *   2. `bot/` followed by a digit — the near-universal `Somebot/1.0` version
 *      convention, which catches named bots not in the list above without
 *      matching `CUBOT NOTE 20`.
 */
const BOT_TOKEN_PATTERN = /(?:^|[^a-z])(?:bot|crawler|spider|scraper|fetcher)(?:[^a-z]|$)|bot\/\d/;

/**
 * True when the user-agent looks automated.
 *
 * A missing or empty user-agent returns FALSE — not a bot. That is the
 * deliberate direction to fail in: a real browser always sends one, so an
 * absent header most likely means a proxy stripped it, and the VPS's proxy
 * configuration is not in this repo. Classifying "no user-agent" as a bot
 * would, in that case, mark 100% of real traffic as bots and zero out the
 * funnel with no visible error. Over-counting a handful of scripts is the
 * cheaper mistake.
 */
export function isBotUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;

  const ua = userAgent.toLowerCase();
  if (BOT_SUBSTRINGS.some((token) => ua.includes(token))) return true;
  return BOT_TOKEN_PATTERN.test(ua);
}
