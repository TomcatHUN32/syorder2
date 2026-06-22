'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Search,
  Clock,
  CheckCircle,
  Package,
  ChefHat,
  Bike,
  XCircle,
  RefreshCw,
  Phone,
  Bell,
  BellOff,
} from 'lucide-react';
import { supabase, Order, OrderItem, MenuItem } from '@/lib/supabase/client';
import { toast } from 'sonner';

function playNewOrderSound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.35, now + i * 0.12 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.28);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.3);
    });
  } catch {
    // Web Audio not available
  }
}

type OrderWithItems = Order & {
  order_items: (OrderItem & { menu_item: MenuItem | null })[];
  customer: { name: string | null; phone: string | null } | null;
};

const orderStatuses = [
  { value: 'pending', label: 'Függőben', icon: Clock, color: 'bg-warning text-warning-foreground' },
  { value: 'confirmed', label: 'Visszaigazolva', icon: CheckCircle, color: 'bg-primary text-primary-foreground' },
  { value: 'preparing', label: 'Készítés alatt', icon: ChefHat, color: 'bg-secondary text-secondary-foreground' },
  { value: 'ready', label: 'Kész', icon: Package, color: 'bg-success text-success-foreground' },
  { value: 'delivered', label: 'Kiszállítva', icon: Bike, color: 'bg-muted text-muted-foreground' },
  { value: 'cancelled', label: 'Lemondva', icon: XCircle, color: 'bg-destructive text-destructive-foreground' },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const [updating, setUpdating] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const knownOrderIds = useRef<Set<string>>(new Set());
  const initialLoad = useRef(true);

  const loadOrders = useCallback(async (triggerSound = false) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*, menu_item:menu_items(*)), customer:customers(name, phone)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      const rows = data as OrderWithItems[];

      if (initialLoad.current) {
        rows.forEach((o) => knownOrderIds.current.add(o.id));
        initialLoad.current = false;
      } else if (triggerSound) {
        const newOrders = rows.filter((o) => !knownOrderIds.current.has(o.id));
        if (newOrders.length > 0) {
          newOrders.forEach((o) => knownOrderIds.current.add(o.id));
          if (soundEnabled) playNewOrderSound();
          toast.success(`${newOrders.length} új rendelés érkezett!`, { duration: 5000 });
        }
      }

      setOrders(rows);
    } catch (error) {
      console.error('Hiba a rendelések betöltésekor:', error);
      toast.error('Nem sikerült betölteni a rendeléseket');
    } finally {
      setLoading(false);
    }
  }, [soundEnabled]);

  useEffect(() => {
    loadOrders(false);

    const channel = supabase
      .channel('orders-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
        loadOrders(true);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => {
        loadOrders(false);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadOrders]);

  async function updateOrderStatus(orderId: string, newStatus: string) {
    setUpdating(orderId);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      const statusLabel = orderStatuses.find((s) => s.value === newStatus)?.label || newStatus;
      toast.success(`Rendelés státusza: ${statusLabel}`);
      loadOrders();
    } catch (error) {
      console.error('Hiba a rendelés frissítésekor:', error);
      toast.error('Nem sikerült frissíteni a rendelés státuszát');
    } finally {
      setUpdating(null);
    }
  }

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.table_number?.includes(searchQuery);

    if (activeTab === 'active') {
      return matchesSearch && ['pending', 'confirmed', 'preparing', 'ready'].includes(order.status);
    } else if (activeTab === 'completed') {
      return matchesSearch && order.status === 'delivered';
    } else if (activeTab === 'cancelled') {
      return matchesSearch && order.status === 'cancelled';
    }
    return matchesSearch;
  });

  const statusCounts = {
    pending: orders.filter((o) => o.status === 'pending').length,
    confirmed: orders.filter((o) => o.status === 'confirmed').length,
    preparing: orders.filter((o) => o.status === 'preparing').length,
    ready: orders.filter((o) => o.status === 'ready').length,
  };

  const getStatusConfig = (status: string) =>
    orderStatuses.find((s) => s.value === status) || orderStatuses[0];

  const getNextStatus = (currentStatus: string): string | null => {
    const currentIndex = orderStatuses.findIndex((s) => s.value === currentStatus);
    if (currentIndex < 0 || currentIndex >= 4) return null;
    return orderStatuses[currentIndex + 1].value;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Fejléc */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Rendelések</h1>
          <p className="text-muted-foreground">Kezeld és kövesd nyomon az összes rendelést valós időben</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSoundEnabled((v) => !v)}
            className={soundEnabled ? 'text-emerald-600 border-emerald-300 hover:bg-emerald-50' : 'text-slate-400'}
            title={soundEnabled ? 'Hang értesítés bekapcsolva' : 'Hang értesítés kikapcsolva'}
          >
            {soundEnabled ? <Bell className="h-4 w-4 mr-1.5" /> : <BellOff className="h-4 w-4 mr-1.5" />}
            {soundEnabled ? 'Hang: Be' : 'Hang: Ki'}
          </Button>
          <Button variant="outline" onClick={() => loadOrders(false)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Frissítés
          </Button>
        </div>
      </div>

      {/* Státusz áttekintés */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { key: 'pending', label: 'Függőben' },
          { key: 'confirmed', label: 'Visszaigazolva' },
          { key: 'preparing', label: 'Készítés alatt' },
          { key: 'ready', label: 'Kész' },
        ].map(({ key, label }) => {
          const config = getStatusConfig(key);
          return (
            <Card key={key} className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">{statusCounts[key as keyof typeof statusCounts]}</div>
                    <div className="text-sm text-muted-foreground">{label}</div>
                  </div>
                  <div className={`${config.color} rounded-full p-2`}>
                    <config.icon className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Szűrők */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Keresés rendelés, asztal, ügyfél alapján..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="active">Aktív</TabsTrigger>
                <TabsTrigger value="completed">Teljesített</TabsTrigger>
                <TabsTrigger value="cancelled">Lemondott</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Rendelések listája */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredOrders.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nem található rendelés</p>
            </CardContent>
          </Card>
        ) : (
          filteredOrders.map((order) => {
            const statusConfig = getStatusConfig(order.status);
            const nextStatus = getNextStatus(order.status);

            return (
              <Card key={order.id} className="overflow-hidden">
                <CardHeader className="pb-3 bg-muted/30">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">#{order.order_number}</CardTitle>
                      <CardDescription>
                        {new Date(order.created_at).toLocaleString('hu-HU', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </CardDescription>
                    </div>
                    <Badge className={statusConfig.color}>
                      <statusConfig.icon className="h-3 w-3 mr-1" />
                      {statusConfig.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {/* Rendelés típusa */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {order.order_type === 'dine-in' ? (
                      <span className="font-medium text-foreground">{order.table_number}. asztal</span>
                    ) : order.order_type === 'takeaway' ? (
                      <span>Elvitel</span>
                    ) : (
                      <span>Házhozszállítás</span>
                    )}
                  </div>

                  {/* Ügyfél info */}
                  {order.customer && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{order.customer.name || 'Vendég'}</span>
                      {order.customer.phone && (
                        <span className="text-muted-foreground">{order.customer.phone}</span>
                      )}
                    </div>
                  )}

                  {/* Tételek */}
                  <div className="space-y-2">
                    {order.order_items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>
                          {item.quantity}x {item.menu_item?.name || 'Ismeretlen tétel'}
                        </span>
                        <span className="text-muted-foreground">
                          {Number(item.total_price).toLocaleString('hu-HU')} Ft
                        </span>
                      </div>
                    ))}
                    {order.notes && (
                      <div className="text-xs text-muted-foreground italic">
                        Megjegyzés: {order.notes}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Végösszeg */}
                  <div className="flex justify-between font-bold">
                    <span>Összesen</span>
                    <span>{Number(order.total).toLocaleString('hu-HU')} Ft</span>
                  </div>

                  {/* Gombok */}
                  <div className="flex gap-2">
                    {nextStatus && (
                      <Button
                        className="flex-1"
                        onClick={() => updateOrderStatus(order.id, nextStatus)}
                        disabled={updating === order.id}
                      >
                        {updating === order.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <>Megjelölés: {getStatusConfig(nextStatus).label}</>
                        )}
                      </Button>
                    )}
                    {order.status === 'pending' && (
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => updateOrderStatus(order.id, 'cancelled')}
                        disabled={updating === order.id}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                    {order.status === 'ready' && (
                      <Button
                        className="flex-1"
                        variant="secondary"
                        onClick={() => updateOrderStatus(order.id, 'delivered')}
                        disabled={updating === order.id}
                      >
                        Rendelés Lezárása
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
