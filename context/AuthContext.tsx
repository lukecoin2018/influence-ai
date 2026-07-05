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
// 15s (up from an initial 10s) plus one silent retry below: a single slow
// response — which is what we've actually seen in practice, not a true
// deadlock — now gets a second chance before we bother the user with an
// error state. If the [auth] timeout logs below show a *specific* step
// (e.g. "brand_profiles query") consistently eating most of this budget,
// that's the real underlying bug to chase, not this timeout value.
const AUTH_INIT_TIMEOUT_MS = 15_000;
const SIGN_OUT_TIMEOUT_MS = 5_000;

// Tracks whichever auth/profile call is currently in flight, purely so that
// if the overall check times out we can log *which* step was still pending
// and for how long — otherwise a timeout tells you nothing about whether
// the slow part was getSession, the token refresh underneath it, or one of
// the profile queries.
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
}

interface AuthContextType {
  user: User | null;
  brandProfile: BrandProfile | null;
  creatorProfile: CreatorProfile | null;
  userRole: 'brand' | 'creator' | 'admin' | null;
  loading: boolean;
  authError: string | null;
  retryAuth: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  brandProfile: null,
  creatorProfile: null,
  userRole: null,
  loading: true,
  authError: null,
  retryAuth: () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);
  const [userRole, setUserRole] = useState<'brand' | 'creator' | 'admin' | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const isMounted = useRef(true);
  const stageRef = useRef<Stage>(null);

  async function loadProfileForUser(userId: string) {
    const { data: roleData } = await timed(stageRef, 'user_roles query', supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single());


    const role = roleData?.role ?? null;
    if (!isMounted.current) return;
    setUserRole(role);

    if (role === 'admin') {
      // Admin doesn't need brand or creator profile
      setBrandProfile(null);
      setCreatorProfile(null);
    } else if (role === 'creator') {
      const { data } = await timed(stageRef, 'creator_profiles query', supabase
        .from('creator_profiles')
        .select('*')
        .eq('id', userId)
        .single());
      if (!isMounted.current) return;
      setCreatorProfile(data ?? null);
      setBrandProfile(null);
    } else {
      const { data } = await timed(stageRef, 'brand_profiles query', supabase
        .from('brand_profiles')
        .select('*')
        .eq('id', userId)
        .single());
      if (!isMounted.current) return;
      setBrandProfile(data ?? null);
      setCreatorProfile(null);
    }
  }

  // Runs `fn` under the timeout budget; if it fails (times out or throws),
  // logs which step was in flight and retries once, silently, before ever
  // touching `authError`. Most real-world failures here are one slow
  // response, not a genuine deadlock, so a single retry clears the vast
  // majority of them without ever showing the user anything.
  async function runSessionCheck(label: string, fn: () => Promise<void>): Promise<void> {
    try {
      await withTimeout(fn(), AUTH_INIT_TIMEOUT_MS);
      if (isMounted.current) setAuthError(null);
      return;
    } catch (e) {
      console.warn(`[auth] ${label} failed on first attempt (${describeStage(stageRef.current)}), retrying silently:`, e);
    }

    try {
      await withTimeout(fn(), AUTH_INIT_TIMEOUT_MS);
      if (isMounted.current) setAuthError(null);
    } catch (e) {
      console.error(`[auth] ${label} failed again on retry (${describeStage(stageRef.current)}), giving up:`, e);
      if (isMounted.current) setAuthError('Failed to verify your session.');
    }
  }

  useEffect(() => {
    isMounted.current = true;

    // getSession() (and the profile lookups after it) can hang forever on a
    // flaky connection — there's no timeout anywhere in supabase-js for
    // this. Race it so `loading` always resolves instead of leaving every
    // admin/brand/creator page stuck on "Loading...".
    (async () => {
      await runSessionCheck('initial session check', async () => {
        const { data: { session } } = await timed(stageRef, 'getSession', supabase.auth.getSession());
        if (!isMounted.current) return;
        setUser(session?.user ?? null);
        if (session?.user) await loadProfileForUser(session.user.id);
      });
      if (isMounted.current) setLoading(false);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted.current) return;
      setUser(session?.user ?? null);
      await runSessionCheck('auth state change sync', async () => {
        if (session?.user) {
          await loadProfileForUser(session.user.id);
        } else {
          setBrandProfile(null);
          setCreatorProfile(null);
          setUserRole(null);
        }
      });
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
    <AuthContext.Provider value={{ user, brandProfile, creatorProfile, userRole, loading, authError, retryAuth, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
