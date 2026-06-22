'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Wallet,
  Play,
  CheckCircle,
  Plus,
  TrendingUp,
  Inbox,
  AlertTriangle,
  History,
  Printer,
  Calendar,
  XCircle,
  Clock,
  ArrowDownRight,
  ArrowUpRight,
  User,
  Trash2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface RegisterSession {
  id: string;
  tenant_id: string;
  opened_by: string;
  closed_by: string | null;
  opened_at: string;
  closed_at: string | null;
  starting_cash: number;
  expected_cash: number | null;
  actual_cash: number | null;
  total_sales: number;
  total_canceled: number;
  total_payouts: number;
  payout_records: PayoutRecord[];
  notes: string | null;
  status: 'open' | 'closed';
  created_at: string;
}

interface PayoutRecord {
  id: string;
  amount: number;
  reason: string;
  created_at: string;
  created_by_name: string;
}

export default function RegisterPage() {
  const [session, setSession] = useState<RegisterSession | null>(null);
  const [history, setHistory] = useState<RegisterSession[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('Munkatárs');

  // Input states for OPEN
  const [startingCashInput, setStartingCashInput] = useState<string>('10000');

  // Input states for CLOSE
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [actualCashInput, setActualCashInput] = useState<string>('');
  const [closeNotes, setCloseNotes] = useState<string>('');

  // Input states for ADD PAYOUT
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState<string>('');
  const [payoutReason, setPayoutReason] = useState<string>('');

  // Print state
  const [printingSession, setPrintingSession] = useState<RegisterSession | null>(null);
  const [printOpen, setPrintOpen] = useState(false);

  // Active session computed live stats
  const [liveSales, setLiveSales] = useState<number>(0);
  const [liveCanceled, setLiveCanceled] = useState<number>(0);
  const [salesCount, setSalesCount] = useState<number>(0);

  const printRef = useRef<HTMLDivElement>(null);

  // Get current tenant & auth user
  useEffect(() => {
    async function loadAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: userData } = await supabase
          .from('users')
          .select('tenant_id, full_name')
          .eq('id', user.id)
          .maybeSingle();

        if (userData) {
          setTenantId(userData.tenant_id);
          setUserName(userData.full_name || 'Staff');
        }
      }
    }
    loadAuth();
  }, []);

  const loadData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);

    try {
      // 1. Fetch active session
      const { data: activeData, error: activeErr } = await supabase
        .from('register_sessions')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'open')
        .maybeSingle();

      if (activeErr) {
        console.error('Error loading active session:', activeErr);
      } else {
        setSession(activeData as RegisterSession | null);
      }

      // 2. Fetch past session history
      const { data: historyData, error: historyErr } = await supabase
        .from('register_sessions')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'closed')
        .order('closed_at', { ascending: false })
        .limit(20);

      if (historyErr) {
        console.error('Error loading past history:', historyErr);
      } else {
        setHistory((historyData || []) as RegisterSession[]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (tenantId) {
      loadData();
    }
  }, [tenantId, loadData]);

  // Load real-time stats for the active session (Sales, cancellations since opened_at)
  useEffect(() => {
    if (!session || !tenantId) {
      setLiveSales(0);
      setLiveCanceled(0);
      return;
    }

    const sessionOpenedAt = session.opened_at;

    async function loadLiveStats() {
      if (!tenantId) return;
      const { data: orders, error } = await supabase
        .from('orders')
        .select('total, status')
        .eq('tenant_id', tenantId)
        .gte('created_at', sessionOpenedAt);

      if (error) {
        console.error('Error counting live stats:', error);
        return;
      }

      let salesTotal = 0;
      let canceledTotal = 0;
      let count = 0;

      orders?.forEach(order => {
        const totalNum = Number(order.total || 0);
        if (order.status === 'cancelled' || order.status === 'storno') {
          canceledTotal += totalNum;
        } else {
          salesTotal += totalNum;
          count++;
        }
      });

      setLiveSales(salesTotal);
      setLiveCanceled(canceledTotal);
      setSalesCount(count);
    }

    loadLiveStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(loadLiveStats, 30000);
    return () => clearInterval(interval);
  }, [session, tenantId]);

  // 1. OPEN DAY FUNCTION
  async function handleOpenDay() {
    if (!tenantId || !userId) {
      toast.error('Hiányzó bejelentkezési adatok.');
      return;
    }

    const startingCash = parseFloat(startingCashInput);
    if (isNaN(startingCash) || startingCash < 0) {
      toast.error('Kérjük, érvényes kezdő kassza összeget adj meg.');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('register_sessions')
      .insert({
        tenant_id: tenantId,
        opened_by: userId,
        starting_cash: startingCash,
        status: 'open',
        opened_at: new Date().toISOString(),
        payout_records: []
      })
      .select()
      .single();

    if (error) {
      toast.error('Nem sikerült elindítani a napi nyitást: ' + error.message);
    } else {
      toast.success('Napi kassza sikeresen megnyitva!');
      setSession(data as RegisterSession);
      loadData();
    }
    setLoading(false);
  }

  // 2. ADD PAYOUT (KIFIZETÉS)
  async function handleAddPayout() {
    if (!session) return;

    const amount = parseFloat(payoutAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Kérjük adj meg egy pozitív kifizetés összeget.');
      return;
    }
    if (!payoutReason.trim()) {
      toast.error('Kérjük, részletezd a kifizetés okát.');
      return;
    }

    const newPayout: PayoutRecord = {
      id: Math.random().toString(36).substr(2, 9),
      amount,
      reason: payoutReason.trim(),
      created_at: new Date().toISOString(),
      created_by_name: userName,
    };

    const updatedPayouts = [...(session.payout_records || []), newPayout];
    const totalPayoutsSum = updatedPayouts.reduce((sum, p) => sum + p.amount, 0);

    setLoading(true);
    const { error } = await supabase
      .from('register_sessions')
      .update({
        payout_records: updatedPayouts,
        total_payouts: totalPayoutsSum,
        updated_at: new Date().toISOString()
      })
      .eq('id', session.id);

    if (error) {
      toast.error('Sikertelen kifizetés rögzítés: ' + error.message);
    } else {
      toast.success('Kifizetés sikeresen rögzítve!');
      setSession({
        ...session,
        payout_records: updatedPayouts,
        total_payouts: totalPayoutsSum,
      });
      setPayoutAmount('');
      setPayoutReason('');
      setPayoutDialogOpen(false);
    }
    setLoading(false);
  }

  // Delete last payout record (if wrong)
  async function handleDeletePayout(payoutId: string) {
    if (!session) return;
    const filteredPayouts = session.payout_records.filter(p => p.id !== payoutId);
    const totalPayoutsSum = filteredPayouts.reduce((sum, p) => sum + p.amount, 0);

    setLoading(true);
    const { error } = await supabase
      .from('register_sessions')
      .update({
        payout_records: filteredPayouts,
        total_payouts: totalPayoutsSum,
        updated_at: new Date().toISOString()
      })
      .eq('id', session.id);

    if (error) {
      toast.error('Nem sikerült törölni a kifizetést.');
    } else {
      toast.success('Kifizetés visszavonva');
      setSession({
        ...session,
        payout_records: filteredPayouts,
        total_payouts: totalPayoutsSum,
      });
    }
    setLoading(false);
  }

  // 3. CLOSE DAY (NAPI ZÁRÁS)
  async function handleCloseDay() {
    if (!session || !userId) return;

    const actualCash = parseFloat(actualCashInput);
    if (isNaN(actualCash) || actualCash < 0) {
      toast.error('Kérjük, érvényes tényleges kassza összeget adj meg.');
      return;
    }

    // Expected cash: starting_cash + liveSales - total_payouts
    const expected = session.starting_cash + liveSales - (session.total_payouts || 0);

    setLoading(true);
    const { data, error } = await supabase
      .from('register_sessions')
      .update({
        status: 'closed',
        closed_by: userId,
        closed_at: new Date().toISOString(),
        expected_cash: expected,
        actual_cash: actualCash,
        total_sales: liveSales,
        total_canceled: liveCanceled,
        notes: closeNotes.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', session.id)
      .select()
      .single();

    if (error) {
      toast.error('Nem sikerült elmenteni a napi zárást: ' + error.message);
    } else {
      toast.success('Napi kassza sikeresen lezárva!');
      const closedSession = data as RegisterSession;
      setCloseDialogOpen(false);
      setSession(null);
      setActualCashInput('');
      setCloseNotes('');
      // Open Print receipt dialog
      setPrintingSession(closedSession);
      setPrintOpen(true);
      loadData();
    }
    setLoading(false);
  }

  // Trigger print logic
  function handlePrint() {
    const printContent = printRef.current?.innerHTML;
    const originalContent = document.body.innerHTML;

    if (printContent) {
      const windowPrint = window.open('', '', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');
      if (windowPrint) {
        windowPrint.document.write(`
          <html>
            <head>
              <title>Napi Záró Bizonylat - syorder</title>
              <style>
                body {
                  font-family: 'Courier New', Courier, monospace;
                  padding: 20px;
                  color: #000;
                  font-size: 14px;
                  line-height: 1.5;
                }
                .receipt-container {
                  max-width: 320px;
                  margin: 0 auto;
                }
                h1, h2 {
                  text-align: center;
                  text-transform: uppercase;
                  margin: 10px 0;
                }
                .dashed-row {
                  border-top: 1px dashed #000;
                  margin: 8px 0;
                }
                .flex-row {
                  display: flex;
                  justify-content: space-between;
                }
                .font-bold {
                  font-weight: bold;
                }
                .text-right {
                  text-align: right;
                }
                .title-desc {
                  text-align: center;
                  font-size: 11px;
                }
                .payout-list {
                  font-size: 12px;
                  padding-left: 10px;
                }
                @media print {
                  body { padding: 0; }
                }
              </style>
            </head>
            <body>
              <div class="receipt-container">
                ${printContent}
              </div>
              <script>
                window.onload = function() {
                  window.print();
                  window.close();
                }
              </script>
            </body>
          </html>
        `);
        windowPrint.document.close();
      }
    }
  }

  function formatPrice(num: number) {
    return Math.round(num).toLocaleString('hu-HU') + ' Ft';
  }

  if (loading && !session && history.length === 0) {
    return (
      <div className="flex items-center justify-center p-12 min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-700" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Napi Nyitás & Zárás</h1>
        <p className="text-slate-500 mt-1">Kasszaegyenleg, napi elszámolás és kifizetések kezelése</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left/Middle Column: Active state panel */}
        <div className="lg:col-span-2 space-y-6">
          {!session ? (
            /* CLOSED REGISTRY STATE */
            <Card className="border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-slate-400" />
              <CardHeader>
                <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-2">
                  <Wallet className="h-6 w-6 text-slate-500" />
                </div>
                <CardTitle className="text-xl">Zárt kassza</CardTitle>
                <CardDescription>A mai nap még nincs elindítva. Kezdd a napot a nyitó kassza rögzítésével!</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5 max-w-sm">
                  <Label htmlFor="startingCash" className="text-slate-700 font-semibold">Nyitó- / Kezdő készpénz összeg (Ft)</Label>
                  <div className="relative">
                    <Input
                      id="startingCash"
                      type="number"
                      placeholder="Pl: 10 000"
                      value={startingCashInput}
                      onChange={(e) => setStartingCashInput(e.target.value)}
                      className="font-bold text-lg pr-12 focus:ring-slate-700"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400 font-medium">
                      Ft
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Button onClick={handleOpenDay} className="gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-md">
                    <Play className="h-4 w-4" />
                    Kassza Nyitása (Nap indítása)
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* OPEN REGISTRY STATE */
            <Card className="border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-emerald-500 animate-pulse" />
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="bg-emerald-100 text-emerald-800 font-semibold border-emerald-200">Kassza Nyitva</Badge>
                    <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                      <Clock className="h-3 w-3" />
                      Nyitva: {new Date(session.opened_at).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <CardTitle className="text-xl mt-2">Aktív Napi Kasszafolyamat</CardTitle>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Kezdő kassza</p>
                  <p className="text-lg font-bold text-slate-900">{formatPrice(session.starting_cash)}</p>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Visual grid indicators */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">Aktív napi forgalom</p>
                    <p className="text-lg font-extrabold text-emerald-900 mt-1">{formatPrice(liveSales)}</p>
                    <span className="text-[10px] text-emerald-500 font-medium italic">{salesCount} db eladás</span>
                  </div>

                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                    <p className="text-xs text-amber-600 font-semibold uppercase tracking-wider">Kiadás / Kifizetések</p>
                    <p className="text-lg font-extrabold text-amber-900 mt-1">-{formatPrice(session.total_payouts || 0)}</p>
                    <span className="text-[10px] text-amber-500 font-medium italic">{session.payout_records?.length || 0} db tranzakció</span>
                  </div>

                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl">
                    <p className="text-xs text-rose-600 font-semibold uppercase tracking-wider">Sztornózott / Törölt</p>
                    <p className="text-lg font-extrabold text-rose-900 mt-1">{formatPrice(liveCanceled)}</p>
                    <span className="text-[10px] text-rose-500 font-medium italic">Visszavont tételek</span>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Elvárt készpénz</p>
                    <p className="text-lg font-extrabold text-slate-900 mt-1">
                      {formatPrice(session.starting_cash + liveSales - (session.total_payouts || 0))}
                    </p>
                    <span className="text-[10px] text-slate-400 font-medium italic">Kasszában kellene lennie</span>
                  </div>
                </div>

                {/* Payouts Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Napi kifizetések, beszerzések (Kiadás)</h3>
                    <Button variant="outline" size="sm" onClick={() => setPayoutDialogOpen(true)} className="gap-1 text-slate-600 border-slate-200">
                      <Plus className="h-3.5 w-3.5" />
                      Kifizetés rögzítése
                    </Button>
                  </div>

                  {(!session.payout_records || session.payout_records.length === 0) ? (
                    <div className="text-center py-6 bg-slate-50 border border-slate-100 rounded-xl text-slate-400 text-xs">
                      Még nem rögzítettek kifizetést a mai napon.
                    </div>
                  ) : (
                    <div className="border border-slate-100 rounded-xl divide-y divide-slate-100 overflow-hidden">
                      {session.payout_records.map((payout) => (
                        <div key={payout.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50/50 bg-white">
                          <div>
                            <p className="font-semibold text-slate-800">{payout.reason}</p>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(payout.created_at).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })} &middot; {payout.created_by_name}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-amber-700">-{formatPrice(payout.amount)}</span>
                            <Button variant="ghost" size="icon" onClick={() => handleDeletePayout(payout.id)} className="h-6 w-6 text-slate-400 hover:text-red-500 rounded-lg">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Daily actions footer */}
                <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-slate-400 tracking-tight">
                    * A rögzített kifizetések levonódnak az elvárt kasszából. A kártyás/online vásárlásokat a végelszámoláskor a záró modul külön taglalja.
                  </p>
                  <Button
                    onClick={() => {
                      setActualCashInput((session.starting_cash + liveSales - (session.total_payouts || 0)).toString());
                      setCloseDialogOpen(true);
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-medium pr-4 pl-3 py-2 shadow"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Napi Zárás Végrehajtása
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Past closures list */}
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-md font-bold flex items-center gap-2">
                <History className="h-4 w-4 text-slate-500" />
                Korábbi Zárások
              </CardTitle>
              <CardDescription>A lezárt kasszák és forgalmi bizonylatok listája</CardDescription>
            </CardHeader>
            <CardContent className="px-0 pt-0">
              {history.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs px-6">
                  Nincs még korábbi elmentett zárás az adatbázisban.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 overflow-y-auto max-h-[500px]">
                  {history.map((past) => (
                    <div key={past.id} className="p-4 hover:bg-slate-50/50 transition-colors flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-800 flex items-center gap-1 font-mono">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {new Date(past.closed_at || '').toLocaleDateString('hu-HU')}
                        </span>
                        <Badge variant="secondary" className="text-[10px] text-slate-500">Lezárva</Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-slate-500 pt-1">
                        <div>Nyitó kassza:</div>
                        <div className="text-right font-medium text-slate-700">{formatPrice(past.starting_cash)}</div>
                        
                        <div>Napi bevétel:</div>
                        <div className="text-right font-semibold text-emerald-600">+{formatPrice(past.total_sales)}</div>
                        
                        <div>Kifizetések:</div>
                        <div className="text-right font-medium text-amber-600">-{formatPrice(past.total_payouts)}</div>
                        
                        <div className="border-t border-dashed border-slate-200 mt-1 pt-1 font-semibold text-slate-700">Tényleges kassza:</div>
                        <div className="border-t border-dashed border-slate-200 mt-1 pt-1 text-right font-extrabold text-slate-900">
                          {formatPrice(past.actual_cash || 0)}
                        </div>
                      </div>

                      {past.notes && (
                        <p className="text-[10px] bg-slate-50 p-1.5 rounded text-slate-500 italic mt-0.5 truncate">
                          &ldquo;{past.notes}&rdquo;
                        </p>
                      )}

                      <div className="flex gap-2 pt-2 border-t border-dashed border-slate-100">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setPrintingSession(past);
                            setPrintOpen(true);
                          }}
                          className="h-7 px-2 text-slate-600 hover:text-slate-900 text-xs w-full justify-center flex gap-1 bg-slate-50 hover:bg-slate-100 rounded-lg"
                        >
                          <Printer className="h-3 w-3" />
                          Záró bizonylat / Nyomtatás
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 1. ADD PAYOUT MODAL */}
      <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Kifizetés / Kiadás Rögzítése</DialogTitle>
            <DialogDescription>Add meg a készpénzes kifizetés összegét és a bizonylat okát.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="payoutAmount">Összeg (Ft)</Label>
              <div className="relative">
                <Input
                  id="payoutAmount"
                  type="number"
                  placeholder="Pl. 2500"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  className="font-bold pr-12 focus:ring-slate-700"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 font-medium">
                  Ft
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="payoutReason">Megnevezés / Ok</Label>
              <Input
                id="payoutReason"
                type="text"
                placeholder="Pl: Kakaópor beszerzés, tejvásárlás..."
                value={payoutReason}
                onChange={(e) => setPayoutReason(e.target.value)}
                className="focus:ring-slate-700"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPayoutDialogOpen(false)}>Mégse</Button>
            <Button onClick={handleAddPayout} className="bg-slate-900 hover:bg-slate-800 text-white font-medium">
              Kifizetés Mentése
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. CLOSE DAY MODAL */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Napi Kassza Zárása</DialogTitle>
            <DialogDescription>Ellenőrizd a napi összesítést, és rögzítsd a ténylegesen kasszában talált készpénzt.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Summary details */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Kezdő kasszaegyenleg:</span>
                <span className="font-semibold text-slate-700">{formatPrice(session?.starting_cash || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Mai rögzített forgalom:</span>
                <span className="font-semibold text-emerald-600">+{formatPrice(liveSales)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sztornózott / Törölt forgalom:</span>
                <span className="font-semibold text-rose-600">{formatPrice(liveCanceled)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Mai rögzített kifizetések:</span>
                <span className="font-semibold text-amber-600">-{formatPrice(session?.total_payouts || 0)}</span>
              </div>
              <div className="border-t border-dashed border-slate-200 pt-2 flex justify-between font-bold text-sm">
                <span className="text-slate-800">Elvárt készpénz összeg:</span>
                <span className="text-slate-950">
                  {formatPrice((session?.starting_cash || 0) + liveSales - (session?.total_payouts || 0))}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="actualCash" className="font-semibold text-slate-800">Ténylegesen számolt készpénz (Ft)</Label>
              <div className="relative">
                <Input
                  id="actualCash"
                  type="number"
                  placeholder="Számold meg a kassza tartalmát"
                  value={actualCashInput}
                  onChange={(e) => setActualCashInput(e.target.value)}
                  className="font-bold text-lg pr-12 focus:ring-slate-700 text-slate-950 bg-white"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 font-medium">
                  Ft
                </div>
              </div>
              <p className="text-[10px] text-slate-400">
                Az elvárt és a tényleges készpénz eltérése különbözetként kerül lementésre.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="closeNotes">Zárási megjegyzések / Észrevételek</Label>
              <Textarea
                id="closeNotes"
                placeholder="Pl: 200 Ft különbözet kerekítés miatt..."
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                rows={2}
                className="focus:ring-slate-700 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialogOpen(false)}>Mégse (Vissza)</Button>
            <Button onClick={handleCloseDay} className="bg-rose-600 hover:bg-rose-700 text-white font-medium">
              Zárás Véglegesítése
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. PRINT RECEIPT / BILL MODAL */}
      <Dialog open={printOpen} onOpenChange={setPrintOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Kassza Forgalmi Bizonylat</DialogTitle>
            <DialogDescription>A napi forgalom és kassza elszámolás részletes, nyomtatható nézete.</DialogDescription>
          </DialogHeader>

          {/* Printable Element with Classic Receipt styling */}
          <div className="border border-slate-200 rounded-xl p-4 max-h-[400px] overflow-y-auto bg-slate-50 font-mono text-xs text-slate-800">
            <div ref={printRef} className="space-y-4">
              <div className="text-center space-y-1">
                <h2 className="text-sm font-bold tracking-widest text-slate-950">SYORDER NYUGTA</h2>
                <p className="text-[10px] text-slate-400 font-sans uppercase">Napi Záró Bizonylat</p>
                <div className="border-t border-dashed border-slate-300 my-2" />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Dátum:</span>
                  <span className="font-semibold text-slate-950">
                    {printingSession?.closed_at ? new Date(printingSession.closed_at).toLocaleDateString('hu-HU') : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Nyitás:</span>
                  <span>
                    {printingSession?.opened_at ? new Date(printingSession.opened_at).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Zárás:</span>
                  <span>
                    {printingSession?.closed_at ? new Date(printingSession.closed_at).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Státusz:</span>
                  <span className="font-bold text-slate-950 uppercase">{printingSession?.status || 'closed'}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-300 my-2" />

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Nyitó kassza összege:</span>
                  <span>{formatPrice(printingSession?.starting_cash || 0)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-950">
                  <span>+ Mai nettó forgalom:</span>
                  <span>{formatPrice(printingSession?.total_sales || 0)}</span>
                </div>
                <div className="flex justify-between font-bold text-rose-700">
                  <span>&nbsp;&nbsp;Ebből sztornó / törölt:</span>
                  <span>{formatPrice(printingSession?.total_canceled || 0)}</span>
                </div>
                <div className="flex justify-between font-bold text-amber-700">
                  <span>- Kifizetések / Kiadások:</span>
                  <span>-{formatPrice(printingSession?.total_payouts || 0)}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-300 my-2" />

              <div className="space-y-1">
                <div className="flex justify-between font-bold text-slate-950">
                  <span>ELVÁRT KASSZA ÖSSZEG:</span>
                  <span>{formatPrice(printingSession ? (printingSession.starting_cash + printingSession.total_sales - printingSession.total_payouts) : 0)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-950">
                  <span>MÉRT TÉNYLEGES KASSZA:</span>
                  <span>{formatPrice(printingSession?.actual_cash || 0)}</span>
                </div>

                {printingSession && (
                  <div className="flex justify-between font-bold border-t border-slate-300 pt-1 mt-1 text-slate-950">
                    <span>ELTÉRÉS (KÜLÖNBÖZET):</span>
                    <span className={((printingSession.actual_cash || 0) - (printingSession.starting_cash + printingSession.total_sales - printingSession.total_payouts)) < 0 ? 'text-red-600' : 'text-emerald-600'}>
                      {formatPrice((printingSession.actual_cash || 0) - (printingSession.starting_cash + printingSession.total_sales - printingSession.total_payouts))}
                    </span>
                  </div>
                )}
              </div>

              {/* Payout records detail strictly printed */}
              {printingSession?.payout_records && printingSession.payout_records.length > 0 && (
                <>
                  <div className="border-t border-dashed border-slate-300 my-2" />
                  <p className="text-[10px] font-bold uppercase mb-1">Rögzített kifizetések részletei:</p>
                  <div className="space-y-1">
                    {printingSession.payout_records.map((p, idx) => (
                      <div key={p.id} className="text-[10px] flex justify-between pl-2">
                        <span>{idx+1}. {p.reason}</span>
                        <span>-{formatPrice(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {printingSession?.notes && (
                <>
                  <div className="border-t border-dashed border-slate-300 my-2" />
                  <p className="text-[10px] font-bold uppercase">Zárási Megjegyzés:</p>
                  <p className="text-[10px] italic leading-relaxed text-slate-600 pl-2">
                    &ldquo;{printingSession.notes}&rdquo;
                  </p>
                </>
              )}

              <div className="border-t border-dashed border-slate-300 my-4" />

              <div className="text-center pt-2 space-y-4">
                <div className="flex justify-between text-[10px] px-4">
                  <div className="text-center w-24 border-t border-slate-400 pt-1">
                    Kasszás aláírása
                  </div>
                  <div className="text-center w-24 border-t border-slate-400 pt-1">
                    Átvevő aláírása
                  </div>
                </div>
                <p className="text-[8px] text-slate-400 font-sans">
                  SYORDER PLATFORM &middot; ELSZÁMOLÁSI BIZONYLAT &middot; KÖSZÖNJÜK!
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-row justify-between w-full sm:justify-between">
            <Button variant="outline" onClick={() => setPrintOpen(false)}>Bezárás</Button>
            <Button onClick={handlePrint} className="bg-slate-900 hover:bg-slate-800 text-white font-medium flex gap-1">
              <Printer className="h-4 w-4" />
              Bizonylat Nyomtatása (PDF / Nyomtató)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
