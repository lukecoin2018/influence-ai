import { describe, expect, it } from 'vitest';
import { homeForRole, loginTarget, safeRedirectPath } from './login-target';

describe('safeRedirectPath', () => {
  it.each([
    ['/creators', '/creators'],
    ['/', '/'],
    // What middleware.ts writes: the path, URL-encoded into the query.
    ['/creator-dashboard', '/creator-dashboard'],
    // What /creators and /compare write: a path with its own query.
    ['/creators?category=fashion&page=2', '/creators?category=fashion&page=2'],
    ['/compare?handles=a,b', '/compare?handles=a,b'],
    ['/creators/someone#rates', '/creators/someone#rates'],
    ['/%2F%2Fevil.example', '/%2F%2Fevil.example'],
  ])('keeps a same-site path: %j', (raw, expected) => {
    expect(safeRedirectPath(raw)).toBe(expected);
  });

  it.each([
    // Other sites.
    'https://evil.example',
    'http://evil.example/creators',
    '//evil.example',
    '//evil.example/creators',
    '/\\evil.example',
    // Parsed into another origin, or a "//" path, by the URL parser.
    '/\t/evil.example',
    '/\n/evil.example',
    '/..//evil.example',
    '/.//evil.example',
    // Schemes.
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    'data:text/html,hi',
    // Not a path.
    'creators',
    ' /creators',
    '%2F%2Fevil.example',
    // Login pages, in the forms the router would still land on.
    '/login',
    '/login/',
    '/login?redirectTo=%2Fcreators',
    '/./login',
    '/auth/login',
    // Nothing.
    '',
    null,
    undefined,
  ])('rejects %j', (raw) => {
    expect(safeRedirectPath(raw)).toBeNull();
  });
});

describe('homeForRole', () => {
  it('sends each role to its home, and no role row to /dashboard', () => {
    expect(homeForRole('admin')).toBe('/admin');
    expect(homeForRole('creator')).toBe('/creator-dashboard');
    expect(homeForRole('brand')).toBe('/dashboard');
    expect(homeForRole(null)).toBe('/dashboard');
    expect(homeForRole(undefined)).toBe('/dashboard');
  });
});

describe('loginTarget', () => {
  it('sends creators and admins to a safe redirectTo', () => {
    expect(loginTarget('/creators', 'admin')).toBe('/creators');
    expect(loginTarget('/compare?handles=a,b', 'creator')).toBe('/compare?handles=a,b');
  });

  it('falls back to the creator or admin home when redirectTo is missing or unsafe', () => {
    expect(loginTarget(null, 'creator')).toBe('/creator-dashboard');
    expect(loginTarget('https://evil.example', 'admin')).toBe('/admin');
    expect(loginTarget('javascript:alert(1)', 'creator')).toBe('/creator-dashboard');
    expect(loginTarget('/login', 'admin')).toBe('/admin');
  });

  it.each([
    ['/creators', 'brand'],
    ['/creators', null],
    ['/compare?handles=a,b', null],
    ['/admin', null],
    ['https://evil.example', null],
    ['/login', 'brand'],
    [null, null],
  ])('sends a brand to /dashboard whatever redirectTo says: %j, role %j', (raw, role) => {
    expect(loginTarget(raw, role)).toBe('/dashboard');
  });
});
