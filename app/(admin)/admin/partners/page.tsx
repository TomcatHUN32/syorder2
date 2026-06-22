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
import { supabase, Tenant } from '@/lib/supabase/client';
import { toast } from 'sonner';

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toggleTarget, setToggleTarget] = useState<Tenant | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tenant | null>(null);
  const [saving, setSaving] = useState(false);

  const loadPartners = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });
    setPartners(data || []);
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
    const { error } = await supabase
      .from('tenants')
      .update({ is_active: !toggleTarget.is_active, updated_at: new Date().toISOString() })
      .eq('id', toggleTarget.id);

    if (error) {
      toast.error('Hiba történt a státusz változtatásakor');
    } else {
      toast.success(
        toggleTarget.is_active
          ? `${toggleTarget.name} deaktiválva`
          : `${toggleTarget.name} aktiválva`
      );
      setToggleTarget(null);
      loadPartners();
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    const { error } = await supabase.from('tenants').delete().eq('id', deleteTarget.id);
    if (error) {
      toast.error('Hiba történt a törlés során: ' + error.message);
    } else {
      toast.success(`${deleteTarget.name} törölve`);
      setDeleteTarget(null);
      loadPartners();
    }
    setSaving(false);
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
            const plan = planLabels[partner.subscription_plan] || { label: partner.subscription_plan, color: 'bg-slate-100 text-slate-700' };
            return (
              <Card
                key={partner.id}
                className={`relative overflow-hidden transition-shadow hover:shadow-md ${
                  !partner.is_active ? 'opacity-60' : ''
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
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${plan.color}`}>
                        {plan.label}
                      </span>
                      <Badge variant={partner.is_active ? 'default' : 'secondary'} className="text-xs">
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
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="gap-1 flex-1"
                    >
                      <a href={`/menu/${partner.slug}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Menü
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setToggleTarget(partner)}
                      className={`gap-1 flex-1 ${
                        partner.is_active
                          ? 'text-red-600 border-red-200 hover:bg-red-50'
                          : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                      }`}
                    >
                      {partner.is_active ? (
                        <><PowerOff className="h-3.5 w-3.5" /> Deaktivál</>
                      ) : (
                        <><Power className="h-3.5 w-3.5" /> Aktivál</>
                      )}
                    </Button>
                    {!partner.is_active && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteTarget(partner)}
                        className="gap-1 text-red-700 border-red-300 hover:bg-red-50"
                        title="Partner törlése"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
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
    </div>
  );
}
