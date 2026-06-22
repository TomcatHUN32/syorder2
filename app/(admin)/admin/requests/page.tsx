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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  FileText,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  Phone,
  Mail,
  MapPin,
  MessageSquare,
  Building2,
  User,
  Copy,
  Check,
  KeyRound,
  Monitor,
} from 'lucide-react';
import { supabase, RestaurantRequest } from '@/lib/supabase/client';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Függőben', variant: 'secondary' },
  approved: { label: 'Jóváhagyva', variant: 'default' },
  rejected: { label: 'Elutasítva', variant: 'destructive' },
};

interface Credentials {
  posEmail: string;
  posPassword: string;
  businessName: string;
  subdomain: string;
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="space-y-1">
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 bg-slate-100 rounded-md px-3 py-2 text-sm font-mono text-slate-800 break-all">
          {value}
        </code>
        <button
          onClick={copy}
          className="shrink-0 p-2 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
          title="Másolás"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<RestaurantRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<RestaurantRequest | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [subdomainInput, setSubdomainInput] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('restaurant_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data } = await query;
    setRequests(data || []);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const filtered = requests.filter((r) => {
    const term = search.toLowerCase();
    return (
      !term ||
      r.business_name.toLowerCase().includes(term) ||
      r.contact_name.toLowerCase().includes(term) ||
      r.email.toLowerCase().includes(term) ||
      (r.city || '').toLowerCase().includes(term)
    );
  });

  function openDetail(req: RestaurantRequest) {
    setSelected(req);
    setDetailOpen(true);
  }

  function openApprove(req: RestaurantRequest) {
    setSelected(req);
    setSubdomainInput(req.subdomain || req.business_name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9-]/g, ''));
    setApproveDialogOpen(true);
  }

  function openReject(req: RestaurantRequest) {
    setSelected(req);
    setRejectNotes('');
    setRejectDialogOpen(true);
  }

  async function handleApprove() {
    if (!selected || !subdomainInput.trim()) return;
    setSaving(true);

    try {
      const res = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: selected.id, subdomain: subdomainInput.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Hiba történt a jóváhagyás során');
        return;
      }

      setCredentials({
        posEmail: data.posEmail,
        posPassword: data.posPassword,
        businessName: selected.business_name,
        subdomain: subdomainInput.trim(),
      });
      setApproveDialogOpen(false);
      setCredentialsOpen(true);
      toast.success(`${selected.business_name} jóváhagyva — belépési adatok generálva`);
      loadRequests();
    } finally {
      setSaving(false);
    }
  }

  async function handleReject() {
    if (!selected) return;
    setSaving(true);
    const { error } = await supabase
      .from('restaurant_requests')
      .update({ status: 'rejected', notes: rejectNotes || null, updated_at: new Date().toISOString() })
      .eq('id', selected.id);

    if (error) {
      toast.error('Hiba történt az elutasítás során');
    } else {
      toast.success(`${selected.business_name} elutasítva`);
      setRejectDialogOpen(false);
      loadRequests();
    }
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Igénylések</h1>
        <p className="text-slate-500 mt-1">Beérkező étterem-csatlakozási igénylések kezelése</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Keresés: név, email, város..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Státusz" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Összes státusz</SelectItem>
            <SelectItem value="pending">Függőben</SelectItem>
            <SelectItem value="approved">Jóváhagyva</SelectItem>
            <SelectItem value="rejected">Elutasítva</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-500" />
            {filtered.length} igénylés
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-700" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Nincs találat</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((req) => {
                const status = STATUS_CONFIG[req.status] || { label: req.status, variant: 'outline' as const };
                return (
                  <div key={req.id} className="py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-900">{req.business_name}</p>
                        <Badge variant={status.variant}>{status.label}</Badge>
                        {req.subdomain && (
                          <span className="text-xs text-slate-400 font-mono">{req.subdomain}.syorder.hu</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5">
                        {req.contact_name} · {req.email}
                        {req.city && ` · ${req.city}`}
                      </p>
                      {(req.plan || req.billing_period) && (
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                          {req.plan && (
                            <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-medium">
                              {req.plan === 'indulo' ? 'Induló' : 'Professzionális'}
                            </span>
                          )}
                          {req.billing_period && (
                            <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">
                              {req.billing_period === 'havi' ? 'Havi' : req.billing_period === 'negyedeves' ? 'Negyedéves' : 'Éves'}
                            </span>
                          )}
                        </p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(req.created_at).toLocaleString('hu-HU')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDetail(req)}
                        className="gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Részletek
                      </Button>
                      {req.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => openApprove(req)}
                            className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Jóváhagyás
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openReject(req)}
                            className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Elutasítás
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected?.business_name}</DialogTitle>
            <DialogDescription>Igénylés részletei</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500">Kapcsolattartó</p>
                    <p className="text-sm font-medium">{selected.contact_name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Building2 className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500">Státusz</p>
                    <Badge variant={STATUS_CONFIG[selected.status]?.variant || 'outline'}>
                      {STATUS_CONFIG[selected.status]?.label || selected.status}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500">Email</p>
                    <p className="text-sm font-medium">{selected.email}</p>
                  </div>
                </div>
                {selected.phone && (
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Telefon</p>
                      <p className="text-sm font-medium">{selected.phone}</p>
                    </div>
                  </div>
                )}
                {(selected.address || selected.city) && (
                  <div className="flex items-start gap-2 col-span-2">
                    <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Cím</p>
                      <p className="text-sm font-medium">
                        {[selected.address, selected.city].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  </div>
                )}
                {selected.message && (
                  <div className="flex items-start gap-2 col-span-2">
                    <MessageSquare className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Üzenet</p>
                      <p className="text-sm">{selected.message}</p>
                    </div>
                  </div>
                )}
                {selected.notes && (
                  <div className="col-span-2 bg-amber-50 rounded-lg p-3">
                    <p className="text-xs text-amber-700 font-medium mb-1">Admin megjegyzés</p>
                    <p className="text-sm text-amber-900">{selected.notes}</p>
                  </div>
                )}
              </div>
              {selected.subdomain && (
                <div className="bg-emerald-50 rounded-lg p-3">
                  <p className="text-xs text-emerald-700 font-medium mb-1">Kiosztott aldomain</p>
                  <p className="text-sm font-mono text-emerald-900">{selected.subdomain}.syorder.hu</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {selected?.status === 'pending' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setDetailOpen(false); openReject(selected!); }}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  Elutasítás
                </Button>
                <Button
                  size="sm"
                  onClick={() => { setDetailOpen(false); openApprove(selected!); }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Jóváhagyás
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Igénylés Jóváhagyása</DialogTitle>
            <DialogDescription>
              Állítsd be az aldomain nevet a(z) {selected?.business_name} számára. A jóváhagyás után a rendszer automatikusan generál belépési adatokat a pos2.syorder.hu-hoz.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="subdomain">Aldomain</Label>
            <div className="flex items-center gap-2">
              <Input
                id="subdomain"
                value={subdomainInput}
                onChange={(e) => setSubdomainInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="pl. pizzapalace"
              />
              <span className="text-slate-500 text-sm whitespace-nowrap">.syorder.hu</span>
            </div>
            <p className="text-xs text-slate-400">
              Csak kisbetűk, számok és kötőjel. A belépési email: <span className="font-mono">{subdomainInput || 'aldomain'}@pos2.syorder.hu</span>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>Mégse</Button>
            <Button
              onClick={handleApprove}
              disabled={saving || !subdomainInput.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving ? 'Feldolgozás...' : 'Jóváhagyás & Hozzáférés generálása'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Igénylés Elutasítása</DialogTitle>
            <DialogDescription>
              Elutasítod a(z) {selected?.business_name} igénylését.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="notes">Megjegyzés (opcionális)</Label>
            <Textarea
              id="notes"
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="Pl. hiányzó információ, nem megfelelő..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Mégse</Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={saving}
            >
              {saving ? 'Mentés...' : 'Elutasítás'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credentials Dialog */}
      <Dialog open={credentialsOpen} onOpenChange={setCredentialsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <KeyRound className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <DialogTitle>Belépési adatok generálva</DialogTitle>
                <DialogDescription className="text-xs">
                  {credentials?.businessName}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-2">
              <Monitor className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-emerald-800">Bejelentkezési oldal</p>
                <p className="text-sm font-mono text-emerald-700 mt-0.5">
                  pos2.syorder.hu/login
                </p>
              </div>
            </div>

            <CopyField label="Email cím (felhasználónév)" value={credentials?.posEmail || ''} />
            <CopyField label="Jelszó" value={credentials?.posPassword || ''} />

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-700 font-semibold mb-1">Fontos!</p>
              <p className="text-xs text-amber-600">
                Ez a jelszó csak egyszer jelenik meg itt. Jegyezd fel és add át az ügyfelnek! A jelszó később nem kérdezhető le.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setCredentialsOpen(false)} className="w-full">
              Megértettem, bezárás
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
