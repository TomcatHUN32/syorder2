'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, Terminal, HelpCircle, X, ExternalLink, Settings } from 'lucide-react';

export function SupabaseConfigWarning() {
  const [isPlaceholder, setIsPlaceholder] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const isMissingOrPlaceholder = !supabaseUrl || supabaseUrl.includes('placeholder.supabase.co');
    setIsPlaceholder(isMissingOrPlaceholder);
  }, []);

  if (!isPlaceholder || isDismissed) {
    return null;
  }

  return (
    <div id="supabase-config-warning" className="relative z-50 bg-gradient-to-r from-amber-950/90 via-slate-900/95 to-amber-950/90 border-b border-amber-500/30 text-slate-200 px-4 py-4 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl mt-0.5 shrink-0 border border-amber-500/20">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white tracking-wide flex items-center gap-1.5">
              Supabase Konfiguráció Szükséges (Supabase Configuration Required)
            </h4>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Az alkalmazás jelenleg <strong>demó/helyőrző (placeholder)</strong> Supabase beállításokkal fut. 
              A bejelentkezés, étlapok, rendelések és analitika mentéséhez csatlakoztatnod kell a saját Supabase adatbázisodat.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-slate-300 flex items-center gap-1">
                <Terminal className="h-3.5 w-3.5 text-amber-500" />
                Séma migráció: <code className="text-amber-400 font-mono text-[10px]">supabase/migrations/*</code>
              </span>
              <span className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-slate-300 flex items-center gap-1">
                <Settings className="h-3.5 w-3.5 text-amber-500" />
                Állítsd be a Secrets-ben: <code className="text-amber-400 font-mono text-[10px]">NEXT_PUBLIC_SUPABASE_URL</code>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto mt-2 md:mt-0 justify-end">
          <a 
            href="https://supabase.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs font-medium text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg px-3 py-1.5 flex items-center gap-1 transition-all"
          >
            Supabase.com <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <button 
            type="button"
            onClick={() => setIsDismissed(true)}
            className="text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg px-3 py-1.5 transition-all"
          >
            Bezárás
          </button>
        </div>
      </div>
    </div>
  );
}
