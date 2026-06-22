'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  ShoppingBag,
  TrendingUp,
  Users,
  DollarSign,
  Clock,
  Package,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle,
  CalendarClock,
} from 'lucide-react';
import { supabase, Order, MenuItem, Ingredient, Subscription } from '@/lib/supabase/client';

interface DashboardStats {
  todayOrders: number;
  todayRevenue: number;
  activeCustomers: number;
  pendingOrders: number;
}

interface RecentOrder extends Order {
  order_items: { quantity: number; menu_item: { name: string } | null }[];
}

interface LowStockIngredient extends Ingredient {
  stock_percentage: number;
}

const statusColors: Record<string, string> = {
  pending: 'bg-warning text-warning-foreground',
  confirmed: 'bg-primary text-primary-foreground',
  preparing: 'bg-secondary text-secondary-foreground',
  ready: 'bg-success text-success-foreground',
  delivered: 'bg-muted text-muted-foreground',
  cancelled: 'bg-destructive text-destructive-foreground',
};

const statusLabels: Record<string, string> = {
  pending: 'Függőben',
  confirmed: 'Visszaigazolva',
  preparing: 'Készítés alatt',
  ready: 'Kész',
  delivered: 'Kiszállítva',
  cancelled: 'Lemondva',
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="h-3 w-3" />,
  confirmed: <CheckCircle className="h-3 w-3" />,
  preparing: <Package className="h-3 w-3" />,
  ready: <CheckCircle className="h-3 w-3" />,
  delivered: <CheckCircle className="h-3 w-3" />,
  cancelled: <AlertTriangle className="h-3 w-3" />,
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    todayOrders: 0,
    todayRevenue: 0,
    activeCustomers: 0,
    pendingOrders: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockIngredient[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();

    const channel = supabase
      .channel('orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        loadDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadDashboardData() {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Load subscription alongside other data
      const subRes = supabase.from('subscriptions').select('*').maybeSingle();

      const { data: ordersData } = await supabase
        .from('orders')
        .select('*, order_items(quantity, menu_item:menu_items(name))')
        .gte('created_at', today)
        .order('created_at', { ascending: false });

      const { data: pendingData } = await supabase
        .from('orders')
        .select('*, order_items(quantity, menu_item:menu_items(name))')
        .in('status', ['pending', 'confirmed', 'preparing'])
        .order('created_at', { ascending: false })
        .limit(10);

      const { count: customerCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      const { data: ingredientsData } = await supabase
        .from('ingredients')
        .select('*');

      if (ordersData) {
        const todayTotal = ordersData.reduce((sum, o) => sum + Number(o.total), 0);
        const pendingCount = ordersData.filter((o) =>
          ['pending', 'confirmed', 'preparing'].includes(o.status)
        ).length;

        setStats({
          todayOrders: ordersData.length,
          todayRevenue: todayTotal,
          activeCustomers: customerCount || 0,
          pendingOrders: pendingCount,
        });

        setRecentOrders((pendingData || ordersData.slice(0, 5)) as RecentOrder[]);
      }

      if (ingredientsData) {
        const lowStock = ingredientsData
          .map((i) => ({
            ...i,
            stock_percentage:
              i.min_stock_threshold > 0
                ? (i.current_stock / i.min_stock_threshold) * 100
                : 100,
          }))
          .filter((i) => i.stock_percentage < 30)
          .sort((a, b) => a.stock_percentage - b.stock_percentage);

        setLowStockItems(lowStock as LowStockIngredient[]);
      }

      const { data: subData } = await subRes;
      setSubscription(subData ?? null);
    } catch (error) {
      console.error('Hiba az irányítópult betöltésekor:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Irányítópult</h1>
        <p className="text-muted-foreground">Üdvözlünk vissza! Íme, mi történt ma.</p>
      </div>

      {/* Subscription widget */}
      {subscription && <SubscriptionWidget subscription={subscription} />}

      {/* Statisztika kártyák */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Mai Rendelések</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayOrders}</div>
            <div className="flex items-center text-xs text-success mt-1">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              <span>Élő követés</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Mai Bevétel</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayRevenue.toLocaleString('hu-HU')} Ft</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              <span>Bruttó forgalom</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Regisztrált Ügyfelek</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCustomers}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              Összes regisztrált
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Folyamatban Lévő</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOrders}</div>
            <div className="flex items-center text-xs text-warning mt-1">
              <AlertTriangle className="h-3 w-3 mr-1" />
              <span>Figyelmet igényel</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fő tartalom */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Legutóbbi rendelések */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Legutóbbi Rendelések</CardTitle>
                <CardDescription>Figyelmet igénylő legújabb rendelések</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href="/dashboard/orders">Összes megtekintése</a>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingBag className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Ma még nem érkezett rendelés</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="flex items-start gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">#{order.order_number}</span>
                          <Badge variant="outline" className="text-xs">
                            {order.order_type === 'dine-in'
                              ? `${order.table_number}. asztal`
                              : order.order_type === 'takeaway'
                              ? 'Elvitel'
                              : 'Házhozszállítás'}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {order.order_items.map((item, i) => (
                            <span key={i}>
                              {item.quantity}x {item.menu_item?.name || 'Ismeretlen'}
                              {i < order.order_items.length - 1 && ', '}
                            </span>
                          ))}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(order.created_at).toLocaleTimeString('hu-HU', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={cn(statusColors[order.status], 'gap-1')}>
                          {statusIcons[order.status]}
                          {statusLabels[order.status] || order.status}
                        </Badge>
                        <div className="font-medium mt-1">
                          {Number(order.total).toLocaleString('hu-HU')} Ft
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Alacsony készlet figyelmeztetés */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <div>
                <CardTitle className="text-lg">Készlet Figyelmeztetés</CardTitle>
                <CardDescription>30% alatti tételek</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {lowStockItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Minden készletszint megfelelő</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-3">
                  {lowStockItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.current_stock} / {item.min_stock_threshold} {item.unit}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-destructive">
                          {item.stock_percentage.toFixed(0)}%
                        </div>
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-destructive transition-all"
                            style={{ width: `${Math.min(item.stock_percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SubscriptionWidget({ subscription }: { subscription: Subscription }) {
  const daysLeft = subscription.expires_at
    ? Math.ceil((new Date(subscription.expires_at).getTime() - Date.now()) / 86_400_000)
    : null;

  const isExpired = daysLeft !== null && daysLeft <= 0;
  const isRed = daysLeft !== null && daysLeft > 0 && daysLeft <= 7;
  const isYellow = daysLeft !== null && daysLeft > 7 && daysLeft <= 30;

  const bg = isExpired || isRed
    ? 'bg-red-50 border-red-200'
    : isYellow
    ? 'bg-amber-50 border-amber-200'
    : 'bg-emerald-50 border-emerald-200';

  const textMain = isExpired || isRed
    ? 'text-red-700'
    : isYellow
    ? 'text-amber-700'
    : 'text-emerald-700';

  const textSub = isExpired || isRed
    ? 'text-red-500'
    : isYellow
    ? 'text-amber-500'
    : 'text-emerald-500';

  const daysLabel = isExpired
    ? 'Lejárt'
    : daysLeft === null
    ? 'Korlátlan'
    : `${daysLeft} nap van hátra`;

  return (
    <div className={`rounded-xl border p-4 flex items-center gap-4 ${bg}`}>
      <div className={`p-2.5 rounded-lg ${isExpired || isRed ? 'bg-red-100' : isYellow ? 'bg-amber-100' : 'bg-emerald-100'}`}>
        <CalendarClock className={`h-5 w-5 ${textMain}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-semibold ${textMain}`}>{subscription.plan_name} csomag</p>
        <p className={`text-sm ${textSub}`}>
          {daysLabel}
          {subscription.expires_at && !isExpired && (
            <> · Lejárat: {new Date(subscription.expires_at).toLocaleDateString('hu-HU')}</>
          )}
        </p>
      </div>
      {isExpired && (
        <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-1 rounded-md whitespace-nowrap">
          Megújítás szükséges
        </span>
      )}
      {isRed && !isExpired && (
        <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-1 rounded-md whitespace-nowrap">
          Hamarosan lejár!
        </span>
      )}
    </div>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}
