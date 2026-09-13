'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { withTimeout } from '@/lib/withTimeout';
import type { User } from '@supabase/supabase-js';

// supabase-js serializes every auth.* call (getSession, signOut, token
// refresh...) behind one lock per client instance. If one of those calls
// hangs — e.g. a token-refresh fetch with no network timeout — every later
// auth call, including signOut, queues behind it and hangs too. Timeouts
// here are what let loading and signOut recover instead of hanging forever.
//
// getSession() and the profile lookups after it get SEPARATE timeout
// budgets — they used to share one combined window (see git history), which
// quietly cut the effective time available to whichever step ran second.
// They're also retried differently:
//  - Profile queries are plain Postgrest calls with no shared lock, so
//    retrying them by calling loadProfileForUser() again is a genuine fresh
//    attempt.
//  - getSession() is different: because supabase-js serializes it behind
//    the client's auth lock, calling it a *second* time while the first
//    call is still in flight doesn't get a fresh attempt — it just queues
//    behind the same lock and can't resolve any faster. Worse, if the SDK's
//    own background token-refresh timer fires at the same moment, two
//    concurrent attempts to use/refresh the same token can race and cause a
//    genuine (not just UI-level) sign-out. So getSession()'s "retry" below
//    re-races the *same* in-flight call with a fresh deadline instead of
//    invoking supabase.auth.getSession() a second time.
const GET_SESSION_TIMEOUT_MS = 15_000;
const PROFILE_LOAD_TIMEOUT_MS = 15_000;
const SIGN_OUT_TIMEOUT_MS = 5_000;

// Tracks whichever auth/profile call is currently in flight, purely so that
// if a check times out we can log *which* step was still pending and for
// how long — otherwise a timeout tells you nothing about whether the slow
// part was getSession, the token refresh underneath it, or one of the
// profile queries.
type Stage = { label: string; start: number } | null;

async function timed<T>(stageRef: { current: Stage }, label: string, promise: PromiseLike<T>): Promise<T> {
  const start = Date.now();
  stageRef.current = { label, start };
  const result = await promise;
  if (stageRef.current?.start === start) stageRef.current = null;
  return result;
}

function describeStage(stage: Stage): string {
  if (!stage) return 'no specific step recorded (already finished before the timeout fired)';
  return `"${stage.label}", in flight for ${Date.now() - stage.start}ms`;
}

interface BrandProfile {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string;
  website: string | null;
  industry: string | null;
  brand_description: string | null;
  approval_status: string | null;
}

interface CreatorProfile {
  id: string;
  creator_id: string;
  display_name: string | null;
  claim_status: string;
  custom_bio: string | null;
  rate_post: number | null;
  rate_reel: number | null;
  rate_story: number | null;
  rate_package: number | null;
  rate_currency: string | null;
  rate_notes: string | null;
  availability_status: string | null;
  availability_note: string | null;
  website: string | null;
  preferred_categories: string[] | null;
  min_budget: number | null;
  /**
   * UI locale captured at claim time. The select('*') below already returns
   * this column; declaring it here only makes it visible to TypeScript so
   * shared chrome (lib/i18n/use-locale.ts) can read it. NULL = unknown, read
   * as 'en'.
   */
  locale?: 'en' | 'es' | null;
}

/**
 * Three-state role, and the third state is the point.
 *
 *   'brand' | 'creator' | 'admin'   determined: a user_roles row said so
 *   null                            determined: the lookup ran and found no row
 *   undefined                       NOT determined: the lookup has not run, or
 *                                   it failed (network, RLS, statement timeout)
 *
 * Before this, a failed lookup collapsed into null. The user_roles SELECT
 * discarded its `error`, so a PostgREST error resolved with data null, and
 * app/creator-dashboard/page.tsx read that null as "not a creator" and sent a
 * verified creator to the brand dashboard. A failed check is not a finding;
 * it stays undefined and `authError` says why. Consumers must only redirect on
 * a determined value.
 */
export type UserRole = 'brand' | 'creator' | 'admin' | null | undefined;

