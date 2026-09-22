import { describe, expect, it } from 'vitest';
import {
  NOTE_MAX_LENGTH,
  isValidRequestEmail,
  isValidRequestHandle,
  normalizeRequestEmail,
  normalizeRequestHandle,
  normalizeRequestNote,
  normalizeSource,
} from './shared';

describe('normalizeRequestHandle', () => {
  it('strips @, whitespace and case', () => {
    expect(normalizeRequestHandle('@Foo_Bar')).toBe('foo_bar');
    expect(normalizeRequestHandle('  FooBar  ')).toBe('foobar');
    expect(normalizeRequestHandle('@@foo')).toBe('foo');
  });

  it('pulls the handle out of a pasted profile URL', () => {
    expect(normalizeRequestHandle('https://www.instagram.com/foo.bar/')).toBe('foo.bar');
    expect(normalizeRequestHandle('instagram.com/FooBar')).toBe('foobar');
    expect(normalizeRequestHandle('http://instagram.com/foo?hl=en')).toBe('foo');
    expect(normalizeRequestHandle('https://www.instagram.com/foo/reels/')).toBe('foo');
    // TikTok URLs carry the @ inside the path.
    expect(normalizeRequestHandle('https://www.tiktok.com/@foo')).toBe('foo');
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
  });

  it('falls back to direct for anything else', () => {
    for (const raw of [null, undefined, '', 'Footer', 'whatever', '../../etc']) {
      expect(normalizeSource(raw)).toBe('direct');
    }
  });
});
