import { describe, expect, it } from 'vitest';
import {
  FULFIL_ENABLED_PLATFORMS,
  NOTE_MAX_LENGTH,
  REQUEST_PLATFORMS,
  isFulfilEnabled,
  isValidRequestEmail,
  isValidRequestHandle,
  normalizeRequestEmail,
  normalizeRequestHandle,
  normalizeRequestNote,
  normalizeRequestPlatform,
  normalizeSource,
  platformLabel,
  profileUrl,
} from './shared';

describe('normalizeRequestHandle', () => {
  it('strips @, whitespace and case', () => {
    expect(normalizeRequestHandle('@Foo_Bar')).toBe('foo_bar');
    expect(normalizeRequestHandle('  FooBar  ')).toBe('foobar');
    expect(normalizeRequestHandle('@@foo')).toBe('foo');
  });

  it('pulls the handle out of a pasted Instagram URL', () => {
    expect(normalizeRequestHandle('https://www.instagram.com/foo.bar/')).toBe('foo.bar');
    expect(normalizeRequestHandle('instagram.com/FooBar')).toBe('foobar');
    expect(normalizeRequestHandle('http://instagram.com/foo?hl=en')).toBe('foo');
    expect(normalizeRequestHandle('https://www.instagram.com/foo/reels/')).toBe('foo');
  });

  it('pulls the handle out of a pasted TikTok URL, @ and all', () => {
    // The @ lives INSIDE the path on TikTok, which is the whole reason it is
    // stripped after the path split rather than before it.
    expect(normalizeRequestHandle('https://www.tiktok.com/@foo')).toBe('foo');
    expect(normalizeRequestHandle('https://tiktok.com/@Foo_Bar')).toBe('foo_bar');
    expect(normalizeRequestHandle('tiktok.com/@foo.bar/video/12345')).toBe('foo.bar');
    expect(normalizeRequestHandle('https://www.tiktok.com/@foo?lang=en')).toBe('foo');
    expect(normalizeRequestHandle('  https://vm.tiktok.com/@foo/  ')).toBe('foo');
  });

  it('returns null for nothing usable', () => {
    for (const raw of [null, undefined, 42, '', '   ', '@', 'https://instagram.com/']) {
      expect(normalizeRequestHandle(raw)).toBeNull();
    }
  });

  it('is idempotent — normalizing twice changes nothing', () => {
    for (const raw of ['@Foo_Bar', 'https://www.instagram.com/foo.bar/', '  FOO  ']) {
      const once = normalizeRequestHandle(raw)!;
      expect(normalizeRequestHandle(once)).toBe(once);
    }
  });
});

describe('isValidRequestHandle', () => {
  it('accepts what Instagram accepts', () => {
    expect(isValidRequestHandle('foo')).toBe(true);
    expect(isValidRequestHandle('foo.bar_99')).toBe(true);
    expect(isValidRequestHandle('a'.repeat(30))).toBe(true);
  });

  it('rejects everything else', () => {
    expect(isValidRequestHandle('')).toBe(false);
    expect(isValidRequestHandle('a'.repeat(31))).toBe(false);
    expect(isValidRequestHandle('foo bar')).toBe(false);
    expect(isValidRequestHandle('foo-bar')).toBe(false);
    expect(isValidRequestHandle('foo/bar')).toBe(false);
    // Uppercase never reaches this function; normalization lowercases first.
    expect(isValidRequestHandle('Foo')).toBe(false);
  });
});

describe('email', () => {
  it('trims and rejects empties', () => {
    expect(normalizeRequestEmail('  a@b.co ')).toBe('a@b.co');
    expect(normalizeRequestEmail('   ')).toBeNull();
    expect(normalizeRequestEmail(null)).toBeNull();
  });

  it('accepts ordinary addresses and rejects obvious non-addresses', () => {
    expect(isValidRequestEmail('a@b.co')).toBe(true);
    expect(isValidRequestEmail('first.last+tag@sub.domain.com')).toBe(true);
    expect(isValidRequestEmail('nope')).toBe(false);
    expect(isValidRequestEmail('a@b')).toBe(false);
    expect(isValidRequestEmail('a b@c.com')).toBe(false);
    expect(isValidRequestEmail(`${'a'.repeat(250)}@b.co`)).toBe(false);
  });
});

