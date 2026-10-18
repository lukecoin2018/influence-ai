/**
 * Where a visitor goes once they are signed in. Pure functions, so the login
 * page and its tests share one copy of the rule.
 *
 * ── WHY redirectTo IS CHECKED ──────────────────────────────────────────────
 *
 * /login?redirectTo= is set by middleware.ts and by links on /creators,
 * /compare and /report, but anyone can write it. Before this module the login
 * page passed it straight to router.push(), and Next's router hard-navigates
 * to any URL whose origin differs from the page's (app-router-utils.js
 * isExternalURL, then location.assign in app-router.js). So a crafted login
 * link could send a freshly signed-in user to another site, and a
 * `javascript:` value reached location.assign too.
 *
 * A safe target is a path on this site: it starts with a single "/", not "//"
 * or "/\", and is not a login page. The value is also parsed the way the
 * browser will parse it, and rejected if that lands on another origin or on a
 * path starting with "//". The parser does things a prefix check misses,
 * measured with Node's WHATWG URL (the browser's algorithm):
 *
 *   "/\t/evil.example"   tab and newline are dropped  -> https://evil.example
 *   "/..//evil.example"  dot segments are collapsed   -> path "//evil.example",
 *                        which as an href is protocol-relative: another site
 *
 * The caller gets back the parsed path, search and hash, so what the browser
 * navigates to is exactly what was checked.
 */

// Any fixed origin works: only "did the origin change" is compared.
const PLACEHOLDER_ORIGIN = 'https://same-site.invalid';

// Signed-in visitors sent here would see a login form again. /auth/login is
// the second login page (the creator funnel's).
const LOGIN_PATHS = new Set(['/login', '/auth/login']);

export function safeRedirectPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return null;

  let url: URL;
  try {
    url = new URL(raw, PLACEHOLDER_ORIGIN);
  } catch {
    return null;
  }

  if (url.origin !== PLACEHOLDER_ORIGIN) return null;
  if (url.pathname.startsWith('//')) return null;

  const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : url.pathname;
  if (LOGIN_PATHS.has(path)) return null;

  return url.pathname + url.search + url.hash;
}

/**
 * The home for a role from user_roles. No row (null) goes to /dashboard, as
 * it always has: every brand_profiles account has no user_roles row today
 * (measured 2026-10-18), because /api/auth/signup never writes one.
 */
export function homeForRole(role: string | null | undefined): string {
  if (role === 'admin') return '/admin';
  if (role === 'creator') return '/creator-dashboard';
  return '/dashboard';
}

/**
 * Where to go after signing in.
 *
 * Brands always land on /dashboard and redirectTo is ignored. A brand is role
 * 'brand' or no user_roles row at all (null), which is every brand today.
 * Creators and admins go to redirectTo when it is safe, otherwise their home.
 *
 * `role` is null for "no row", never undefined: a role lookup that failed is
 * the caller's error to report, not a brand.
 */
export function loginTarget(redirectTo: string | null | undefined, role: string | null): string {
  if (role !== 'admin' && role !== 'creator') return '/dashboard';
  return safeRedirectPath(redirectTo) ?? homeForRole(role);
}
