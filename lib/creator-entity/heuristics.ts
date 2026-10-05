import type { CreatorRecord } from './load';
import { NON_CREATOR_FLAGS, SIGNAL_FLAGS, type CreatorEntitySignals, type SignalFlag } from './types';

/**
 * Deterministic flags stored next to the model's verdict. Pure functions, no
 * I/O. Each flag is a boolean plus, where useful, the text it matched; no flag
 * decides anything on its own. They exist so a reviewer can see where the
 * model and the evidence disagree (/admin/creator-review's Review tab).
 */

// ── Instagram categories ────────────────────────────────────────────────────
//
// Derived from the 213 distinct values live in social_profiles.platform_data
// .category_name on 2026-10-05 (comma-joined values split, "None" dropped).
// Matched exactly; a category in neither list sets neither flag. TikTok has no
// category.

/** Categories that describe an organisation, product, place, publication or event, not a person. */
export const BUSINESS_CATEGORIES: ReadonlySet<string> = new Set([
  // Brands, products, companies
  'Brand', 'Clothing (Brand)', 'Product/service', 'Health/beauty', 'Beauty, cosmetic & personal care',
  'Jewelry/watches', 'Accessories', 'Apparel & clothing', 'Bags/Luggage', 'Appliances', 'Household supplies',
  'Home decor', 'Kitchen/cooking', 'Vitamins/supplements', 'Pet Supplies', 'Food & beverage', 'Food & Drink',
  'Cars', 'Retail company', 'Jewelry & Watches Company', 'Textile Company', 'Software Company',
  'Internet company', 'Motor vehicle company', 'Automotive Manufacturer', 'App page', 'Content & Apps',
  'Business', 'Business service', 'Business & Utility Services', 'Professional Services', 'Home Services',
  'Lifestyle Services', 'Local service', 'Environmental Service', 'Transportation Service',
  'Transportation & Accomodation Services', 'Party Entertainment Service', 'Advertising Agency',
  'Public Relations Agency', 'Real Estate', 'Medical & health',
  // Stores
  'Shopping & retail', 'Personal Goods & General Merchandise Stores', "Women's clothing store", 'Clothing store',
  "Men's clothing store", 'Footwear store', 'Boutique Store', 'Beauty Store', 'Cosmetics store', 'Bookstore',
  'Furniture store', 'Gift Shop', 'Toy Store', 'Sporting Goods Store', 'Jewelry & Watches Store',
  'Sunglasses & Eyewear Store', 'Building Material Store', 'Home Goods Stores', 'Grocery Store',
  'Organic Grocery Store', 'Supermarket', 'Candy Store', 'Perfumery', 'Tattoo & Piercing Shop',
  'Car dealership', 'Auto Dealers', 'Automotive Service',
  // Places and venues
  'Restaurant', 'Restaurants', 'American Restaurant', 'Brazilian Restaurant', 'Dim Sum Restaurant',
  'European Restaurant', 'French Restaurant', 'Health Food Restaurant', 'Breakfast & Brunch Restaurant',
  'Bakery', 'Bagel Shop', 'Ice Cream Shop', 'Frozen Yogurt Shop', 'Food Truck', 'Hotel', 'Hotel resort',
  'Hotel & Lodging', 'Beach Resort', 'Spa', 'Medical Spa', 'Beauty Salon', 'Hair Salon', 'Pet Groomer',
  'Gym/Physical Fitness Center', 'Pilates Studio', 'Dance Studio', 'Interior Design Studio',
  'Dance & Night Club', 'Shopping Mall', 'Shopping District', 'Movie Theater', 'Art Gallery', 'Museum',
  'Stadium, Arena & Sports Venue', 'Playground', 'Go-Kart Track', 'Haunted House', 'Sports & recreation',
  // Media and publications
  'Media/news company', 'Media', 'Magazine', 'Newspaper', 'Publisher', 'Publishers', 'TV channel',
  'Radio station', 'Podcast', 'Movie/television studio', 'Movie', 'Song', 'News & media website',
  'Entertainment website', 'Local & travel website', 'Health & wellness website', 'Fan page', 'Community',
  // Events, teams, organisations
  'Festival', 'Event', 'Local Events', 'Sports Event', 'Concert Tour', 'Rodeo', 'Professional Sports Team',
  'Sports team', 'School Sports Team', 'Sports league', 'College & university', 'Sorority & Fraternity',
  'Nonprofit organization', 'Non-Governmental Organization (NGO)', 'Environmental Conservation Organization',
  'Government organization', 'Government Agencies',
]);

