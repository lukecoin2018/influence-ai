'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

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
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  brandProfile: null,
  creatorProfile: null,
  userRole: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);
  const [userRole, setUserRole] = useState<'brand' | 'creator' | 'admin' | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfileForUser(userId: string) {
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();


    const role = roleData?.role ?? null;
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
      setCreatorProfile(data ?? null);
      setBrandProfile(null);
    } else {
      const { data } = await supabase
        .from('brand_profiles')
        .select('*')
        .eq('id', userId)
        .single();
      setBrandProfile(data ?? null);
      setCreatorProfile(null);
    }
  }

  useEffect(() => {
    // Resolve auth immediately from existing session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadProfileForUser(session.user.id);
      }
      setLoading(false);
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);

      if (session?.user) {
        await loadProfileForUser(session.user.id);
      } else {
        setBrandProfile(null);
        setCreatorProfile(null);
        setUserRole(null);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setBrandProfile(null);
    setCreatorProfile(null);
    setUserRole(null);
    window.location.href = '/login';
  }

  return (
    <AuthContext.Provider value={{ user, brandProfile, creatorProfile, userRole, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
