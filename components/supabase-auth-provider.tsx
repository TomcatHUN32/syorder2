'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

export function SupabaseAuthProvider() {
  useEffect(() => {
    const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1] ?? '';
    const cookieName = `sb-${projectRef}-auth-token`;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (typeof window === 'undefined') return;

      if (session) {
        // Prepare the cookie value (standard session JSON stringified)
        const value = encodeURIComponent(JSON.stringify(session));
        const maxAge = session.expires_in || 3600;
        
        // Write the cookie for the current subdomain path
        document.cookie = `${cookieName}=${value}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`;
      } else {
        // Clear the cookie when logged out
        document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure`;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