/** Categories that describe a person publishing as themselves. Sets creator_category, a counter-signal. */
export const CREATOR_CATEGORIES: ReadonlySet<string> = new Set([
  'Digital creator', 'Reel creator', 'Creator', 'Creators & Celebrities', 'Personal blog', 'Personal Website',
  'Blogger', 'Public figure', 'Just for fun', 'Artist', 'Athlete', 'Entrepreneur', 'Fashion Model', 'Model',
  'Fitness Model', 'Photographer', 'Makeup Artist', 'Nail Artist', 'Hair Stylist', 'Fashion Stylist',
  'Fashion Designer', 'Designer', 'Image Consultant', 'Fitness Trainer', 'Coach', 'Personal Coach',
  'Nutritionist', 'Dietician', 'Dermatologist', 'Doctor', 'Psychologist', 'Scientist', 'Actor', 'Comedian',
  'Musician', 'Musician/band', 'DJ', 'Dancer', 'Chef', 'Journalist', 'Writer', 'Author', 'Editor',
  'News personality', 'Producer', 'Film Director', 'Film Editor', 'Creative Director', 'Visual/Art Director',
  'Sculptor', 'Politician', 'Gamer', 'Astrologist', 'Motivational speaker',
]);

/**
 * Split platform_data.category_name into its parts. The scraper joins several
 * categories with a bare comma ("None,Digital creator"), but real categories
 * contain a comma followed by a space ("Beauty, cosmetic & personal care"), so
 * only a comma NOT followed by whitespace separates. "None" is the scraper's
 * placeholder, not a category.
 */
export function splitCategory(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/,(?!\s)/)
    .map((part) => part.trim())
    .filter((part) => part !== '' && part !== 'None');
}

// ── Links ───────────────────────────────────────────────────────────────────

/**
 * Domains that are NOT an account's own domain: the tools and platforms
 * creators use. A link to one of these never counts for domain_matches_name,
 * even when its name happens to match. Matched as the host itself or any
 * subdomain of it.
 */
export const NOT_OWN_DOMAINS: readonly string[] = [
  // Link-in-bio tools and creator storefronts
  'linktr.ee', 'linktree.com', 'beacons.ai', 'beacons.page', 'stan.store', 'shopltk.com', 'liketoknow.it',
  'ltk.app', 'rstyle.me', 'shopmy.us', 'linkin.bio', 'lnk.bio', 'bio.site', 'bio.link', 'campsite.bio',
  'hoo.be', 'msha.ke', 'taplink.cc', 'taplink.ws', 'solo.to', 'carrd.co', 'snipfeed.co', 'linkpop.com',
  'allmylinks.com', 'bento.me', 'linkr.bio', 'tap.bio', 'flow.page', 'komi.io', 'direct.me', 'withkoji.com',
  'koji.to', 'lnk.to', 'linkfire.com', 'fanfix.io', 'throne.com', 'ko-fi.com', 'buymeacoffee.com',
  'cameo.com', 'gumroad.com', 'calendly.com',
  'link.me', 'likeshop.me', 'sprout.link', 'amzlink.to', 'empli.fi', 'zez.am', 'linkbio.co', 'tr.ee',
  'liketk.it', 'visitstore.bio', 'wishlink.com', 'atom.bio', 'clicklinkin.bio', 'creatorlink.shop',
  'yt.openinapp.co', 'depop.app.link', 'bio.to',
  'amazon.com', 'amazon.co.uk', 'amazon.de', 'amazon.es', 'amazon.fr', 'amazon.it', 'amazon.ca',
  'amazon.com.mx', 'amazon.com.br', 'amzn.to', 'amzn.eu',
  // Social and content platforms
  'instagram.com', 'instagr.am', 'tiktok.com', 'youtube.com', 'youtu.be', 'facebook.com', 'fb.com', 'fb.me',
  'x.com', 'twitter.com', 'threads.net', 'threads.com', 'pinterest.com', 'pin.it', 'twitch.tv',
  'spotify.com', 'spotify.link', 'podcasts.apple.com', 'music.apple.com', 'patreon.com', 'substack.com',
  'onlyfans.com', 'fansly.com', 'snapchat.com', 'linkedin.com', 'vsco.co', 'soundcloud.com', 'vimeo.com',
  'tumblr.com', 'reddit.com', 'discord.gg', 'discord.com', 't.me', 'telegram.me', 'wa.me', 'wa.link',
  'whatsapp.com',
  // Email providers
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.es', 'yahoo.co.uk', 'hotmail.com', 'hotmail.es',
  'hotmail.co.uk', 'outlook.com', 'outlook.es', 'live.com', 'icloud.com', 'me.com', 'aol.com', 'proton.me',
  'protonmail.com', 'gmx.com', 'gmx.de', 'mail.com', 'yandex.com', 'yandex.ru',
  // URL shorteners and shared document hosts
  'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'rebrand.ly', 'cutt.ly', 'shorturl.at', 'ow.ly', 'buff.ly',
  'forms.gle', 'google.com',
];