interface AuthContextType {
  user: User | null;
  brandProfile: BrandProfile | null;
  creatorProfile: CreatorProfile | null;
  userRole: UserRole;
  loading: boolean;
  authError: string | null;
  retryAuth: () => void;
  signOut: () => Promise<void>;
  /**
   * Merges fields into the in-memory creator profile after the caller has
   * written them to creator_profiles itself. Exists so a setting the shared
   * chrome reads from this context (today: `locale`, via lib/i18n/use-locale.ts)
   * can change on the same render as the write, rather than on the next
   * session load. No-op when there is no creator profile.
   */
  patchCreatorProfile: (patch: Partial<CreatorProfile>) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  brandProfile: null,
  creatorProfile: null,
  userRole: undefined,
  loading: true,
  authError: null,
  retryAuth: () => {},
  signOut: async () => {},
  patchCreatorProfile: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);
  // undefined until a lookup has actually answered — see UserRole above.
  const [userRole, setUserRole] = useState<UserRole>(undefined);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const isMounted = useRef(true);
  const stageRef = useRef<Stage>(null);
  // Identifies which effect run (i.e. which retryAuth() generation) an async
  // callback belongs to. isMounted alone can't do this: it flips back to
  // true as soon as the *next* effect run starts, so a stale promise left
  // over from *before* a retryAuth() click — e.g. a getSession() call that
  // was still hung when the user clicked Retry — would otherwise pass the
  // isMounted check and be free to overwrite the fresh attempt's state with
  // stale results once it finally settles.
  const runIdRef = useRef(0);

  function isCurrent(runId: number) {
    return isMounted.current && runIdRef.current === runId;
  }

  // getSession() re-races the SAME in-flight call across both timeout
  // windows rather than invoking supabase.auth.getSession() a second time —
  // see the comment on GET_SESSION_TIMEOUT_MS above for why a real second
  // call would be pointless (or actively harmful) here.
  async function getSessionWithRetry() {
    const pending = timed(stageRef, 'getSession', supabase.auth.getSession());
    try {
      return await withTimeout(pending, GET_SESSION_TIMEOUT_MS);
    } catch (e) {
      console.warn(
        `[auth] getSession still pending after ${GET_SESSION_TIMEOUT_MS}ms (${describeStage(stageRef.current)}) — waiting on the same call rather than starting a second one:`,
        e,
      );
    }
    return withTimeout(pending, GET_SESSION_TIMEOUT_MS);
  }

  async function loadProfileForUser(userId: string) {
    // maybeSingle(), not single(): single() reports "no row" as an error
    // (PGRST116), and now that errors are read rather than discarded, a user
    // with no user_roles row must still resolve to a determined null rather
    // than look like a failed lookup.
    const { data: roleData, error: roleError } = await timed(stageRef, 'user_roles query', supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle());

    // Thrown, not swallowed. This is what lets loadProfileWithRetry's second
    // attempt engage, and what keeps userRole undefined (not null) when both
    // attempts fail. The old code resolved a failed query as role null.
    if (roleError) throw new Error(`user_roles lookup failed: ${roleError.message}`);

    const role = (roleData?.role ?? null) as UserRole;
    if (!isMounted.current) return;
    setUserRole(role);

    if (role === 'admin') {
      // Admin doesn't need brand or creator profile
      setBrandProfile(null);
      setCreatorProfile(null);
    } else if (role === 'creator') {
      const { data, error } = await timed(stageRef, 'creator_profiles query', supabase
        .from('creator_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle());
      if (error) throw new Error(`creator_profiles lookup failed: ${error.message}`);
      if (!isMounted.current) return;
      setCreatorProfile(data ?? null);
      setBrandProfile(null);
    } else {
      const { data, error } = await timed(stageRef, 'brand_profiles query', supabase
        .from('brand_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle());
      if (error) throw new Error(`brand_profiles lookup failed: ${error.message}`);
      if (!isMounted.current) return;
      setBrandProfile(data ?? null);
      setCreatorProfile(null);
    }
  }

  // Plain Postgrest queries underneath, no shared client-wide lock, so a
  // second attempt here is a genuine fresh retry (unlike getSessionWithRetry).
  async function loadProfileWithRetry(userId: string): Promise<void> {
    try {
      await withTimeout(loadProfileForUser(userId), PROFILE_LOAD_TIMEOUT_MS);
    } catch (e) {
      console.warn(`[auth] profile load failed on first attempt (${describeStage(stageRef.current)}), retrying:`, e);
      await withTimeout(loadProfileForUser(userId), PROFILE_LOAD_TIMEOUT_MS);
    }
  }

  useEffect(() => {
    const runId = ++runIdRef.current;
    isMounted.current = true;

    // getSession() (and the profile lookups after it) can hang forever on a
    // flaky connection — there's no timeout anywhere in supabase-js for
    // this. Race it so `loading` always resolves instead of leaving every
    // admin/brand/creator page stuck on "Loading...".
    (async () => {
      try {
        const { data: { session } } = await getSessionWithRetry();
        if (!isCurrent(runId)) return;
        setUser(session?.user ?? null);
        if (session?.user) await loadProfileWithRetry(session.user.id);
        if (isCurrent(runId)) setAuthError(null);
      } catch (e) {
        console.error(`[auth] initial session check failed (${describeStage(stageRef.current)}):`, e);
        // A failed *check* is not the same thing as "no session" — leave
        // user/userRole/profiles untouched here. Only an explicit signal
        // from Supabase (session === null, handled below) clears them.
        // userRole is left as it was (undefined on a first load), so a
        // consumer sees "not determined" plus authError, never a false null.
        if (isCurrent(runId)) setAuthError('Failed to verify your session.');
      } finally {
        if (isCurrent(runId)) setLoading(false);
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isCurrent(runId)) return;
      // session here comes directly from the SDK's own event payload, not
      // from our timed/retried getSession() call — a null session at this
      // point is a real signal (the SDK itself says there's no session),
      // so clearing user is correct, not a side effect of a slow check.
      setUser(session?.user ?? null);

      // Deliberately not awaited inside this callback. supabase-js awaits
      // whatever this callback returns as part of _notifyAllSubscribers(),
      // which runs *while GoTrueClient holds its internal auth lock* — and
      // that lock is shared across every tab of this origin (it's keyed by
      // storage key, via the Web Locks API). getSession()/initialize() in
      // *any other tab* acquire that same lock. If this callback awaited
      // loadProfileWithRetry() directly (up to 30s worst case), the lock
      // would stay held for that whole window, and any other tab's
      // concurrent getSession() would queue behind it and abort at
      // GoTrueClient's own hardcoded lockAcquireTimeout (10s) — reproduced
      // directly: opening a second tab (or a tab regaining focus, which
      // triggers GoTrueClient's own visibilitychange-driven refresh) threw
      // "AbortError: signal is aborted without reason" from inside
      // _acquireLock on the *other* tab. setTimeout(..., 0) here returns
      // control to supabase-js immediately, releasing the lock right away;
      // the profile reload still happens, just outside its synchronous,
      // lock-held notification chain.
      setTimeout(() => {
        (async () => {
          try {
            if (session?.user) {
              await loadProfileWithRetry(session.user.id);
            } else {
              // Signed out: no role is a determined fact here, not a failure.
              setBrandProfile(null);
              setCreatorProfile(null);
              setUserRole(null);
            }
            if (isCurrent(runId)) setAuthError(null);
          } catch (e) {
            console.error(`[auth] auth state change sync failed (${describeStage(stageRef.current)}):`, e);
            // Same rule: a failed profile reload must not clear the session
            // that setUser() above already (correctly) established.
            if (isCurrent(runId)) setAuthError('Failed to verify your session.');
          }
        })();
      }, 0);
    });

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
    };
  }, [retryToken]);

  function retryAuth() {
    setLoading(true);
    setAuthError(null);
    setRetryToken((t) => t + 1);
  }

  function patchCreatorProfile(patch: Partial<CreatorProfile>) {
    setCreatorProfile((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  async function signOut() {
    // signOut() must work even if the client's internal auth lock is stuck
    // behind an earlier hung call (e.g. a token refresh with no timeout) —
    // supabase-js serializes all auth.* calls per client instance, so a
    // stuck getSession() would otherwise wedge signOut() too. Race it and
    // clear local state / redirect unconditionally so the button never dies.
    await withTimeout(supabase.auth.signOut(), SIGN_OUT_TIMEOUT_MS).catch((e) => {
      console.error('signOut network call did not complete, clearing local state anyway:', e);
    });
    setUser(null);
    setBrandProfile(null);
    setCreatorProfile(null);
    setUserRole(null);
    window.location.href = '/login';
  }

  return (
    <AuthContext.Provider value={{ user, brandProfile, creatorProfile, userRole, loading, authError, retryAuth, signOut, patchCreatorProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
