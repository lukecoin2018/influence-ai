'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

interface BrandProfile {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string;
  website: string | null;
  industry: string | null;
  brand_description: string | null;
}

interface CreatorProfile {
  id: string;
  creator_id: string;
  display_name: string | null;
  claim_status: string;
}

interface AuthContextType {
  user: User | null;
  brandProfile: BrandProfile | null;
  creatorProfile: CreatorProfile | null;
  userRole: 'brand' | 'creator' | null;
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
  const [userRole, setUserRole] = useState<'brand' | 'creator' | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadBrandProfile(userId: string) {
    const { data } = await supabase
      .from('brand_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setBrandProfile(data);
  }

  async function loadCreatorProfile(userId: string) {
    const { data } = await supabase
      .from('creator_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setCreatorProfile(data);
  }
  
  async function loadUserRole(userId: string) {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();
    setUserRole(data?.role ?? null);
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadUserRole(session.user.id);
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();
        if (roleData?.role === 'creator') {
          await loadCreatorProfile(session.user.id);
        } else {
          await loadBrandProfile(session.user.id);
        }
      }
      setLoading(false);
    });
  
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadUserRole(session.user.id);
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();
        if (roleData?.role === 'creator') {
          await loadCreatorProfile(session.user.id);
          setBrandProfile(null);
        } else {
          await loadBrandProfile(session.user.id);
          setCreatorProfile(null);
        }
      } else {
        setBrandProfile(null);
        setCreatorProfile(null);
        setUserRole(null);
      }
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