/** Lowercased host of a stored link, without `www.`; null when it does not parse as a web URL. */
export function linkHost(url: string | null | undefined): string | null {
  const raw = url?.trim();
  if (!raw) return null;
  const hasWebScheme = /^https?:\/\//i.test(raw);
  // mailto:, tel: and the like are not links to a site. A bare "host:8080" is (the colon is followed by a digit).
  if (!hasWebScheme && /^[a-z][a-z0-9+.-]*:(?!\d)/i.test(raw)) return null;
  try {
    const parsed = new URL(hasWebScheme ? raw : `https://${raw}`);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    const host = parsed.hostname.toLowerCase().replace(/\.$/, '').replace(/^www\./, '');
    return host.includes('.') ? host : null;
  } catch {
    return null;
  }
}

/** True for a host in NOT_OWN_DOMAINS, or a subdomain of one. */
export function isExcludedDomain(host: string): boolean {
  return NOT_OWN_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

/**
 * Two-part public suffixes, so "relbeauty.co.uk" yields "relbeauty", not "co".
 * Not the full public suffix list (no dependency) — the common commercial
 * second levels for the markets in this database.
 */
const TWO_PART_SUFFIXES: ReadonlySet<string> = new Set([
  'co.uk', 'org.uk', 'me.uk', 'ac.uk', 'com.au', 'net.au', 'org.au', 'co.nz', 'co.za', 'co.in', 'co.id',
  'co.jp', 'co.kr', 'co.il', 'co.th', 'co.ke', 'co.at', 'co.cr',
  'com.br', 'net.br', 'com.mx', 'com.ar', 'com.co', 'com.pe', 'com.ve', 'com.ec', 'com.uy', 'com.py',
  'com.bo', 'com.do', 'com.gt', 'com.pa', 'com.sv', 'com.hn', 'com.ni', 'com.pr', 'com.es', 'com.pt',
  'com.tr', 'com.pl', 'com.cn', 'com.hk', 'com.tw', 'com.sg', 'com.my', 'com.ph', 'com.vn', 'com.ng',
  'com.eg', 'com.sa',
]);

/** The name part of a host, left of its public suffix: "shop.relbeauty.co.uk" → "relbeauty", "app.temu.com" → "temu". */
export function domainMainLabel(host: string): string | null {
  const labels = host.split('.').filter(Boolean);
  if (labels.length < 2) return null;
  const suffixLength = labels.length >= 3 && TWO_PART_SUFFIXES.has(labels.slice(-2).join('.')) ? 2 : 1;
  return labels[labels.length - suffixLength - 1] ?? null;
}

/** Lowercase ASCII letters and digits only, accents folded first ("Postobón" → "postobon", "kjh.brand" → "kjhbrand"). */
export function normalizeName(text: string | null | undefined): string {
  return (text ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Shortest string that may count as a name match; anything shorter matches too much by accident. */
const MIN_NAME_MATCH = 4;

/** One contains the other, and the shorter one has at least MIN_NAME_MATCH characters. */
export function namesMatch(a: string, b: string): boolean {
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  return shorter.length >= MIN_NAME_MATCH && longer.includes(shorter);
}

/**
 * domain_matches_name: the profile link's domain looks like the account's own
 * name, i.e. its main label matches the normalised handle or display name.
 * "helloglowery.com" ↔ @helloglowery and "relbeauty.com" ↔ "Rel Beauty" match;
 * a creator's affiliate link (fashionnova.com), agency page (models.com) or
 * link tool does not. Returns what matched, for signals.matches, else null.
 */
export function domainNameMatch(host: string | null, handle: string | null, displayName: string | null): string | null {
  if (!host || isExcludedDomain(host)) return null;
  const label = normalizeName(domainMainLabel(host));
  if (!label) return null;
  if (handle && namesMatch(label, normalizeName(handle))) return `${host} ↔ @${handle}`;
  if (displayName && namesMatch(label, normalizeName(displayName))) return `${host} ↔ ${displayName.trim()}`;
  return null;
}

/**
 * The link the profile shows: Instagram's website, else TikTok's bio link. An
 * Instagram account with no external URL stores its own profile URL in
 * `website`, which is not a link at all, so that one reads as none.
 */
export function profileLinkHost(profile: CreatorRecord['profile']): string | null {
  if (!profile) return null;
  const host = linkHost(profile.website) ?? linkHost(profile.bioLink);
  if (host && profile.platform === 'instagram' && (host === 'instagram.com' || host.endsWith('.instagram.com'))) {
    return null;
  }
  return host;
}

// ── Text ────────────────────────────────────────────────────────────────────

/** First sentence of an AI summary. Handles like "@kjh.brand" have no space after the dot, so they don't split. */
export function firstSentence(text: string | null | undefined): string {
  if (!text) return '';
  return text.split(/(?<=[.!?])\s+(?=[A-Z@"'“])/)[0] ?? '';
}

/**
 * "is/as a|an|the [official] … brand/company/…" in the summary's first
 * sentence — the summary describing the account as an organisation. The
 * pattern the 2026-10-04 recon measured at 316 creators, with a few more
 * nouns. It also fires on "a creator and brand founder", deliberately: that is
 * the case a reviewer should see the model resolve.
 */
const SELF_DESCRIPTION_RE =
  /\b(?:is|as)\s+(?:the|an|a)\s+(?:official\s+)?(?:[\p{L}\p{N}'’&./-]+\s+){0,4}?(?:brand|company|retailer|store|shop|boutique|label|magazine|publication|publisher|agency|hotel|resort|restaurant|venue|clinic|salon|studio|platform|marketplace)(?:'s|’s)?\b/iu;

/** "official … account/presence/page" anywhere in the summary. */
const OFFICIAL_RE = /\bofficial(?:\s+[\p{L}\p{N}'’&./-]+){0,4}?\s+(?:account|presence|page|profile|channel|handle)\b/iu;

const HANDLE_SUFFIX_RE = /(?:official|shop|store|_hq|brand)$/;

const DISPLAY_NAME_SUFFIX_RE = /\b(?:beauty|skincare|cosmetics|co|inc|ltd|gmbh|llc|store|shop|official|studio|clinic)$/iu;

/** Trailing emoji, punctuation and spaces off a display name, so "Rel Beauty ✨" and "Thurley & Co." still end in a word. */
function trimDisplayName(name: string): string {
  return name.replace(/[^\p{L}\p{N}]+$/u, '');
}

// ── Signals ─────────────────────────────────────────────────────────────────

export type ComputedSignals = {
  signals: CreatorEntitySignals;
  /** True NON_CREATOR_FLAGS — excludes ig_business and creator_category. */
  flagCount: number;
  /** The profile link's host, whether or not it matched — classify.ts sends it to the model as link_domain. */
  linkHost: string | null;
};

export function computeSignals(record: CreatorRecord): ComputedSignals {
  const profile = record.profile;
  const matches: Partial<Record<SignalFlag, string>> = {};

  const igBusiness = profile?.platform === 'instagram' && profile.isBusinessAccount === true;

  const categories = profile?.platform === 'instagram' ? splitCategory(profile.category) : [];
  const businessCategory = categories.find((c) => BUSINESS_CATEGORIES.has(c));
  if (businessCategory) matches.business_category = businessCategory;
  const creatorCategory = categories.find((c) => CREATOR_CATEGORIES.has(c));
  if (creatorCategory) matches.creator_category = creatorCategory;

  const selfDescription = firstSentence(profile?.summary).match(SELF_DESCRIPTION_RE)?.[0];
  if (selfDescription) matches.summary_self_description = selfDescription;

  const official = profile?.summary?.match(OFFICIAL_RE)?.[0];
  if (official) matches.summary_official = official;

  const handleSuffix = profile?.handle.match(HANDLE_SUFFIX_RE)?.[0];
  if (handleSuffix) matches.handle_suffix = profile?.handle;

  const displayNameSuffix = record.displayName ? trimDisplayName(record.displayName).match(DISPLAY_NAME_SUFFIX_RE)?.[0] : undefined;
  if (displayNameSuffix) matches.display_name_suffix = record.displayName ?? undefined;

  const host = profileLinkHost(profile);
  const domainMatch = domainNameMatch(host, profile?.handle ?? null, record.displayName);
  if (domainMatch) matches.domain_matches_name = domainMatch;

  if (record.alias) matches.alias_match = `${record.alias.entityType}: ${record.alias.canonicalName ?? record.alias.alias}`;

  const signals: CreatorEntitySignals = {
    ig_business: igBusiness,
    business_category: Boolean(businessCategory),
    summary_self_description: Boolean(selfDescription),
    summary_official: Boolean(official),
    handle_suffix: Boolean(handleSuffix),
    display_name_suffix: Boolean(displayNameSuffix),
    domain_matches_name: Boolean(domainMatch),
    alias_match: Boolean(record.alias),
    creator_category: Boolean(creatorCategory),
    matches,
  };
  const flagCount = NON_CREATOR_FLAGS.filter((flag) => signals[flag]).length;
  return { signals, flagCount, linkHost: host };
}

// ── Summary for the CLI report ──────────────────────────────────────────────

export type HeuristicsSummary = {
  records: number;
  /** Per flag, true count by platform ("none" = creators with no profile). */
  byFlag: Record<SignalFlag, Record<string, number>>;
  /** flag_count distribution: '0', '1', '2', '3+'. */
  flagCountDistribution: Record<'0' | '1' | '2' | '3+', number>;
  atLeastOneFlag: number;
  atLeastTwoFlags: number;
  /** At least one NON_CREATOR flag OR ig_business. */
  anyFlagIncludingIgBusiness: number;
  /** Up to `examples` domain_matches_name matches, spread evenly across follower counts, highest first. */
  domainMatchExamples: { match: string; platform: string; followers: number | null }[];
  /** Matched hosts that recur across accounts — one domain matching several names is worth a look. */
  repeatedMatchedDomains: [string, number][];
  /** Instagram category parts in neither list, most frequent first. */
  unlistedCategories: [string, number][];
};

export function summarizeSignals(records: readonly CreatorRecord[], computed: readonly ComputedSignals[], examples = 20): HeuristicsSummary {
  const byFlag = Object.fromEntries(SIGNAL_FLAGS.map((flag) => [flag, {} as Record<string, number>])) as Record<SignalFlag, Record<string, number>>;
  const flagCountDistribution = { '0': 0, '1': 0, '2': 0, '3+': 0 };
  const matchedDomains = new Map<string, number>();
  const domainMatches: { match: string; platform: string; followers: number | null }[] = [];
  const unlisted = new Map<string, number>();
  let atLeastOneFlag = 0;
  let atLeastTwoFlags = 0;
  let anyFlagIncludingIgBusiness = 0;

  records.forEach((record, i) => {
    const { signals, flagCount, linkHost: host } = computed[i];
    const platform = record.profile?.platform ?? 'none';
    for (const flag of SIGNAL_FLAGS) {
      if (signals[flag]) byFlag[flag][platform] = (byFlag[flag][platform] ?? 0) + 1;
    }
    flagCountDistribution[flagCount >= 3 ? '3+' : (String(flagCount) as '0' | '1' | '2')]++;
    if (flagCount >= 1) atLeastOneFlag++;
    if (flagCount >= 2) atLeastTwoFlags++;
    if (flagCount >= 1 || signals.ig_business) anyFlagIncludingIgBusiness++;
    if (signals.domain_matches_name && host) {
      matchedDomains.set(host, (matchedDomains.get(host) ?? 0) + 1);
      domainMatches.push({ match: signals.matches.domain_matches_name ?? host, platform, followers: record.profile?.followerCount ?? null });
    }
    if (record.profile?.platform === 'instagram') {
      for (const part of splitCategory(record.profile.category)) {
        if (!BUSINESS_CATEGORIES.has(part) && !CREATOR_CATEGORIES.has(part)) unlisted.set(part, (unlisted.get(part) ?? 0) + 1);
      }
    }
  });

  const top = (m: Map<string, number>, n: number) => [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n);
  const byFollowers = domainMatches.sort((a, b) => (b.followers ?? -1) - (a.followers ?? -1) || a.match.localeCompare(b.match));
  const spread =
    byFollowers.length <= examples
      ? byFollowers
      : Array.from({ length: examples }, (_, i) => byFollowers[Math.round((i * (byFollowers.length - 1)) / (examples - 1))]);
  return {
    records: records.length,
    byFlag,
    flagCountDistribution,
    atLeastOneFlag,
    atLeastTwoFlags,
    anyFlagIncludingIgBusiness,
    domainMatchExamples: spread,
    repeatedMatchedDomains: top(matchedDomains, 50).filter(([, n]) => n > 1),
    unlistedCategories: top(unlisted, 50),
  };
}
