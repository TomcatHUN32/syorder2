'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Building2,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  ArrowRight,
  Users,
  ShoppingBag,
  Banknote,
  Activity,
  BarChart3,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';

interface PlatformStats {
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  activePartners: number;
  inactivePartners: number;
  totalOrders: number;
  ordersToday: number;
  revenueTotal: number;
  revenueToday: number;
  totalCustomers: number;
  avgOrderValue: number;
}

interface RecentRequest {
  id: string;
  business_name: string;
  contact_name: string;
  email: string;
  city: string | null;
  status: string;
  created_at: string;
}

interface TopTenant {
  id: string;
  name: string;
  slug: string;
  primary_color: string;
  order_count: number;
  revenue: number;
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<PlatformStats>({
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
    activePartners: 0,
    inactivePartners: 0,
    totalOrders: 0,
    ordersToday: 0,
    revenueTotal: 0,
    revenueToday: 0,
    totalCustomers: 0,
    avgOrderValue: 0,
  });
  const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([]);
  const [topTenants, setTopTenants] = useState<TopTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayISO = todayStart.toISOString();

    const [requestsRes, tenantsRes, ordersRes, ordersTodayRes, customersRes, recentRes] =
      await Promise.all([
        supabase.from('restaurant_requests').select('status'),
        supabase.from('tenants').select('id, name, slug, primary_color, is_active'),
        supabase.from('orders').select('total, tenant_id'),
        supabase.from('orders').select('total').gte('created_at', todayISO),
        supabase.from('customers').select('id', { count: 'exact', head: true }),
        supabase
          .from('restaurant_requests')
          .select('id, business_name, contact_name, email, city, status, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

    const requests = requestsRes.data || [];
    const tenants = tenantsRes.data || [];
    const orders = ordersRes.data || [];
    const ordersToday = ordersTodayRes.data || [];

    const revenueTotal = orders.reduce((s, o) => s + Number(o.total), 0);
    const revenueToday = ordersToday.reduce((s, o) => s + Number(o.total), 0);
    const avgOrderValue = orders.length > 0 ? revenueTotal / orders.length : 0;

    // Aggregate orders per tenant
    const tenantMap: Record<string, { order_count: number; revenue: number }> = {};
    orders.forEach((o) => {
      if (!tenantMap[o.tenant_id]) tenantMap[o.tenant_id] = { order_count: 0, revenue: 0 };
      tenantMap[o.tenant_id].order_count += 1;
      tenantMap[o.tenant_id].revenue += Number(o.total);
    });

    const top = tenants
      .map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        primary_color: t.primary_color,
        order_count: tenantMap[t.id]?.order_count ?? 0,
        revenue: tenantMap[t.id]?.revenue ?? 0,
      }))
      .filter((t) => t.order_count > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    setStats({
      pendingRequests: requests.filter((r) => r.status === 'pending').length,
      approvedRequests: requests.filter((r) => r.status === 'approved').length,
      rejectedRequests: requests.filter((r) => r.status === 'rejected').length,
      activePartners: tenants.filter((t) => t.is_active).length,
      inactivePartners: tenants.filter((t) => !t.is_active).length,
      totalOrders: orders.length,
      ordersToday: ordersToday.length,
      revenueTotal,
      revenueToday,
      totalCustomers: customersRes.count ?? 0,
      avgOrderValue,
    });

    setTopTenants(top);
    setRecentRequests(recentRes.data || []);
    setLastRefreshed(new Date());
    setLoading(false);
  }

  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    pending: { label: 'Függőben', variant: 'secondary' },
    approved: { label: 'Jóváhagyva', variant: 'default' },
    rejected: { label: 'Elutasítva', variant: 'destructive' },
  };

  function fmt(n: number) {
    return n.toLocaleString('hu-HU');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-700" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Áttekintés</h1>
          <p className="text-slate-500 mt-1">
            SYORDER platform állapota &mdash; frissítve: {lastRefreshed.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Frissítés
        </Button>
      </div>

      {/* Primary KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Aktív Partnerek', value: stats.activePartners, sub: `${stats.inactivePartners} inaktív`, icon: Building2, color: 'text-emerald-600', bg: 'bg-emerald-50', href: '/admin/partners' },
          { title: 'Összes Rendelés', value: stats.totalOrders, sub: `${stats.ordersToday} ma`, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50', href: null },
          { title: 'Összes Bevétel', value: `${fmt(Math.round(stats.revenueTotal))} Ft`, sub: `Ma: ${fmt(Math.round(stats.revenueToday))} Ft`, icon: Banknote, color: 'text-amber-600', bg: 'bg-amber-50', href: null },
          { title: 'Vendégek', value: stats.totalCustomers, sub: `Átl. rend.: ${fmt(Math.round(stats.avgOrderValue))} Ft`, icon: Users, color: 'text-rose-600', bg: 'bg-rose-50', href: null },
        ].map((card) => {
          const Icon = card.icon;
          const content = (
            <Card className={`${card.href ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-slate-500">{card.title}</p>
                  <div className={`p-2 rounded-lg ${card.bg}`}>
                    <Icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                <p className="text-xs text-slate-400 mt-1">{card.sub}</p>
              </CardContent>
            </Card>
          );
          return card.href ? (
            <Link key={card.title} href={card.href}>{content}</Link>
          ) : (
            <div key={card.title}>{content}</div>
          );
        })}
      </div>

      {/* Requests row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { title: 'Függő Igénylések', value: stats.pendingRequests, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { title: 'Jóváhagyott', value: stats.approvedRequests, icon: CheckCircle2, color: 'text-blue-600', bg: 'bg-blue-50' },
          { title: 'Elutasított', value: stats.rejectedRequests, icon: XCircle, color: 'text-slate-500', bg: 'bg-slate-50' },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.title} href="/admin/requests">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-slate-500">{card.title}</p>
                    <div className={`p-1.5 rounded-lg ${card.bg}`}>
                      <Icon className={`h-3.5 w-3.5 ${card.color}`} />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-slate-900">{card.value}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Bottom two-column */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Top tenants by revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-slate-500" />
              Top Éttermek (Bevétel)
            </CardTitle>
            <Link href="/admin/partners">
              <Button variant="ghost" size="sm" className="gap-1 text-slate-500 hover:text-slate-900">
                Összes <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            {topTenants.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <Activity className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Még nincs rendelési adat</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topTenants.map((t, i) => {
                  const maxRevenue = topTenants[0].revenue || 1;
                  const pct = Math.round((t.revenue / maxRevenue) * 100);
                  return (
                    <div key={t.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs text-slate-400 w-4 shrink-0">#{i + 1}</span>
                          <div
                            className="h-5 w-5 rounded shrink-0 flex items-center justify-center text-white text-xs font-bold"
                            style={{ backgroundColor: t.primary_color }}
                          >
                            {t.name.charAt(0)}
                          </div>
                          <span className="font-medium text-slate-800 truncate">{t.name}</span>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <span className="font-semibold text-slate-900">{fmt(Math.round(t.revenue))} Ft</span>
                          <span className="text-xs text-slate-400 ml-1.5">{t.order_count} rend.</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: t.primary_color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent requests */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-500" />
              Legutóbbi Igénylések
            </CardTitle>
            <Link href="/admin/requests">
              <Button variant="ghost" size="sm" className="gap-1 text-slate-500 hover:text-slate-900">
                Összes <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            {recentRequests.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Még nincs beérkező igénylés</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentRequests.map((req) => {
                  const status = statusConfig[req.status] || { label: req.status, variant: 'outline' as const };
                  return (
                    <div key={req.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900 truncate text-sm">{req.business_name}</p>
                        <p className="text-xs text-slate-500 truncate">
                          {req.contact_name} · {req.email}
                          {req.city && ` · ${req.city}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={status.variant} className="text-xs">{status.label}</Badge>
                        <span className="text-xs text-slate-400">
                          {new Date(req.created_at).toLocaleDateString('hu-HU')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity summary footer */}
      <Card className="border-slate-200 bg-slate-50/60">
        <CardContent className="p-5">
          <div className="grid sm:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Mai rendelések</p>
              <p className="text-2xl font-bold text-slate-900">{stats.ordersToday}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Mai bevétel</p>
              <p className="text-2xl font-bold text-slate-900">{fmt(Math.round(stats.revenueToday))} Ft</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Átlagos rendelés</p>
              <p className="text-2xl font-bold text-slate-900">{fmt(Math.round(stats.avgOrderValue))} Ft</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
