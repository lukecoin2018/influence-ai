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
const AUTH_INIT_TIMEOUT_MS = 10_000;
const SIGN_OUT_TIMEOUT_MS = 5_000;

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

  async function loadProfileForUser(userId: string) {
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();


    const role = roleData?.role ?? null;
    if (!isMounted.current) return;
    setUserRole(role);

    if (role === 'admin') {
      // Admin doesn't need brand or creator profile
      setBrandProfile(null);
      setCreatorProfile(null);
    } else if (role === 'creator') {
      const { data } = await supabase
        .from('creator_profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (!isMounted.current) return;
      setCreatorProfile(data ?? null);
      setBrandProfile(null);
    } else {
      const { data } = await supabase
        .from('brand_profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (!isMounted.current) return;
      setBrandProfile(data ?? null);
      setCreatorProfile(null);
    }
  }

  useEffect(() => {
    isMounted.current = true;

    // getSession() (and the profile lookups after it) can hang forever on a
    // flaky connection — there's no timeout anywhere in supabase-js for
    // this. Race it so `loading` always resolves instead of leaving every
    // admin/brand/creator page stuck on "Loading...".
    withTimeout(supabase.auth.getSession(), AUTH_INIT_TIMEOUT_MS)
      .then(async ({ data: { session } }) => {
        if (!isMounted.current) return;
        setUser(session?.user ?? null);
        setAuthError(null);
        if (session?.user) await withTimeout(loadProfileForUser(session.user.id), AUTH_INIT_TIMEOUT_MS);
      })
      .catch((e) => {
        console.error('getSession/loadProfile error:', e);
        if (!isMounted.current) return;
        setAuthError('Failed to verify your session.');
      })
      .finally(() => {
        if (isMounted.current) setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted.current) return;
      setUser(session?.user ?? null);
      try {
        if (session?.user) {
          await withTimeout(loadProfileForUser(session.user.id), AUTH_INIT_TIMEOUT_MS);
        } else {
          setBrandProfile(null);
          setCreatorProfile(null);
          setUserRole(null);
        }
        if (isMounted.current) setAuthError(null);
      } catch (e) {
        console.error('onAuthStateChange loadProfile error:', e);
        if (isMounted.current) setAuthError('Failed to verify your session.');
      } finally {
        if (isMounted.current) setLoading(false);
      }
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