describe('normalizeRequestNote', () => {
  it('trims, and empty becomes null rather than an empty string', () => {
    expect(normalizeRequestNote('  hi  ')).toBe('hi');
    expect(normalizeRequestNote('   ')).toBeNull();
    expect(normalizeRequestNote(undefined)).toBeNull();
  });

  it('caps at the documented length', () => {
    expect(normalizeRequestNote('x'.repeat(400))).toHaveLength(NOTE_MAX_LENGTH);
  });
});

describe('normalizeSource', () => {
  it('passes the whitelist through', () => {
    expect(normalizeSource('signup_not_found')).toBe('signup_not_found');
    expect(normalizeSource('claim_not_found')).toBe('claim_not_found');
    expect(normalizeSource('footer')).toBe('footer');
    expect(normalizeSource('brand_signup')).toBe('brand_signup');
    expect(normalizeSource('pricing_creators')).toBe('pricing_creators');
    expect(normalizeSource('home_strip')).toBe('home_strip');
  });

  it('falls back to direct for anything else', () => {
    for (const raw of [null, undefined, '', 'Footer', 'whatever', '../../etc']) {
      expect(normalizeSource(raw)).toBe('direct');
    }
  });
});

describe('normalizeRequestPlatform', () => {
  it('accepts both live platforms', () => {
    expect(normalizeRequestPlatform('instagram')).toBe('instagram');
    expect(normalizeRequestPlatform('tiktok')).toBe('tiktok');
  });

  it('returns null rather than defaulting, so the route can answer 400', () => {
    for (const raw of [null, undefined, '', 'Instagram', 'TIKTOK', 'youtube', 'twitter']) {
      expect(normalizeRequestPlatform(raw)).toBeNull();
    }
  });

  it('covers every value the form offers', () => {
    for (const p of REQUEST_PLATFORMS) {
      expect(normalizeRequestPlatform(p)).toBe(p);
    }
  });
});

describe('profileUrl', () => {
  it('builds the two platforms differently — TikTok puts the @ back', () => {
    expect(profileUrl('instagram', 'foo.bar')).toBe('https://instagram.com/foo.bar');
    expect(profileUrl('tiktok', 'foo.bar')).toBe('https://tiktok.com/@foo.bar');
  });

  it('round-trips: normalizing its own output gives the handle back', () => {
    for (const platform of REQUEST_PLATFORMS) {
      expect(normalizeRequestHandle(profileUrl(platform, 'foo_bar'))).toBe('foo_bar');
    }
  });

  it('falls back to Instagram for an unexpected stored value', () => {
    // Defensive only: the column has no CHECK, so a hand-written row could
    // carry anything. A link is better than a crash in the admin queue.
    expect(profileUrl('', 'foo')).toBe('https://instagram.com/foo');
  });
});

describe('platformLabel', () => {
  it('is the brand name, capitalised as the brand writes it', () => {
    expect(platformLabel('instagram')).toBe('Instagram');
    expect(platformLabel('tiktok')).toBe('TikTok');
    expect(platformLabel('')).toBe('Instagram');
  });
});

describe('isFulfilEnabled', () => {
  it('holds TikTok out of auto-fulfilment while Instagram stays in', () => {
    // The gap between REQUEST_PLATFORMS and FULFIL_ENABLED_PLATFORMS is the
    // whole point: a TikTok creator may ASK to be added, but nothing closes
    // their request or sends them a claim link, because TikTok verification
    // has never run successfully (CLAUDE.md, "Known open items") and that
    // link would land them on a step nobody has proven works.
    expect(isFulfilEnabled('instagram')).toBe(true);
    expect(isFulfilEnabled('tiktok')).toBe(false);
  });

  it('is a strict subset of the platforms requests can be made on', () => {
    for (const p of FULFIL_ENABLED_PLATFORMS) {
      expect(REQUEST_PLATFORMS).toContain(p);
    }
    expect(FULFIL_ENABLED_PLATFORMS.length).toBeLessThan(REQUEST_PLATFORMS.length);
  });

  it('refuses anything it does not recognise, rather than defaulting to enabled', () => {
    for (const raw of ['', 'Instagram', 'youtube', 'INSTAGRAM']) {
      expect(isFulfilEnabled(raw)).toBe(false);
    }
  });
});
