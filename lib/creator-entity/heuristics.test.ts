import { describe, expect, it } from 'vitest';
import type { CreatorRecord } from './load';
import {
  computeSignals,
  domainMainLabel,
  domainNameMatch,
  firstSentence,
  isExcludedDomain,
  linkHost,
  namesMatch,
  normalizeName,
  profileLinkHost,
  splitCategory,
  summarizeSignals,
} from './heuristics';

function record(overrides: Partial<NonNullable<CreatorRecord['profile']>> & { displayName?: string | null; alias?: CreatorRecord['alias'] } = {}): CreatorRecord {
  const { displayName = 'Jane Doe', alias = null, ...profile } = overrides;
  return {
    creatorId: 'c1',
    displayName,
    alias,
    profile: {
      platform: 'instagram',
      handle: 'janedoe',
      followerCount: 100_000,
      bio: null,
      website: null,
      bioLink: null,
      summary: null,
      isBusinessAccount: false,
      category: null,
      ...profile,
    },
  };
}

describe('splitCategory', () => {
  it('splits only on a comma with no space after it, and drops the "None" placeholder', () => {
    expect(splitCategory('None,Digital creator')).toEqual(['Digital creator']);
    expect(splitCategory('Beauty, cosmetic & personal care')).toEqual(['Beauty, cosmetic & personal care']);
    expect(splitCategory('None')).toEqual([]);
    expect(splitCategory(null)).toEqual([]);
  });
});

describe('links', () => {
  it('parses hosts with or without a scheme and strips www.', () => {
    expect(linkHost('http://www.helloglowery.com')).toBe('helloglowery.com');
    expect(linkHost('linktr.ee/someone')).toBe('linktr.ee');
    expect(linkHost('mailto:someone@gmail.com')).toBeNull();
    expect(linkHost('')).toBeNull();
  });

  it('excludes link-in-bio tools, platforms, email providers and their subdomains', () => {
    for (const host of ['linktr.ee', 'stan.store', 'shopltk.com', 'link.me', 'yt.openinapp.co', 'open.spotify.com', 'podcasts.apple.com', 'someone.substack.com', 'gmail.com', 'm.youtube.com']) {
      expect(isExcludedDomain(host)).toBe(true);
    }
    expect(isExcludedDomain('helloglowery.com')).toBe(false);
  });

  it("ignores an Instagram profile's own instagram.com URL, which the scraper stores when there is no link", () => {
    expect(profileLinkHost(record({ website: 'https://www.instagram.com/janedoe' }).profile)).toBeNull();
    expect(profileLinkHost(record({ platform: 'tiktok', bioLink: 'https://stan.store/x' }).profile)).toBe('stan.store');
  });
});

describe('domain_matches_name', () => {
  it('takes the label left of the public suffix, including two-part suffixes', () => {
    expect(domainMainLabel('helloglowery.com')).toBe('helloglowery');
    expect(domainMainLabel('shop.relbeauty.co.uk')).toBe('relbeauty');
    expect(domainMainLabel('app.temu.com')).toBe('temu');
    expect(domainMainLabel('altanto.com.do')).toBe('altanto');
  });

  it('normalises to lowercase ASCII letters and digits', () => {
    expect(normalizeName('Postobón')).toBe('postobon');
    expect(normalizeName('kjh.brand')).toBe('kjhbrand');
    expect(normalizeName('Rel Beauty ✨')).toBe('relbeauty');
  });

  it('needs one to contain the other, with the shorter at least 4 characters', () => {
    expect(namesMatch('glowery', 'helloglowery')).toBe(true);
    expect(namesMatch('abc', 'abcdef')).toBe(false);
    expect(namesMatch('relbeauty', 'relbeauty')).toBe(true);
  });

  it("matches the account's own domain against the handle or the display name", () => {
    expect(domainNameMatch('helloglowery.com', 'helloglowery', 'GLOWERY')).toBe('helloglowery.com ↔ @helloglowery');
    expect(domainNameMatch('relbeauty.com', 'rel.official', 'Rel Beauty')).toBe('relbeauty.com ↔ Rel Beauty');
    expect(domainNameMatch('postobon.com', 'postobonempresa', 'Postobón')).toBe('postobon.com ↔ @postobonempresa');
  });

  it('does not match affiliate links, agency pages, link tools or short names', () => {
    expect(domainNameMatch('fashionnova.com', 'janedoe', 'Jane Doe')).toBeNull();
    expect(domainNameMatch('models.com', 'janedoe', 'Jane Doe')).toBeNull();
    expect(domainNameMatch('linktr.ee', 'linktreefan', 'Linktree Fan')).toBeNull();
    expect(domainNameMatch('abc.com', 'abcdef', null)).toBeNull();
    expect(domainNameMatch(null, 'janedoe', null)).toBeNull();
  });
});

