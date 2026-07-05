import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { withTimeout } from '@/lib/withTimeout'

// This runs on nearly every request. getSession() has no built-in timeout,
// so a slow/hung auth call here would hang navigation for the entire site,
// not just admin pages. Fail open on timeout — treat it as "session
// unknown" rather than blocking the request — since the protected routes
// below are the only ones gated here and a false redirect-to-login is worse
// for reliability than briefly letting a request through unauthenticated.
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

  const isProtected =
    pathname === '/creators' ||
    pathname === '/creators/' ||
    pathname.startsWith('/find-creators') ||
    pathname.startsWith('/match') ||
    pathname.startsWith('/compare') ||
    pathname.startsWith('/brand-dashboard') ||
    pathname.startsWith('/creator-dashboard')

    if (isProtected && !session) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/webhooks/stripe|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}