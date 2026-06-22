'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  ShoppingBag,
  Package,
  Users,
  BarChart3,
  CheckCircle,
  ArrowRight,
  Zap,
  Globe,
  ChefHat,
  TrendingUp,
  Shield,
  Loader2,
  AlertCircle,
  Menu,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SyorderLogoMark } from '@/components/syorder-logo';

type PlanKey = 'indulo' | 'professzionalis';
type BillingKey = 'havi' | 'negyedeves' | 'eves';

const PRICING: Record<PlanKey, Record<BillingKey, { monthly: number; total: number; saving: number }>> = {
  indulo: {
    havi:       { monthly: 14900, total: 14900,  saving: 0 },
    negyedeves: { monthly: 13500, total: 40500,  saving: 3200 },
    eves:       { monthly: 11900, total: 142800, saving: 25800 },
  },
  professzionalis: {
    havi:       { monthly: 29900, total: 29900,  saving: 0 },
    negyedeves: { monthly: 27500, total: 82500,  saving: 7200 },
    eves:       { monthly: 23900, total: 286800, saving: 72000 },
  },
};
const PLAN_LABELS: Record<PlanKey, string> = { indulo: 'Induló', professzionalis: 'Professzionális' };
const BILLING_LABELS: Record<BillingKey, string> = { havi: 'Havi', negyedeves: 'Negyedéves', eves: 'Éves' };

const FEATURES = [
  { icon: ShoppingBag, title: 'Valós idejű Rendeléskezelés', desc: 'Minden rendelés azonnal megjelenik és kezelhető az irányítópulton.' },
  { icon: Package,    title: 'Okos Készletkövetés',          desc: 'Automatikus riasztás 30% alatti készletnél, recept alapú fogyasztáskövetés.' },
  { icon: Users,      title: 'Hűségprogram',                  desc: 'Pontgyűjtős hűségrendszer, VIP vendégek kezelése.' },
  { icon: BarChart3,  title: 'Részletes Analitika',           desc: 'Bevételi trendek, legjobban teljesítő tételek, időszaki összehasonlítás.' },
  { icon: Globe,      title: 'Nyilvános Menüoldal',           desc: 'Saját aldomainen megjeleníthető, márkázható online menü.' },
  { icon: Shield,     title: 'Teljes Adatbiztonság',          desc: 'Restaurant-szintű adatelszigeteltség, biztonságos multi-tenant architektúra.' },
];

const PLANS: { key: PlanKey; name: string; desc: string; features: string[]; highlighted: boolean }[] = [
  {
    key: 'indulo',
    name: 'Induló',
    desc: 'Kis éttermek és büfék számára',
    features: ['1 helyszín', 'Korlátlan rendelés', 'Menükezelés', 'Alap analitika', 'Kassza integráció', 'E-mail support'],
    highlighted: false,
  },
  {
    key: 'professzionalis',
    name: 'Professzionális',
    desc: 'Növekvő vendéglátóhelyek számára',
    features: ['Több helyszín', 'Korlátlan rendelés', 'Készletkezelés', 'Hűségprogram', 'Részletes analitika', 'Kassza & szállítási integráció', 'API hozzáférés', 'Prioritásos support'],
    highlighted: true,
  },
];

function fmt(n: number) { return n.toLocaleString('hu-HU'); }

