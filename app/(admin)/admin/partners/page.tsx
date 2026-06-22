'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Building2,
  Search,
  Globe,
  Mail,
  Phone,
  MapPin,
  Power,
  PowerOff,
  ExternalLink,
  Calendar,
  Trash2,
} from 'lucide-react';
import { supabase, Tenant, Subscription } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface TenantWithSub extends Tenant {
  subscriptions?: Subscription[];
}

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<TenantWithSub[]>([]);
  const [partnerRevenues, setPartnerRevenues] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toggleTarget, setToggleTarget] = useState<Tenant | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tenant | null>(null);
  const [saving, setSaving] = useState(false);

  // New subscription extension state
  const [extendTarget, setExtendTarget] = useState<TenantWithSub | null>(null);
  const [extendPeriod, setExtendPeriod] = useState<'havi' | 'negyedeves' | 'eves'>('havi');
  const [selectedPlanValue, setSelectedPlanValue] = useState<string>('Induló');

  const loadPartners = useCallback(async () => {
    setLoading(true);
    
    // Fetch tenants, subscriptions, and our custom server-side authenticated revenue map in parallel
    const [tenantsRes, subsRes] = await Promise.all([
      supabase.from('tenants').select('*').order('created_at', { ascending: false }),
      supabase.from('subscriptions').select('*')
    ]);

    let revenuesMap: Record<string, number> = {};
    try {
      const revRes = await fetch('/api/admin/partners-revenue');
      if (revRes.ok) {
        const revData = await revRes.json();
        revenuesMap = revData.revenues || {};
      }
    } catch (err) {
      console.error('Hiba a bevételek szerver-oldali lekérdezésekor:', err);
    }

    if (tenantsRes.error) {
      toast.error('Hiba történt a partnerek lekérdezésekor: ' + tenantsRes.error.message);
    } else {
      const tenantsRaw = tenantsRes.data || [];
      const subsRaw = subsRes.data || [];

      // Merge subscriptions on the client side
      const subsMap: Record<string, Subscription[]> = {};
      subsRaw.forEach((sub) => {
        if (!subsMap[sub.tenant_id]) {
          subsMap[sub.tenant_id] = [];
        }
        subsMap[sub.tenant_id].push(sub);
      });

      const mergedPartners: TenantWithSub[] = tenantsRaw.map((tenant) => ({
        ...tenant,
        subscriptions: subsMap[tenant.id] || [],
      }));

      setPartners(mergedPartners);
      setPartnerRevenues(revenuesMap);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPartners();
  }, [loadPartners]);

  const filtered = partners.filter((p) => {
    const term = search.toLowerCase();
    return (
      !term ||
      p.name.toLowerCase().includes(term) ||
      p.slug.toLowerCase().includes(term) ||
      (p.email || '').toLowerCase().includes(term) ||
      (p.address || '').toLowerCase().includes(term)
    );
  });

  async function handleToggleActive() {
    if (!toggleTarget) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/toggle-partner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: toggleTarget.id,
          is_active: !toggleTarget.is_active,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error('Hiba történt a státusz változtatásakor: ' + (data.error || 'Ismeretlen hiba'));
      } else {
        toast.success(
          toggleTarget.is_active
            ? `${toggleTarget.name} deaktiválva`
            : `${toggleTarget.name} aktiválva`
        );
        setToggleTarget(null);
        loadPartners();
      }
    } catch (err: any) {
      toast.error('Hiba történt a hálózati kapcsolatban: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/delete-partner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error('Hiba történt a törlés során: ' + (data.error || 'Ismeretlen hiba'));
      } else {
        toast.success(`${deleteTarget.name} törölve`);
        setDeleteTarget(null);
        loadPartners();
      }
    } catch (err: any) {
      toast.error('Hiba történt a hálózati kapcsolatban: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  function openExtendSubscription(partner: TenantWithSub) {
    setExtendTarget(partner);
    const sub = partner.subscriptions?.[0];
    setExtendPeriod((sub?.billing_period as any) || 'havi');
    setSelectedPlanValue(sub?.plan_name || 'Induló');
  }

  async function handleExtendSubscription() {
    if (!extendTarget) return;
    setSaving(true);

    const sub = extendTarget.subscriptions?.[0];
    const currentExpire = sub?.expires_at ? new Date(sub.expires_at) : new Date();
    const baseDate = currentExpire > new Date() ? currentExpire : new Date();

    let newExpire = new Date(baseDate);
    if (extendPeriod === 'eves') {
      newExpire.setFullYear(newExpire.getFullYear() + 1);
    } else if (extendPeriod === 'negyedeves') {
      newExpire.setMonth(newExpire.getMonth() + 3);
    } else {
      // havi
      newExpire.setMonth(newExpire.getMonth() + 1);
    }

    try {
      const res = await fetch('/api/admin/extend-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: extendTarget.id,
          plan_name: selectedPlanValue,
          billing_period: extendPeriod,
          starts_at: sub?.starts_at || new Date().toISOString(),
          expires_at: newExpire.toISOString(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error('Hiba történt a hosszabbítás során: ' + (data.error || 'Ismeretlen hiba'));
      } else {
        toast.success(`${extendTarget.name} előfizetése sikeresen meghosszabbítva!`);
        setExtendTarget(null);
        loadPartners();
      }
    } catch (err: any) {
      toast.error('Hiba történt a hálózati kapcsolatban: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  const planLabels: Record<string, { label: string; color: string }> = {
    basic: { label: 'Alap', color: 'bg-slate-100 text-slate-700' },
    pro: { label: 'Pro', color: 'bg-blue-100 text-blue-700' },
    enterprise: { label: 'Enterprise', color: 'bg-purple-100 text-purple-700' },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Partnerek</h1>
        <p className="text-slate-500 mt-1">Aktív és inaktív étterem partnerek kezelése</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Keresés: név, aldomain, email..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Summary row */}
      <div className="flex items-center gap-6 text-sm text-slate-500">
        <span>
          <strong className="text-slate-900">{partners.filter((p) => p.is_active).length}</strong> aktív
        </span>
        <span>
          <strong className="text-slate-900">{partners.filter((p) => !p.is_active).length}</strong> inaktív
        </span>
        <span>
          <strong className="text-slate-900">{partners.length}</strong> összesen
        </span>
      </div>

      {/* Partners Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-700" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-sm">Nincs partner</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((partner) => {
            const sub = partner.subscriptions?.[0];
            const planDisplay = sub 
              ? { 
                  label: `${sub.plan_name} (${sub.billing_period === 'havi' ? 'Havi' : sub.billing_period === 'negyedeves' ? 'Negyedéves' : sub.billing_period === 'eves' ? 'Éves' : sub.billing_period || 'Egyedi'})`, 
                  color: sub.plan_name?.includes('Professzionális') || sub.plan_name?.toLowerCase().includes('pro') ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'
                }
              : { label: 'Trial / Rég hűség', color: 'bg-amber-100 text-amber-800' };

            return (
              <Card
                key={partner.id}
                className={`relative overflow-hidden transition-shadow hover:shadow-md ${
                  !partner.is_active ? 'opacity-65' : ''
                }`}
              >
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: partner.primary_color }}
                />
                <CardContent className="pt-5 pb-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      {partner.logo_url ? (
                        <img
                          src={partner.logo_url}
                          alt={partner.name}
                          className="h-8 w-8 rounded object-contain"
                        />
                      ) : (
                        <div
                          className="h-8 w-8 rounded flex items-center justify-center text-white text-sm font-bold"
                          style={{ backgroundColor: partner.primary_color }}
                        >
                          {partner.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-slate-900 leading-tight">{partner.name}</p>
                        <p className="text-xs text-slate-400 font-mono">{partner.slug}.syorder.hu</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${planDisplay.color}`}>
                        {planDisplay.label}
                      </span>
                      <Badge variant={partner.is_active ? 'default' : 'secondary'} className="text-[10px] py-0 px-1.5 h-4">
                        {partner.is_active ? 'Aktív' : 'Inaktív'}
                      </Badge>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-1.5 text-sm text-slate-500">
                    {partner.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{partner.email}</span>
                      </div>
                    )}
                    {partner.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span>{partner.phone}</span>
                      </div>
                    )}
                    {partner.address && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{partner.address}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>Csatlakozott: {new Date(partner.created_at).toLocaleDateString('hu-HU')}</span>
                    </div>

                    <div className="mt-2 flex items-center justify-between font-semibold text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                      <span className="text-xs uppercase tracking-wider">Összesített bevétel:</span>
                      <span className="text-sm font-extrabold">{(partnerRevenues[partner.id] || 0).toLocaleString('hu-HU')} Ft</span>
                    </div>

                    {/* Subscription info instead of trial keyword */}
                    {sub ? (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-400">Aktuális csomag:</span>
                          <span className="font-semibold text-slate-700">{sub.plan_name}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-400">Számlázási ütem:</span>
                          <span className="font-medium text-slate-700">{sub.billing_period === 'havi' ? 'Havi' : sub.billing_period === 'negyedeves' ? 'Negyedéves' : sub.billing_period === 'eves' ? 'Éves' : sub.billing_period}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-400">Lejárat dátuma:</span>
                          <span className={`font-semibold ${new Date(sub.expires_at || '') < new Date() ? 'text-rose-600 font-bold' : 'text-emerald-600'}`}>
                            {sub.expires_at ? new Date(sub.expires_at).toLocaleDateString('hu-HU') : 'Nincs megadva'}
                            {new Date(sub.expires_at || '') < new Date() && ' (Lejárt)'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 text-xs text-amber-600 font-semibold bg-amber-50/50 p-1.5 rounded border border-amber-100/30">
                        Nincs aktív előfizetési adat (Trial)
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="space-y-2 mt-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="gap-1 flex-1 text-xs"
                      >
                        <a href={`/menu/${partner.slug}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" />
                          Menü
                        </a>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openExtendSubscription(partner)}
                        className="gap-1 flex-1 text-slate-700 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 border-slate-200 text-xs"
                      >
                        <Calendar className="h-3 w-3 text-blue-500" />
                        Hosszabbítás
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setToggleTarget(partner)}
                        className={`gap-1 flex-1 text-xs ${
                          partner.is_active
                            ? 'text-rose-600 border-rose-200 hover:bg-rose-50'
                            : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                        }`}
                      >
                        {partner.is_active ? (
                          <><PowerOff className="h-3 w-3" /> Deaktivál</>
                        ) : (
                          <><Power className="h-3 w-3" /> Aktivál</>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteTarget(partner)}
                        className="gap-1 text-rose-700 border-rose-300 hover:bg-rose-50 px-2 shrink-0"
                        title="Végleges Törlés"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Toggle confirm dialog */}
      <Dialog open={!!toggleTarget} onOpenChange={(o) => !o && setToggleTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {toggleTarget?.is_active ? 'Partner Deaktiválása' : 'Partner Aktiválása'}
            </DialogTitle>
            <DialogDescription>
              {toggleTarget?.is_active
                ? `Biztosan deaktiválod a(z) ${toggleTarget?.name} partnert? Az étterem menüje és rendszere elérhetetlenné válik.`
                : `Biztosan aktiválod a(z) ${toggleTarget?.name} partnert?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToggleTarget(null)}>Mégse</Button>
            <Button
              variant={toggleTarget?.is_active ? 'destructive' : 'default'}
              onClick={handleToggleActive}
              disabled={saving}
              className={!toggleTarget?.is_active ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
            >
              {saving ? 'Mentés...' : toggleTarget?.is_active ? 'Deaktiválás' : 'Aktiválás'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-700">Partner Végleges Törlése</DialogTitle>
            <DialogDescription>
              <span className="block mb-2">
                Biztosan törlöd a(z) <strong>{deleteTarget?.name}</strong> partnert?
              </span>
              <span className="block text-red-600 font-medium">
                Ez a művelet visszavonhatatlan! Az összes rendelés, menü és adat véglegesen törlődik.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Mégse</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? 'Törlés...' : 'Végleges Törlés'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend subscription dialog */}
      <Dialog open={!!extendTarget} onOpenChange={(o) => !o && setExtendTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Előfizetés / Hűség hosszabbítása</DialogTitle>
            <DialogDescription>
              Manuális előfizetés-hosszabbítás a(z) <strong className="text-slate-800">{extendTarget?.name}</strong> részére.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="plan" className="font-semibold text-slate-800">Előfizetési Csomag</Label>
              <Select value={selectedPlanValue} onValueChange={setSelectedPlanValue}>
                <SelectTrigger id="plan" className="w-full">
                  <SelectValue placeholder="Válassz csomagot" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Induló">Induló</SelectItem>
                  <SelectItem value="Professzionális">Professzionális</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="period" className="font-semibold text-slate-800">Hosszabbítás időtartama</Label>
              <Select value={extendPeriod} onValueChange={(v: any) => setExtendPeriod(v)}>
                <SelectTrigger id="period" className="w-full">
                  <SelectValue placeholder="Válassz időszakot" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="havi">Havi (+30 nap)</SelectItem>
                  <SelectItem value="negyedeves">Negyedéves (+90 nap)</SelectItem>
                  <SelectItem value="eves">Éves (+365 nap)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {extendTarget?.subscriptions?.[0] && (
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs space-y-1">
                <p className="text-slate-500 font-medium">Jelenlegi lejárat:</p>
                <p className="font-mono text-slate-800 font-semibold">
                  {extendTarget.subscriptions[0].expires_at 
                    ? new Date(extendTarget.subscriptions[0].expires_at).toLocaleDateString('hu-HU') 
                    : 'Nincs lejárat'}
                </p>
                <p className="text-slate-400 mt-1">Az új lejárati dátum a jelenlegiből számolódik tovább, amennyiben az a jövőben van, különben a mai naptól indul.</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendTarget(null)}>Mégse</Button>
            <Button onClick={handleExtendSubscription} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? 'Mentés...' : 'Hosszabbítás Mentése'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