describe('computeSignals', () => {
  it('flags a GLOWERY-shaped brand account on several independent signals', () => {
    const { signals, flagCount } = computeSignals(
      record({
        handle: 'helloglowery',
        isBusinessAccount: true,
        category: 'Health/beauty',
        website: 'http://www.helloglowery.com',
        summary: '@helloglowery is a sensitive skin-focused skincare brand on Instagram with 87.8K followers. More text.',
        displayName: 'GLOWERY',
      }),
    );
    expect(signals.ig_business).toBe(true);
    expect(signals.business_category).toBe(true);
    expect(signals.summary_self_description).toBe(true);
    expect(signals.domain_matches_name).toBe(true);
    expect(signals.matches.domain_matches_name).toBe('helloglowery.com ↔ @helloglowery');
    // ig_business is recorded but never counted.
    expect(flagCount).toBe(3);
  });

  it('flags a founder described as "creator and brand founder" so the model has to resolve it', () => {
    const { signals } = computeSignals(record({ summary: '@modaminx is a fashion-forward TikTok creator and brand founder with 103K followers.' }));
    expect(signals.summary_self_description).toBe(true);
  });

  it('does not flag "brand partnerships" language', () => {
    const { signals, flagCount } = computeSignals(
      record({ summary: 'Jane is a Madrid-based lifestyle creator. She has repeat brand partnerships with Samsung.', category: 'None,Digital creator' }),
    );
    expect(signals.summary_self_description).toBe(false);
    expect(signals.creator_category).toBe(true);
    expect(flagCount).toBe(0);
  });

  it('reads handle and display-name suffixes, ignoring trailing emoji and punctuation', () => {
    expect(computeSignals(record({ handle: 'kjh.brand' })).signals.handle_suffix).toBe(true);
    expect(computeSignals(record({ handle: 'indumentariams.store' })).signals.handle_suffix).toBe(true);
    expect(computeSignals(record({ displayName: 'Rel Beauty ✨' })).signals.display_name_suffix).toBe(true);
    expect(computeSignals(record({ displayName: 'Thurley & Co.' })).signals.display_name_suffix).toBe(true);
    expect(computeSignals(record({ displayName: 'Marco' })).signals.display_name_suffix).toBe(false);
  });

  it('matches "official … account/presence/page" anywhere in the summary', () => {
    const { signals } = computeSignals(record({ summary: 'Short intro. @beverlycenter operates as the official Instagram account for the mall.' }));
    expect(signals.summary_official).toBe(true);
  });

  it('handles a creator with no profile', () => {
    const { signals, flagCount, linkHost: host } = computeSignals({ creatorId: 'c2', displayName: 'Lux Motors', profile: null, alias: null });
    expect(flagCount).toBe(0);
    expect(host).toBeNull();
    expect(signals.ig_business).toBe(false);
  });
});

describe('firstSentence', () => {
  it('does not split on the dot inside a handle', () => {
    expect(firstSentence('@kjh.brand is the official presence. Second sentence.')).toBe('@kjh.brand is the official presence.');
  });
});

describe('summarizeSignals', () => {
  it('counts flags by platform, buckets flag_count, and lists domain matches by followers', () => {
    const records = [
      record({ handle: 'shopa', website: 'https://shopa.com', followerCount: 50_000 }),
      record({ handle: 'b_official', website: 'https://bofficial.com', category: 'Clothing (Brand)', followerCount: 90_000 }),
      record({ handle: 'janedoe', website: 'https://fashionnova.com' }),
      { creatorId: 'c4', displayName: 'X', profile: null, alias: null },
    ];
    const summary = summarizeSignals(records, records.map(computeSignals));
    expect(summary.byFlag.domain_matches_name).toEqual({ instagram: 2 });
    expect(summary.flagCountDistribution).toEqual({ '0': 2, '1': 1, '2': 0, '3+': 1 });
    expect(summary.atLeastTwoFlags).toBe(1);
    expect(summary.domainMatchExamples.map((e) => e.match)).toEqual(['bofficial.com ↔ @b_official', 'shopa.com ↔ @shopa']);
    expect(summary.repeatedMatchedDomains).toEqual([]);
  });
});