export default function LandingPage() {
  const [navOpen, setNavOpen] = useState(false);
  const [activeBilling, setActiveBilling] = useState<BillingKey>('havi');
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>('indulo');
  const [selectedBilling, setSelectedBilling] = useState<BillingKey>('havi');
  const [form, setForm] = useState({ business_name: '', contact_name: '', email: '', phone: '', city: '', address: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.business_name || !form.contact_name || !form.email) {
      toast.error('Kérjük, töltsd ki a kötelező mezőket!');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('restaurant_requests').insert({
        business_name: form.business_name, contact_name: form.contact_name, email: form.email,
        phone: form.phone || null, city: form.city || null, address: form.address || null,
        message: form.message || null, plan: selectedPlan, billing_period: selectedBilling,
      });
      if (error) throw error;
      setSubmitted(true);
      toast.success('Igénylésed sikeresen beérkezett!');
    } catch (err) {
      console.error(err);
      toast.error('Hiba történt, kérjük próbáld újra.');
    } finally {
      setSubmitting(false);
    }
  }

  const chosenPricing = PRICING[selectedPlan][selectedBilling];

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 overflow-x-hidden">

      {/* ── Navigation ── */}
      <nav className="fixed top-0 left-0 right-0 z-50">
        <div className="mx-4 mt-4">
          <div className="max-w-6xl mx-auto bg-slate-900/80 backdrop-blur-xl border border-slate-800/60 rounded-2xl px-5 h-14 flex items-center justify-between shadow-lg shadow-black/30">
            <Link href="/" className="flex items-center gap-3 select-none">
              <div className="h-9 w-9 flex items-center justify-center rounded-xl overflow-hidden bg-slate-800 border border-slate-700 shrink-0">
                <SyorderLogoMark size={28} variant="light" />
              </div>
              <span className="text-sm font-bold tracking-widest text-white uppercase">SYORDER</span>
            </Link>

            <div className="hidden md:flex items-center gap-7 text-sm text-slate-400">
              {[['#features','Funkciók'],['#pricing','Árak'],['#igenyles','Igénylés']].map(([h,l])=>(
                <a key={h} href={h} className="hover:text-white transition-colors">{l}</a>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <a href="#igenyles" className="hidden md:inline-flex">
                <Button size="sm" className="bg-white text-slate-900 hover:bg-slate-100 font-semibold">
                  Igénylés
                </Button>
              </a>
              <button className="md:hidden p-1.5" onClick={() => setNavOpen(!navOpen)}>
                {navOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {navOpen && (
            <div className="md:hidden mt-2 max-w-6xl mx-auto bg-slate-900/95 backdrop-blur border border-slate-800 rounded-2xl p-4 space-y-1">
              {[['#features','Funkciók'],['#pricing','Árak'],['#igenyles','Igénylés']].map(([h,l])=>(
                <a key={h} href={h} onClick={() => setNavOpen(false)} className="block px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 text-sm">{l}</a>
              ))}
              <div className="pt-2 border-t border-slate-800">
                <a href="#igenyles" onClick={() => setNavOpen(false)}>
                  <Button size="sm" className="w-full bg-white text-slate-900">Igénylés</Button>
                </a>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-32 pb-20 px-4">
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(rgba(100,116,139,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(100,116,139,.06) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-slate-700/8 rounded-full blur-[140px] pointer-events-none" />

        <div className="relative z-10 text-center max-w-5xl mx-auto">
          {/* Logo */}
          <div className="flex justify-center mb-10">
            <div className="relative">
              <div className="absolute inset-0 blur-2xl bg-white/5 rounded-3xl scale-150 pointer-events-none" />
              <div className="relative w-24 h-24 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden shadow-2xl">
                <SyorderLogoMark size={72} variant="light" />
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-slate-700/60 bg-slate-900/50 text-xs text-slate-400 mb-8 tracking-wider uppercase">
            <Zap className="h-3 w-3 text-amber-400" />
            Magyar Vendéglátós SaaS Platform
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.04] mb-6">
            <span className="text-white">Az éttermed</span>
            <br />
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #e2e8f0 0%, #94a3b8 50%, #64748b 100%)' }}>
              teljesen digitálisan
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Valós idejű rendeléskezelés, okos készletkövetés, hűségprogram és részletes analitika — telepítés és IT csapat nélkül.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <a href="#igenyles">
              <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100 h-12 px-8 font-bold text-base shadow-xl shadow-white/10">
                Ingyenes Igénylés <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
          </div>

          {/* Quick stats strip */}
          <div className="flex flex-wrap justify-center gap-8 mt-6 text-sm text-slate-500">
            <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-emerald-500" />Azonnali aktiválás</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-emerald-500" />Telepítés nélkül</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-emerald-500" />99.9% rendelkezésre állás</span>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-4 border-t border-slate-800/60">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Minden, amire szükséged van</h2>
            <p className="text-slate-400 max-w-lg mx-auto">Professzionális vendéglátós szoftver, amely az éttermed teljes működését lefedi.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="p-6 rounded-2xl border border-slate-800/60 bg-slate-900/30 hover:border-slate-700/60 hover:bg-slate-900/50 transition-all group">
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-4 group-hover:border-slate-600 transition-colors">
                  <f.icon className="h-5 w-5 text-slate-300" />
                </div>
                <h3 className="font-semibold text-white mb-2 text-sm">{f.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-24 px-4 border-y border-slate-800/60 bg-slate-900/20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-white">Hogyan működik?</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            {[
              { step: '01', title: 'Küldd be az igénylést', desc: 'Töltsd ki az alábbi űrlapot az éttermed alapadataival. Válassz csomagot és fizetési időszakot.', icon: ChefHat },
              { step: '02', title: 'Jóváhagyás és díjbekérő', desc: 'Csapatunk 1–2 munkanapon belül elbírálja a kérelmet és díjbekérőt küld a megadott email-címre.', icon: Zap },
              { step: '03', title: 'Aktiválás 2 munkanapon belül', desc: 'A fizetés beérkezésétől számított 2 munkanapon belül aktiváljuk a fiókodat és megküldjük a belépési adatokat.', icon: TrendingUp },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="relative inline-flex mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                    <item.icon className="h-6 w-6 text-white" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-amber-400 text-slate-900 text-xs font-black flex items-center justify-center">{item.step}</span>
                </div>
                <h3 className="font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Áraink</h2>
            <p className="text-slate-400 mb-8">Rejtett díjak nélkül, azonnali aktiválással.</p>
            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
              {(Object.entries(BILLING_LABELS) as [BillingKey, string][]).map(([key, label]) => (
                <button key={key} onClick={() => setActiveBilling(key)}
                  className={cn('px-5 py-2 rounded-lg text-sm font-medium transition-all', activeBilling === key ? 'bg-white text-slate-900 shadow' : 'text-slate-400 hover:text-white')}>
                  {label}
                  {key === 'eves' && <span className="ml-1.5 text-xs text-emerald-400 font-bold">−20%</span>}
                  {key === 'negyedeves' && <span className="ml-1.5 text-xs text-amber-400 font-bold">−10%</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {PLANS.map((plan) => {
              const p = PRICING[plan.key][activeBilling];
              return (
                <div key={plan.key} className={cn('relative rounded-2xl border p-6', plan.highlighted ? 'border-slate-400/50 bg-slate-900/80 shadow-2xl shadow-white/5' : 'border-slate-800 bg-slate-900/30')}>
                  {plan.highlighted && <div className="absolute -top-3 left-1/2 -translate-x-1/2"><Badge className="bg-white text-slate-900 px-4 py-0.5 text-xs font-bold">Legnépszerűbb</Badge></div>}
                  <h3 className="text-base font-bold text-white mb-1">{plan.name}</h3>
                  <p className="text-xs text-slate-500 mb-4">{plan.desc}</p>
                  <div className="mb-2">
                    <span className="text-4xl font-black text-white">{fmt(p.monthly)}</span>
                    <span className="text-slate-500 text-sm ml-1">Ft / hó</span>
                  </div>
                  {activeBilling !== 'havi' && (
                    <div className="mb-4 text-xs space-y-0.5">
                      <p className="text-slate-400">Összesen: <span className="text-white font-semibold">{fmt(p.total)} Ft</span></p>
                      <p className="text-emerald-400 font-semibold">Megtakarítás: {fmt(p.saving)} Ft/év</p>
                    </div>
                  )}
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />{f}
                      </li>
                    ))}
                  </ul>
                  <a href="#igenyles" onClick={() => { setSelectedPlan(plan.key); setSelectedBilling(activeBilling); }}>
                    <Button className={cn('w-full', plan.highlighted ? 'bg-white text-slate-900 hover:bg-slate-100 font-bold' : 'border-slate-700 text-slate-300 hover:bg-slate-800 bg-transparent')} variant={plan.highlighted ? 'default' : 'outline'}>
                      Igénylés — {PLAN_LABELS[plan.key]}, {BILLING_LABELS[activeBilling]}
                    </Button>
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Application Form ── */}
      <section id="igenyles" className="py-24 px-4 border-t border-slate-800/60 bg-slate-900/20">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-10">
            <span className="inline-block px-3 py-1 rounded-full border border-slate-700 bg-slate-800/60 text-xs text-slate-400 mb-4 uppercase tracking-wider">Ingyenes Igénylés</span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Csatlakozz a SYORDER-hez</h2>
            <p className="text-slate-400">Küldd be az adataidat és 24 órán belül aktiváljuk az éttermedet.</p>
          </div>

          {submitted ? (
            <div className="border border-emerald-800/60 bg-emerald-950/30 rounded-2xl py-16 px-8 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-900/40 border border-emerald-700/50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-7 w-7 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Igénylés beérkezett!</h3>
              <p className="text-slate-400 text-sm max-w-xs mx-auto">
                Köszönjük! Csapatunk hamarosan felveszi veled a kapcsolatot a <strong className="text-white">{form.email}</strong> email-címen.
              </p>
            </div>
          ) : (
            <div className="border border-slate-800/60 rounded-2xl bg-slate-900/40 p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Plan */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-300">Csomag <span className="text-red-400">*</span></Label>
                  <div className="grid grid-cols-2 gap-2">
                    {PLANS.map((plan) => (
                      <button key={plan.key} type="button" onClick={() => setSelectedPlan(plan.key)}
                        className={cn('p-3.5 rounded-xl border text-left transition-all', selectedPlan === plan.key ? 'border-white bg-white/10' : 'border-slate-700 bg-slate-800/40 hover:border-slate-600')}>
                        <div className="text-sm font-semibold text-white">{plan.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5 truncate">{plan.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Billing period */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-300">Előfizetési időszak <span className="text-red-400">*</span></Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.entries(BILLING_LABELS) as [BillingKey, string][]).map(([key, label]) => {
                      const p = PRICING[selectedPlan][key];
                      return (
                        <button key={key} type="button" onClick={() => setSelectedBilling(key)}
                          className={cn('p-3 rounded-xl border text-left transition-all', selectedBilling === key ? 'border-white bg-white/10' : 'border-slate-700 bg-slate-800/40 hover:border-slate-600')}>
                          <div className="text-sm font-semibold text-white">{label}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{fmt(p.monthly)} Ft/hó</div>
                          {key !== 'havi' && p.saving > 0 && <div className="text-xs text-emerald-400 mt-0.5">−{fmt(p.saving)} Ft/év</div>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Price summary */}
                <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Csomag</span>
                    <span className="font-medium text-white">{PLAN_LABELS[selectedPlan]} — {BILLING_LABELS[selectedBilling]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Havi díj</span>
                    <span className="font-bold text-white text-base">{fmt(chosenPricing.monthly)} Ft / hó</span>
                  </div>
                  {selectedBilling !== 'havi' && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Fizetendő összeg</span>
                      <span className="font-bold text-white">{fmt(chosenPricing.total)} Ft</span>
                    </div>
                  )}
                  {chosenPricing.saving > 0 && (
                    <div className="flex justify-between border-t border-slate-700/60 pt-2 mt-1">
                      <span className="text-emerald-400">Megtakarítás</span>
                      <span className="font-bold text-emerald-400">{fmt(chosenPricing.saving)} Ft/év</span>
                    </div>
                  )}
                  <div className="flex items-start gap-2 border-t border-slate-700/60 pt-3 mt-1">
                    <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-red-400 text-xs leading-relaxed font-medium">
                      Az igénylés jóváhagyása után <strong>díjbekérő fog érkezni</strong> a megadott email-címre.
                    </p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="business_name" className="text-xs font-medium text-slate-400">Étterem neve <span className="text-red-400">*</span></Label>
                    <Input id="business_name" name="business_name" value={form.business_name} onChange={handleChange} placeholder="pl. Kovács Vendéglő" required className="bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-600 focus:border-slate-500 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contact_name" className="text-xs font-medium text-slate-400">Kapcsolattartó <span className="text-red-400">*</span></Label>
                    <Input id="contact_name" name="contact_name" value={form.contact_name} onChange={handleChange} placeholder="Kovács János" required className="bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-600 focus:border-slate-500 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-medium text-slate-400">Email <span className="text-red-400">*</span></Label>
                    <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="janos@etterem.hu" required className="bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-600 focus:border-slate-500 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs font-medium text-slate-400">Telefonszám</Label>
                    <Input id="phone" name="phone" value={form.phone} onChange={handleChange} placeholder="+36 30 123 4567" className="bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-600 focus:border-slate-500 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="city" className="text-xs font-medium text-slate-400">Város</Label>
                    <Input id="city" name="city" value={form.city} onChange={handleChange} placeholder="Budapest" className="bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-600 focus:border-slate-500 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="address" className="text-xs font-medium text-slate-400">Cím</Label>
                    <Input id="address" name="address" value={form.address} onChange={handleChange} placeholder="Fő utca 1." className="bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-600 focus:border-slate-500 rounded-xl" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="message" className="text-xs font-medium text-slate-400">Üzenet / Egyéb info</Label>
                  <Textarea id="message" name="message" value={form.message} onChange={handleChange} placeholder="Röviden mutasd be az éttermedet..." rows={3} className="bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-600 focus:border-slate-500 resize-none rounded-xl" />
                </div>

                <Button type="submit" disabled={submitting} className="w-full h-12 bg-white hover:bg-slate-100 text-slate-900 font-bold text-base rounded-xl">
                  {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Küldés...</> : <>Igénylés Beküldése <ArrowRight className="ml-2 h-4 w-4" /></>}
                </Button>
                <p className="text-xs text-slate-600 text-center">Az igénylés elküldésével elfogadod az{' '}
                  <Link href="/aszf" target="_blank" className="text-slate-400 underline hover:text-white transition-colors">Általános Szerződési Feltételeinket</Link>.
                </p>
              </form>
            </div>
          )}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-800/60 py-10 px-4 bg-[#080c14]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center">
              <SyorderLogoMark size={24} variant="light" />
            </div>
            <span className="font-bold text-white tracking-widest text-sm uppercase">SYORDER</span>
          </div>
          <p className="text-xs text-slate-600">© {new Date().getFullYear()} SYORDER. Minden jog fenntartva.</p>
        </div>
      </footer>
    </div>
  );
}
