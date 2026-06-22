'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { SyorderLogoMark } from '@/components/syorder-logo';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // Clear stale/invalid tokens from localStorage to prevent 401 loops
    try {
      const projectRef =
        process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1] ?? '';
      if (typeof window !== 'undefined' && projectRef) {
        localStorage.removeItem(`sb-${projectRef}-auth-token`);
        localStorage.removeItem(`sb-${projectRef}-auth-token-code-verifier`);
      }
      // Sign out locally (clear in-memory session) without hitting the server
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // Ignore — we just want to start fresh
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error('Hibás email cím vagy jelszó');
      setLoading(false);
      return;
    }

    toast.success('Üdvözlünk vissza!');

    try {
      // Superadmin check → redirect to admin panel
      const { data: userData } = await supabase
        .from('users')
        .select('is_superadmin')
        .eq('id', data.user.id)
        .maybeSingle();

      if (userData?.is_superadmin) {
        router.push('/admin');
      } else {
        router.push(redirect);
      }
    } catch (err) {
      console.error('Superadmin check fell back:', err);
      router.push(redirect);
    } finally {
      router.refresh();
      // Ensure loading state gets reset if the browser stays on the page
      setTimeout(() => {
        setLoading(false);
      }, 1000);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-slate-800/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 mb-4 overflow-hidden">
            <SyorderLogoMark size={40} variant="light" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">SYORDER</h1>
          <p className="text-slate-400 text-sm mt-1">Étteremkezelő Platform</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-1">Bejelentkezés</h2>
          <p className="text-slate-400 text-sm mb-6">Lépj be az irányítópultba</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-300 text-sm">Email cím</Label>
              <Input
                id="email"
                type="email"
                placeholder="te@ettermed.hu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-slate-500 focus:ring-slate-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-slate-300 text-sm">Jelszó</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-slate-500 focus:ring-slate-500"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-white text-slate-900 hover:bg-slate-100 font-semibold mt-2"
              disabled={loading}
            >
              {loading ? 'Bejelentkezés...' : 'Bejelentkezés'}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-500">
              Még nem partner?{' '}
              <Link href="/#igenyles" className="text-slate-300 hover:text-white underline underline-offset-2">
                Igénylés beküldése
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Vissza a főoldalra
          </Link>
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-600">
          <Shield className="h-3 w-3" />
          <span>Biztonságos kapcsolat</span>
        </div>
      </div>
    </div>
  );
}
