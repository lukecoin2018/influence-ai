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
}

interface AuthContextType {
  user: User | null;
  brandProfile: BrandProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  brandProfile: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadBrandProfile(userId: string) {
    const { data } = await supabase
      .from('brand_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setBrandProfile(data);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) loadBrandProfile(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadBrandProfile(session.user.id);
      else setBrandProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setBrandProfile(null);
  }

  return (
    <AuthContext.Provider value={{ user, brandProfile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}