'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { withTimeout } from '@/lib/withTimeout';
import { loginTarget } from '@/lib/auth/login-target';

// ── Leaving this page is a full page load, never router.push ──────────────
//
// The site header renders here, and its <Link>s prefetch /creators, /match and
// /compare while the visitor is signed out. middleware.ts answers each prefetch
// with a 307 to /login?redirectTo=…, and Next 16's client router stores that:
// the prefetch fetch follows the redirect and the cache entry for /creators
// gets /login's page and URL (segment-cache/cache.js, urlAfterRedirects ->
// canonicalUrl), for /login's stale time of 300 s. That cache lives in the
// page's memory. After a router.push() it survived the sign-in, so the
// header's links replayed the old redirect without asking the server, and a
// router.push(redirectTo) back to one of them landed on this same page with
// the button stuck on "Logging in...".
//
// location.replace() starts a new page with an empty router cache, and the
// server sees the new session cookie. replace, not assign, so /login is not
// left in the history for Back to land on and forward again.
//
// The same rule applies to the brand signups (app/signup/page.tsx,
// app/auth/signup/_SignUpForm.tsx).

const SIGN_IN_TIMEOUT_MS = 15_000;
const ROLE_LOOKUP_TIMEOUT_MS = 15_000;

// An automatic forward (below) is allowed once per 10 s per tab. If the
// server cannot see a session the browser has (middleware.ts gives up on
// getSession after 5 s and redirects here), the target sends the visitor
// straight back, and without this the two pages would bounce forever.
const AUTO_FORWARD_KEY = 'login:auto-forward-at';
const AUTO_FORWARD_COOLDOWN_MS = 10_000;

function claimAutoForward(): boolean {
  try {
    const last = Number(window.sessionStorage.getItem(AUTO_FORWARD_KEY));
    if (last && Date.now() - last < AUTO_FORWARD_COOLDOWN_MS) return false;
    window.sessionStorage.setItem(AUTO_FORWARD_KEY, String(Date.now()));
    return true;
  } catch {
    // No storage, no loop guard: show the form rather than risk the loop.
    return false;
  }
}

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo');
  const { user, userRole, loading: authLoading } = useAuth();
  // Set for the whole of a sign-in, so the forward below does not race it
  // when AuthContext hears SIGNED_IN, and Enter cannot start a second one.
  const submitting = useRef(false);

  // Already signed in: go to the target straight away. Reads AuthContext
  // rather than calling getSession() a second time, which AuthContext.tsx
  // explains can race its own call. userRole undefined means the role lookup
  // failed, so the form stays rather than guessing a home.
  useEffect(() => {
    if (authLoading || !user || userRole === undefined || submitting.current) return;
    if (!claimAutoForward()) return;
    window.location.replace(loginTarget(redirectTo, userRole));
  }, [authLoading, user, userRole, redirectTo]);

  function fail(message: string) {
    submitting.current = false;
    setError(message);
    setLoading(false);
  }

  async function handleSubmit() {
    if (submitting.current) return;
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    submitting.current = true;
    setLoading(true);
    setError('');

    let signedIn = false;
    try {
      const { data, error: authError } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        SIGN_IN_TIMEOUT_MS,
      );

      if (authError || !data.user) {
        fail('Invalid email or password.');
        return;
      }
      signedIn = true;

      // maybeSingle(): no row is read as a brand. Every brand has role 'brand'
      // since 0033 and new signups write it, but a brand whose role insert
      // failed on /auth/signup would have none. Either way a brand goes to
      // /dashboard whatever redirectTo says (loginTarget). A failed lookup is
      // an error, not "no role".
      const { data: roleData, error: roleError } = await withTimeout(
        Promise.resolve(supabase.from('user_roles').select('role').eq('user_id', data.user.id).maybeSingle()),
        ROLE_LOOKUP_TIMEOUT_MS,
      );
      if (roleError) throw new Error(`user_roles lookup failed: ${roleError.message}`);

      await new Promise((r) => setTimeout(r, 300));

      window.location.replace(loginTarget(redirectTo, roleData?.role ?? null));
    } catch (e) {
      console.error('[login] sign-in did not complete:', e);
      fail(signedIn
        ? "You're signed in, but we couldn't load your account. Please try again."
        : 'Something went wrong signing you in. Please try again.');
    }
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: '8px',
    border: '1px solid #E5E7EB', fontSize: '14px', color: '#3A3A3A',
    outline: 'none', boxSizing: 'border-box' as const, backgroundColor: 'white',
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#3A3A3A', margin: '0 0 8px 0' }}>Welcome Back</h1>
          <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>Log in to your account.</p>
        </div>

        <div className="card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@acmebrand.com" style={inputStyle} onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" style={inputStyle} onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
          </div>

          {/* Shown when a signed-in visitor still sees the form: the role
              lookup failed, or the loop guard above stopped a forward. */}
          {user && !loading && !error && (
            <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
              {user.email ? `You're already signed in as ${user.email}.` : "You're already signed in."}
            </p>
          )}

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '13px' }}>
              {error}
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading} style={{ padding: '12px', borderRadius: '10px', background: 'linear-gradient(135deg, #FFD700, #E6C200)', color: 'white', fontSize: '15px', fontWeight: 700, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: '4px' }}>
            {loading ? 'Logging in...' : 'Log In'}
          </button>

          <p style={{ textAlign: 'center', fontSize: '13px', color: '#6B7280', margin: 0 }}>
            Don't have an account?{' '}
            <Link href="/signup" style={{ color: '#FFD700', fontWeight: 600, textDecoration: 'none' }}>Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
