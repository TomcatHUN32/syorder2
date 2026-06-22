'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Users,
  UtensilsCrossed,
  Calendar,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { supabase } from '@/lib/supabase/client';

interface DailyData {
  date: string;
  orders: number;
  revenue: number;
}

interface TopItem {
  name: string;
  orders: number;
  revenue: number;
}

interface CategoryData {
  name: string;
  value: number;
}

const COLORS = ['#1E40AF', '#3B82F6', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#EC4899'];

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7');
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);

  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    newCustomers: 0,
    revenueChange: 0,
    ordersChange: 0,
  });

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  async function loadAnalytics() {
    setLoading(true);
    try {
      const days = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      // Get orders in date range
      const { data: orders } = await supabase
        .from('orders')
        .select('*, order_items(quantity, total_price, menu_item:menu_items(name, category_id, price), category:menu_categories(name))')
        .gte('created_at', startDateStr)
        .order('created_at', { ascending: true });

      if (!orders) {
        setLoading(false);
        return;
      }

      // Daily revenue data
      const dailyMap = new Map<string, { orders: number; revenue: number }>();
      orders.forEach((order) => {
        const date = order.created_at.split('T')[0];
        const existing = dailyMap.get(date) || { orders: 0, revenue: 0 };
        dailyMap.set(date, {
          orders: existing.orders + 1,
          revenue: existing.revenue + Number(order.total),
        });
      });

      const dailyDataArray = Array.from(dailyMap.entries())
        .map(([date, data]) => ({
          date,
          orders: data.orders,
          revenue: data.revenue,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setDailyData(dailyDataArray);

      // Calculate stats
      const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
      const totalOrders = orders.length;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Get changes from previous period
      const prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - days);
      const { data: prevOrders } = await supabase
        .from('orders')
        .select('total')
        .gte('created_at', prevStartDate.toISOString().split('T')[0])
        .lt('created_at', startDateStr);

      const prevRevenue = (prevOrders || []).reduce((sum, o) => sum + Number(o.total), 0);
      const prevOrdersCount = (prevOrders || []).length;
      const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
      const ordersChange = prevOrdersCount > 0 ? ((totalOrders - prevOrdersCount) / prevOrdersCount) * 100 : 0;

      setStats({
        totalRevenue,
        totalOrders,
        avgOrderValue,
        newCustomers: 0,
        revenueChange,
        ordersChange,
      });

      // Top selling items
      const itemStats = new Map<string, { orders: number; revenue: number }>();
      orders.forEach((order) => {
        order.order_items?.forEach((item: { quantity?: number; total_price?: number; menu_item?: { name: string } | null }) => {
          if (item.menu_item?.name) {
            const existing = itemStats.get(item.menu_item.name) || { orders: 0, revenue: 0 };
            itemStats.set(item.menu_item.name, {
              orders: existing.orders + (item.quantity || 0),
              revenue: existing.revenue + Number(item.total_price || 0),
            });
          }
        });
      });

      const topItemsArray = Array.from(itemStats.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      setTopItems(topItemsArray);

      // Category distribution
      const catStats = new Map<string, number>();
      orders.forEach((order) => {
        (order.order_items || []).forEach((item: { menu_item?: { category_id?: string } | null; total_price?: number }) => {
          if (item.menu_item?.category_id && item.total_price) {
            const existing = catStats.get(item.menu_item.category_id) || 0;
            catStats.set(item.menu_item.category_id, existing + Number(item.total_price));
          }
        });
      });

      const categoriesArray = Array.from(catStats.entries())
        .map(([_, value]) => ({ name: 'Category', value }))
        .slice(0, 5);

      if (categoriesArray.length === 0) {
        setCategoryData([{ name: 'No data', value: 1 }]);
      } else {
        setCategoryData(categoriesArray);
      }

    } catch (error) {
      console.error('Error loading analytics:', error);
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
      {/* Fejléc */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Analitika</h1>
          <p className="text-muted-foreground">
            Kövesd nyomon az étterem teljesítményét és trendjeit
          </p>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-40">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Elmúlt 7 nap</SelectItem>
            <SelectItem value="14">Elmúlt 14 nap</SelectItem>
            <SelectItem value="30">Elmúlt 30 nap</SelectItem>
            <SelectItem value="90">Elmúlt 90 nap</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Statisztika kártyák */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Összes Bevétel</p>
                <p className="text-2xl font-bold">
                  {stats.totalRevenue.toLocaleString('hu-HU')} Ft
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="flex items-center mt-2">
              {stats.revenueChange >= 0 ? (
                <TrendingUp className="h-4 w-4 text-success mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive mr-1" />
              )}
              <span
                className={
                  stats.revenueChange >= 0 ? 'text-success text-sm' : 'text-destructive text-sm'
                }
              >
                {Math.abs(stats.revenueChange).toFixed(1)}% vs előző időszak
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Összes Rendelés</p>
                <p className="text-2xl font-bold">{stats.totalOrders}</p>
              </div>
              <ShoppingBag className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="flex items-center mt-2">
              {stats.ordersChange >= 0 ? (
                <TrendingUp className="h-4 w-4 text-success mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive mr-1" />
              )}
              <span
                className={
                  stats.ordersChange >= 0 ? 'text-success text-sm' : 'text-destructive text-sm'
                }
              >
                {Math.abs(stats.ordersChange).toFixed(1)}% vs előző időszak
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Átlag Rendelés Érték</p>
                <p className="text-2xl font-bold">
                  {Math.round(stats.avgOrderValue).toLocaleString('hu-HU')} Ft
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Eladott Tételek</p>
                <p className="text-2xl font-bold">
                  {topItems.reduce((sum, item) => sum + item.orders, 0)}
                </p>
              </div>
              <UtensilsCrossed className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grafikonok */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bevétel grafikon */}
        <Card>
          <CardHeader>
            <CardTitle>Bevételi Trend</CardTitle>
            <CardDescription>Napi bevétel a kiválasztott időszakban</CardDescription>
          </CardHeader>
          <CardContent>
            {dailyData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nincs elérhető adat
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => new Date(value).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })}
                    className="text-xs"
                  />
                  <YAxis
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                    className="text-xs"
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value.toLocaleString('hu-HU')} Ft`, 'Bevétel']}
                    labelFormatter={(label) => new Date(label).toLocaleDateString('hu-HU')}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Rendelések grafikon */}
        <Card>
          <CardHeader>
            <CardTitle>Rendelési Trend</CardTitle>
            <CardDescription>Napi rendelések a kiválasztott időszakban</CardDescription>
          </CardHeader>
          <CardContent>
            {dailyData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nincs elérhető adat
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => new Date(value).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })}
                    className="text-xs"
                  />
                  <YAxis className="text-xs" />
                  <Tooltip
                    formatter={(value: number) => [value, 'Rendelések']}
                    labelFormatter={(label) => new Date(label).toLocaleDateString('hu-HU')}
                  />
                  <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top tételek és kategória eloszlás */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Legjobban teljesítő tételek */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Legjobban Eladó Tételek</CardTitle>
            <CardDescription>Legjobban teljesítő menütételek bevétel alapján</CardDescription>
          </CardHeader>
          <CardContent>
            {topItems.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                Ebben az időszakban nem volt eladás
              </div>
            ) : (
              <ScrollArea className="h-[350px]">
                <div className="space-y-4">
                  {topItems.map((item, index) => (
                    <div key={item.name} className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.orders} rendelés
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">
                          {item.revenue.toLocaleString('hu-HU')} Ft
                        </div>
                        <Badge variant="outline" className="text-xs">
                          #{index + 1}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Kategória eloszlás */}
        <Card>
          <CardHeader>
            <CardTitle>Kategória Eloszlás</CardTitle>
            <CardDescription>Eladások kategóriánként</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`${value.toLocaleString('hu-HU')} Ft`]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {categoryData.map((cat, index) => (
                <div key={cat.name} className="flex items-center gap-2 text-sm">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span>{cat.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rendelés típus összefoglaló */}
      <Card>
        <CardHeader>
          <CardTitle>Rendelés Típus Összefoglaló</CardTitle>
          <CardDescription>Összesítés rendelés típus szerint</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-primary">Helyben</div>
              <div className="text-sm text-muted-foreground">Elsődleges csatorna</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-success">Elvitel</div>
              <div className="text-sm text-muted-foreground">Kényelmes</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-warning">Kiszállítás</div>
              <div className="text-sm text-muted-foreground">Terjeszkedés</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
