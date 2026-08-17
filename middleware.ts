import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { withTimeout } from '@/lib/withTimeout'

// This runs on nearly every request. getSession() has no built-in timeout, so
// a slow/hung auth call here would hang navigation for the entire site, not
// just the gated routes.
//
// On timeout the catch below yields a null session, so a protected route
// REDIRECTS TO /login. That is fail-closed, not fail-open: a timeout never
// admits an anonymous visitor, it bounces an authenticated one. (An earlier
// version of this comment claimed the opposite and described behaviour this
// code has never implemented.)
//
// That is acceptable because middleware is a redirect convenience here, not
// the security boundary — the server gates in app/admin/layout.tsx and
// app/dashboard/layout.tsx are, and they have no timeout to lose. The cost of
// a timeout is a spurious login bounce, which is why the redirect below is
// marked no-store: nginx caches 302s for an hour keyed on URL alone, so one
// timed-out request must not become an hour-long lockout for everyone.
const MIDDLEWARE_AUTH_TIMEOUT_MS = 5_000

export async function middleware(req: NextRequest) {
  let supabaseResponse = NextResponse.next({ request: req })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            req.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request: req })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const session = await withTimeout(supabase.auth.getSession(), MIDDLEWARE_AUTH_TIMEOUT_MS)
    .then(({ data }) => data.session)
    .catch((e) => {
      console.error('middleware getSession timed out/failed, proceeding without session:', e)
      return null
    })
  const { pathname } = req.nextUrl

  // /find-creators and /brand-dashboard were listed here and are not routes —
  // no app/find-creators or app/brand-dashboard directory exists, so those two
  // lines guarded nothing. Replaced by the trees that do exist: /admin (owner
  // only) and /dashboard (any session). The real checks are the server gates in
  // each tree's layout.tsx; these prefixes only save an unauthenticated visitor
  // from rendering a page they cannot use.
  const isProtected =
    pathname === '/creators' ||
    pathname === '/creators/' ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/match') ||
    pathname.startsWith('/compare') ||
    pathname.startsWith('/creator-dashboard')

    if (isProtected && !session) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    const redirectResponse = NextResponse.redirect(loginUrl)

    // Measured on a built server: NextResponse.redirect() emits a 307 with no
    // Cache-Control at all. 307 is not in Webuzo nginx's
    // `proxy_cache_valid 200 301 302 60m`, so today it is not stored — but the
    // response says nothing about its own cacheability, which leaves that
    // safety resting entirely on a number in a config file this repo does not
    // own. If 307 were ever added to that list, or a CDN put in front, every
    // request to /admin would be answered from one visitor's redirect for an
    // hour, keyed on URL alone with no cookie in the key. That is an hour-long
    // lockout of the only admin account, caused by a single timed-out
    // getSession() — see the timeout note above.
    //
    // The server gate's own redirect() already carries these headers from Next
    // (verified: `private, no-cache, no-store, max-age=0, must-revalidate`).
    // This makes the middleware path agree with it rather than relying on the
    // status code alone.
    redirectResponse.headers.set('Cache-Control', 'private, no-store, no-cache, max-age=0, must-revalidate')
    redirectResponse.headers.set('Vary', 'Cookie')
    return redirectResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/webhooks/stripe|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}