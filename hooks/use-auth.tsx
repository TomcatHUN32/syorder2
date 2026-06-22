'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User as AuthUser, Session } from '@supabase/supabase-js';
import { supabase, User, Tenant } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: AuthUser | null;
  profile: (User & { tenant: Tenant }) | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, restaurantName: string, slug: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<(User & { tenant: Tenant }) | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile();
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile() {
    const { data } = await supabase
      .from('users')
      .select('*, tenant:tenants(*)')
      .single();

    setProfile(data as User & { tenant: Tenant });
    setLoading(false);
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) {
      router.push('/dashboard');
    }
    return { error };
  }

  async function signUp(email: string, password: string, fullName: string, restaurantName: string, slug: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          restaurant_name: restaurantName,
          slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ''),
        },
      },
    });
    if (!error) {
      router.push('/dashboard');
    }
    return { error };
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
