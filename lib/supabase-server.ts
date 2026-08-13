import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * The cookie @supabase/ssr stores the session under.
 *
 * supabase-js derives its default storageKey as
 * `sb-${hostname.split('.')[0]}-auth-token` (@supabase/supabase-js
 * dist/index.cjs:202), and nothing here passes cookieOptions.name, so the
 * default applies. Verified by constructing a server client from the same env
 * and comparing against `client.auth.storageKey` — they match exactly.
 *
 * Computed lazily rather than at module scope so a missing env var surfaces at
 * the call site, as it does everywhere else in this file.
 */
function authCookieKey(): string {
  const host = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname;
  return `sb-${host.split('.')[0]}-auth-token`;
}

/**
 * True when the request carries a session that has been validated against the
 * auth server.
 *
 * Two steps, and the order matters:
 *
 *   1. Is an auth cookie present at all? A logged-out visitor carries none, so
 *      there is nothing to validate and no reason to reach the network. This is
 *      the common case on a public profile page.
 *   2. Only if one is present, getUser() — which verifies the token with the
 *      auth server. getSession() is not used: it returns whatever the cookie
 *      claims without checking it, and this boolean decides which columns a
 *      caller may read.
 *
 * The presence check is a fast path, never a grant. A forged or expired cookie
 * gets past step 1 and is rejected by step 2. And if the cookie name ever
 * diverges from what supabase-js writes, step 1 returns false and the caller
 * treats the request as anonymous — a signed-in visitor would see the public
 * teaser, which is the safe direction for this to fail in.
 *
 * Reads cookies() internally, so importing this de-opts a static route to
 * dynamic. Both current callers (/creators/[handle] and its API twin) are
 * already ƒ (Dynamic) and cannot be prerendered.
 */
export async function hasValidatedSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const key = authCookieKey();

  // Chunked cookies are written as `<key>.0`, `<key>.1` when the session
  // exceeds MAX_CHUNK_SIZE (@supabase/ssr utils/chunker.js), so match the
  // prefix as well as the exact name.
  const present = cookieStore
    .getAll()
    .some((c) => c.name === key || c.name.startsWith(`${key}.`));

  if (!present) return false;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return !!user;
}

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll called from a Server Component — safe to ignore
          }
        },
      },
    }
  );
}
