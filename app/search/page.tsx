'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  MapPin,
  ExternalLink,
  UtensilsCrossed,
  Loader2,
  Phone,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { SyorderLogoMark } from '@/components/syorder-logo';

// Logo constant removed — using SVG component

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  delivery_cities: string[];
  cuisines: string[];
  primary_color: string;
  logo_url: string | null;
}

function getRestaurantUrl(slug: string): string {
  if (typeof window === 'undefined') return `/restaurant/${slug}`;
  const { hostname, protocol, port } = window.location;
  const portSuffix = port ? `:${port}` : '';
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `/restaurant/${slug}`;
  }
  const baseDomain = hostname.split('.').slice(-2).join('.');
  return `${protocol}//${slug}.${baseDomain}${portSuffix}`;
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '30, 41, 59';
}

export default function SearchPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [activeCity, setActiveCity] = useState('');
  const [activeCuisine, setActiveCuisine] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('tenants')
        .select('id, name, slug, address, phone, delivery_cities, cuisines, primary_color, logo_url')
        .eq('is_active', true)
        .order('name');
      setRestaurants((data as Restaurant[]) || []);
      setLoading(false);
    })();
  }, []);

  // Collect unique cities and cuisines from data
  const allCities = useMemo(() => {
    const cities = new Set<string>();
    restaurants.forEach((r) => r.delivery_cities?.forEach((c) => cities.add(c)));
    return Array.from(cities).sort();
  }, [restaurants]);

  const allCuisines = useMemo(() => {
    const cuisines = new Set<string>();
    restaurants.forEach((r) => r.cuisines?.forEach((c) => cuisines.add(c)));
    return Array.from(cuisines).sort();
  }, [restaurants]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return restaurants.filter((r) => {
      const matchName = !q || r.name.toLowerCase().includes(q) || r.cuisines?.some((c) => c.toLowerCase().includes(q));
      const matchCity = !activeCity || r.delivery_cities?.some((c) => c === activeCity) || r.address?.toLowerCase().includes(activeCity.toLowerCase());
      const matchCuisine = !activeCuisine || r.cuisines?.includes(activeCuisine);
      return matchName && matchCity && matchCuisine;
    });
  }, [query, activeCity, activeCuisine, restaurants]);

  const hasFilters = query || activeCity || activeCuisine;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Sticky header */}
      <header className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/60 shadow-xl shadow-black/20">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 select-none shrink-0">
            <div className="h-8 w-8 flex items-center justify-center rounded-lg overflow-hidden bg-slate-800 border border-slate-700">
              <SyorderLogoMark size={24} variant="light" />
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-white tracking-widest text-xs uppercase leading-none block">SYORDER</span>
              <span className="text-slate-500 text-[10px] leading-none">Étterem kereső</span>
            </div>
          </Link>

          {/* Inline search in header (compact) */}
          <div className="flex-1 max-w-lg relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Étterem neve vagy konyhatípus..."
              className="pl-9 bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 focus:border-slate-500 h-9 rounded-xl text-sm"
            />
          </div>

          <div className="hidden sm:block" />
        </div>
      </header>

      {/* Hero */}
      <div
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)' }}
      >
        {/* Grid overlay */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(rgba(148,163,184,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,.05) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[200px] bg-slate-500/5 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-700/60 bg-slate-900/50 text-xs text-slate-400 mb-6 tracking-wider uppercase">
            <Search className="h-3 w-3" /> Magyar Éttermek Online
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
            Találd meg a legjobb éttermet!
          </h1>
          <p className="text-slate-400 text-base mb-10 max-w-lg mx-auto">
            Keress névre, konyhatípusra vagy szállítási területre — és rendelj közvetlenül az étterem saját oldalán.
          </p>

          {/* Main search bar */}
          <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Étterem neve vagy konyhatípus..."
                className="pl-11 bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 focus:border-slate-400 h-12 rounded-2xl text-base"
              />
            </div>
            <div className="relative sm:w-52">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={activeCity}
                onChange={(e) => setActiveCity(e.target.value)}
                placeholder="Szállítási város..."
                className="pl-11 bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 focus:border-slate-400 h-12 rounded-2xl text-base"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      {(allCuisines.length > 0 || allCities.length > 0) && (
        <div className="border-b border-slate-200 bg-white shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0 mr-1">Konyha:</span>
            <button
              onClick={() => setActiveCuisine('')}
              className={cn('px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap border',
                !activeCuisine ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400')}
            >
              Összes
            </button>
            {allCuisines.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCuisine(activeCuisine === c ? '' : c)}
                className={cn('px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap border',
                  activeCuisine === c ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400')}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />
            <p className="text-sm text-slate-400">Éttermek betöltése...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-5">
              <UtensilsCrossed className="h-7 w-7 text-slate-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-700 mb-2">Nincs találat</h2>
            <p className="text-slate-400 text-sm max-w-xs mx-auto">
              {restaurants.length === 0
                ? 'Még nincs regisztrált étterem a platformon.'
                : 'Próbálj más keresési feltételt, vagy töröld a szűrőket!'}
            </p>
            {hasFilters && (
              <button
                onClick={() => { setQuery(''); setActiveCity(''); setActiveCuisine(''); }}
                className="mt-5 px-5 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
              >
                Szűrők törlése
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-extrabold text-slate-900">{filtered.length}</span>
                <span className="text-slate-500 text-sm">étterem {hasFilters ? 'a feltételek alapján' : 'a platformon'}</span>
              </div>
              {hasFilters && (
                <button
                  onClick={() => { setQuery(''); setActiveCity(''); setActiveCuisine(''); }}
                  className="text-xs text-slate-400 hover:text-slate-700 transition-colors underline"
                >
                  Szűrők törlése
                </button>
              )}
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((r) => (
                <RestaurantCard key={r.id} restaurant={r} />
              ))}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-200 bg-white py-10 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 bg-slate-900 rounded-lg flex items-center justify-center overflow-hidden">
              <SyorderLogoMark size={24} variant="light" />
            </div>
            <span className="font-bold text-slate-900 tracking-widest text-sm uppercase">SYORDER</span>
          </Link>
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} SYORDER — Magyar Vendéglátós Platform</p>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <Link href="/aszf" className="hover:text-slate-700 transition-colors">ÁSZF</Link>
            <Link href="/" className="hover:text-slate-700 transition-colors">Főoldal</Link>
            <Link href="/login" className="hover:text-slate-700 transition-colors">Partner belépés</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function RestaurantCard({ restaurant: r }: { restaurant: Restaurant }) {
  const href = getRestaurantUrl(r.slug);
  const primary = r.primary_color || '#1e293b';
  const rgb = hexToRgb(primary);

  return (
    <Link
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      className="group block bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:shadow-slate-200/80 hover:-translate-y-0.5 transition-all duration-200"
    >
      {/* Color gradient band / mini hero */}
      <div
        className="h-28 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, rgba(${rgb},.95) 0%, rgba(${rgb},.7) 100%)` }}
      >
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,.4) 1px, transparent 1px)', backgroundSize: '16px 16px' }} />

        {/* Logo */}
        <div className="absolute bottom-3 left-4">
          {r.logo_url ? (
            <div className="h-12 w-12 rounded-xl overflow-hidden border-2 border-white/20 shadow-lg bg-white/10 backdrop-blur-sm">
              <img src={r.logo_url} alt={r.name} className="h-full w-full object-contain p-1" />
            </div>
          ) : (
            <div
              className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-black text-xl border-2 border-white/20 shadow-lg backdrop-blur-sm"
              style={{ backgroundColor: `rgba(${rgb},.5)` }}
            >
              {r.name.charAt(0)}
            </div>
          )}
        </div>

        {/* Cuisine badges top-right */}
        {r.cuisines?.length > 0 && (
          <div className="absolute top-3 right-3 flex flex-wrap gap-1 justify-end max-w-[60%]">
            {r.cuisines.slice(0, 2).map((c) => (
              <span key={c} className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white/90 border border-white/20 backdrop-blur-sm" style={{ backgroundColor: `rgba(${rgb},.4)` }}>
                {c}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="font-bold text-slate-900 text-base leading-tight">{r.name}</h3>
          <ChevronRight className="h-4 w-4 text-slate-400 shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-transform" />
        </div>

        <div className="space-y-1.5 text-xs text-slate-500 mb-4">
          {r.address && (
            <div className="flex items-start gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400 mt-0.5" />
              <span className="leading-tight">{r.address}</span>
            </div>
          )}
          {r.phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span>{r.phone}</span>
            </div>
          )}
          {r.delivery_cities?.length > 0 && (
            <div className="flex items-start gap-1.5">
              <span className="font-medium text-slate-400 shrink-0">Szállítás:</span>
              <span>{r.delivery_cities.slice(0, 3).join(', ')}{r.delivery_cities.length > 3 ? ` +${r.delivery_cities.length - 3}` : ''}</span>
            </div>
          )}
        </div>

        {/* CTA */}
        <div
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity group-hover:opacity-90"
          style={{ backgroundColor: primary }}
        >
          Menü és rendelés
          <ExternalLink className="h-3.5 w-3.5" />
        </div>
      </div>
    </Link>
  );
}
