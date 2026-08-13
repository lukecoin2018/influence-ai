/**
 * Marks an API response as uncacheable by any shared cache.
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────
 *
 * Next 16.1.6 sends NO Cache-Control header at all for a non-ISR route handler.
 * Verified in the installed package: `isIsr` is computed purely from the
 * prerender manifest (next/dist/esm/build/templates/app-route.js:74), no
 * app/api route appears in that manifest, and with `isIsr` false the template
 * takes its "send response without caching" branch — which never reaches the
 * getCacheControlHeader() call at :294-295. So the response leaves the app with
 * no freshness directive and no Vary.
 *
 * Vercel treats that as "do not cache", which is why this was invisible there.
 * The VPS sits behind Webuzo's nginx, whose config uses
 *
 *     proxy_cache_key "$scheme://$host$request_uri"     <- URI only, no cookie
 *     proxy_cache_valid 200 301 302 60m
 *     proxy_cache_min_uses 1
 *
 * so any headerless 200 was stored for an hour and replayed to every session.
 * That is how /api/creator/brand-matches served one creator's payload to a
 * different logged-in creator in production.
 *
 * nginx sets no proxy_ignore_headers, so it honours Cache-Control from the app:
 * this header is the whole fix, and it lives in the application rather than in
 * Webuzo's config so it travels with the code and cannot be lost to a panel
 * upgrade.
 *
 * ── WHY NOT `export const dynamic = 'force-dynamic'` ───────────────────────
 *
 * Because it does nothing here. `isIsr` is read from the prerender manifest,
 * not from the `dynamic` export, and the Cache-Control write is inside the ISR
 * branch. These routes are ALREADY dynamic; force-dynamic would leave the bytes
 * on the wire identical. It is a change that looks like a fix and is not one.
 *
 * ── WHY A WRAPPER RATHER THAN A CALL AT EACH `return` ──────────────────────
 *
 * The thirteen routes this guards have 63 return sites between them, including
 * single-line `if (!user) return NextResponse.json(...)` early exits and, in
 * app/api/creator/outreach/route.ts, a 401/403 response built inside a helper
 * and returned by its caller. Wrapping the handler once covers every branch by
 * construction; wrapping 63 returns would rely on nobody ever missing one, now
 * or in the next edit. The early exits matter as much as the success path — a
 * cached 401 would lock out a valid session, and a cached 403 the same.
 */

import type { NextRequest } from 'next/server';

/**
 * `no-store` is the directive that actually stops storage; `no-cache`,
 * `max-age=0` and `must-revalidate` are belt-and-braces for older or
 * misconfigured intermediaries that predate or mishandle no-store. `private`
 * additionally tells any shared cache that the body belongs to one user.
 */
const CACHE_CONTROL = 'private, no-store, no-cache, max-age=0, must-revalidate';

/**
 * Vary matters independently of Cache-Control: it is what protects us from a
 * cache that stores the response anyway, keyed only on URL. It is the reason
 * the leak was cross-session rather than merely stale — /api/creator/outreach
 * is requested as `?brand=Nike` by every creator, so URI-only keying made one
 * creator's send history the cache entry for all of them.
 */
const VARY = 'Cookie';

/**
 * Sets the headers on an already-built response and returns the same object.
 *
 * Safe to mutate: every response in these routes is built locally with
 * NextResponse.json(), whose headers are mutable. Only a Response handed back
 * from fetch() carries an immutable headers guard, and no route here returns
 * one.
 */
export function applyNoStore<T extends Response>(res: T): T {
  res.headers.set('Cache-Control', CACHE_CONTROL);

  // Appended rather than set, so a Vary the framework may already have added is
  // preserved — dropping one would change which requests a cache considers
  // equivalent, which is the class of bug this file exists to close.
  const existing = res.headers.get('Vary');
  if (!existing) {
    res.headers.set('Vary', VARY);
  } else if (!existing.split(',').some((v) => v.trim().toLowerCase() === 'cookie')) {
    res.headers.append('Vary', VARY);
  }

  return res;
}

/**
 * Route-handler signature, loose on both ends by design: some handlers here
 * take no arguments at all (app/api/creator/brand-matches/route.ts's GET),
 * while others read a dynamic path segment off the context object.
 *
 * `Ctx` is generic and forwarded untouched to the wrapped handler below, so the
 * wrapper imposes no shape on it and `await params` works through the wrapper
 * exactly as it does without one. The narrowing that matters happens at the
 * export site, not here: Turbopack generates a per-route validator into
 * .next/types/validator.ts requiring
 *
 *     GET?: (request: NextRequest, context: { params: Promise<ParamMap[Route]> })
 *             => Promise<Response | void> | Response | void
 *
 * with ParamMap sourced from the route's own directory name, so a handler whose
 * params type is wrong fails the build regardless of what this alias says.
 *
 * app/api/creators/[handle] is the first guarded route with a dynamic segment.
 * Verified by clean build (rm -rf .next && npm run build): it compiles, and the
 * route resolves `handle` correctly — a dropped context object would surface as
 * a 404 rather than as a type error, so the build alone does not prove it and
 * the response was checked too.
 *
 * Note that the validator is a build-time artifact. `tsc` against a stale or
 * absent .next never sees it — .next/types held no route validators at all
 * before that build — so a type check outside `next build` does not prove this.
 */
type RouteHandler<Ctx> = (req: NextRequest, ctx: Ctx) => Response | Promise<Response>;

/**
 * Wraps a route handler so every response it returns — success, 4xx, 5xx —
 * carries the no-store headers.
 *
 * Deliberately does NOT catch: an exception must keep propagating to Next's own
 * error handling exactly as before. An uncaught throw becomes a 500, and
 * Webuzo's nginx only caches 200/301/302, so the unheadered 500 is not a hole.
 */
export function withNoStore<Ctx>(handler: RouteHandler<Ctx>): RouteHandler<Ctx> {
  return async (req, ctx) => applyNoStore(await handler(req, ctx));
}
