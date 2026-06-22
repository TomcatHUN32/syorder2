'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Users,
  Star,
  Search,
  Award,
  TrendingUp,
  Gift,
  Phone,
  Mail,
  Calendar,
  Plus,
  History,
} from 'lucide-react';
import { supabase, Customer, LoyaltyTransaction, Order } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface CustomerWithStats extends Customer {
  recent_orders?: Order[];
  loyalty_history?: LoyaltyTransaction[];
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  // Dialogs
  const [customerDialog, setCustomerDialog] = useState(false);
  const [detailDialog, setDetailDialog] = useState(false);
  const [pointsDialog, setPointsDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithStats | null>(null);

  // Form state
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [pointsAmount, setPointsAmount] = useState('');
  const [pointsReason, setPointsReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('total_spent', { ascending: false });

      if (error) throw error;
      setCustomers(data as CustomerWithStats[]);
    } catch (error) {
      console.error('Hiba az ügyfelek betöltésekor:', error);
      toast.error('Nem sikerült betölteni az ügyfeleket');
    } finally {
      setLoading(false);
    }
  }

  async function loadCustomerDetails(customer: Customer) {
    try {
      const [{ data: orders }, { data: loyalty }] = await Promise.all([
        supabase
          .from('orders')
          .select('*')
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('loyalty_transactions')
          .select('*')
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      setSelectedCustomer({
        ...customer,
        recent_orders: orders || [],
        loyalty_history: loyalty || [],
      } as CustomerWithStats);
      setDetailDialog(true);
    } catch (error) {
      console.error('Hiba az ügyfél adatok betöltésekor:', error);
      toast.error('Nem sikerült betölteni az ügyfél adatokat');
    }
  }

  async function saveCustomer() {
    if (!customerName.trim() && !customerEmail.trim() && !customerPhone.trim()) {
      toast.error('Legalább egy mező kitöltése kötelező');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('customers').insert({
        name: customerName || null,
        email: customerEmail || null,
        phone: customerPhone || null,
      });
      if (error) throw error;
      toast.success('Ügyfél létrehozva');
      closeCustomerDialog();
      loadCustomers();
    } catch (error) {
      console.error('Hiba az ügyfél mentésekor:', error);
      toast.error('Nem sikerült menteni az ügyfelet');
    } finally {
      setSaving(false);
    }
  }

  async function adjustPoints(customer: Customer, type: 'earn' | 'redeem') {
    if (!pointsAmount || parseInt(pointsAmount) <= 0) {
      toast.error('Érvényes pontszám szükséges');
      return;
    }

    const points = parseInt(pointsAmount);
    const newPoints =
      type === 'earn'
        ? customer.loyalty_points + points
        : customer.loyalty_points - points;

    if (newPoints < 0) {
      toast.error('Nincs elég pont');
      return;
    }

    setSaving(true);
    try {
      // Update customer points
      const { error: updateError } = await supabase
        .from('customers')
        .update({ loyalty_points: newPoints })
        .eq('id', customer.id);

      if (updateError) throw updateError;

      // Log transaction
      await supabase.from('loyalty_transactions').insert({
        customer_id: customer.id,
        points: type === 'earn' ? points : -points,
        transaction_type: type === 'earn' ? 'bonus' : 'redeemed',
        description: pointsReason || `Kézi ${type === 'earn' ? 'jóváírás' : 'beváltás'}`,
      });

      toast.success(
        type === 'earn'
          ? `${points} pont hozzáadva`
          : `${points} pont beváltva`
      );
      closePointsDialog();
      loadCustomers();
    } catch (error) {
      console.error('Hiba a pontok módosításakor:', error);
      toast.error('Nem sikerült módosítani a pontokat');
    } finally {
      setSaving(false);
    }
  }

  function openCustomerDialog() {
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setCustomerDialog(true);
  }

  function closeCustomerDialog() {
    setCustomerDialog(false);
  }

  function openPointsDialog(customer: Customer) {
    setSelectedCustomer(customer as CustomerWithStats);
    setPointsAmount('');
    setPointsReason('');
    setPointsDialog(true);
  }

  function closePointsDialog() {
    setPointsDialog(false);
    setPointsAmount('');
    setPointsReason('');
  }

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone?.includes(searchQuery);

    if (activeTab === 'vip') return matchesSearch && c.loyalty_points >= 500;
    if (activeTab === 'active') return matchesSearch && c.total_orders >= 5;
    return matchesSearch;
  });

  const totalPoints = customers.reduce((sum, c) => sum + c.loyalty_points, 0);
  const activeCustomers = customers.filter((c) => c.total_orders >= 5).length;
  const vipCustomers = customers.filter((c) => c.loyalty_points >= 500).length;

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
          <h1 className="text-3xl font-bold">Ügyfél Hűségprogram</h1>
          <p className="text-muted-foreground">Ügyfelek és hűségprogram kezelése</p>
        </div>
        <Button onClick={openCustomerDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Ügyfél Hozzáadása
        </Button>
      </div>

      {/* Statisztika */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Összes Ügyfél</span>
            </div>
            <div className="text-2xl font-bold mt-1">{customers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-success" />
              <span className="text-sm text-muted-foreground">Aktív</span>
            </div>
            <div className="text-2xl font-bold mt-1 text-success">{activeCustomers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">VIP Tagok</span>
            </div>
            <div className="text-2xl font-bold mt-1 text-primary">{vipCustomers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-warning" />
              <span className="text-sm text-muted-foreground">Összes Pont</span>
            </div>
            <div className="text-2xl font-bold mt-1">{totalPoints.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs és Keresés */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Keresés név, email vagy telefon alapján..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">Összes</TabsTrigger>
            <TabsTrigger value="active">Aktív</TabsTrigger>
            <TabsTrigger value="vip">VIP</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Ügyfelek rács */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredCustomers.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nem található ügyfél</p>
            </CardContent>
          </Card>
        ) : (
          filteredCustomers.map((customer) => (
            <Card key={customer.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">
                      {customer.name || 'Vendég Ügyfél'}
                    </h3>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {customer.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {customer.email}
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {customer.phone}
                        </div>
                      )}
                    </div>
                  </div>
                  {customer.loyalty_points >= 500 && (
                    <Badge className="bg-primary">
                      <Award className="h-3 w-3 mr-1" />
                      VIP
                    </Badge>
                  )}
                </div>

                <Separator className="my-3" />

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-lg font-bold text-warning">
                      {customer.loyalty_points}
                    </div>
                    <div className="text-xs text-muted-foreground">Pont</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold">{customer.total_orders}</div>
                    <div className="text-xs text-muted-foreground">Rendelés</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-success">
                      {Number(customer.total_spent).toLocaleString('hu-HU')}
                    </div>
                    <div className="text-xs text-muted-foreground">Költés</div>
                  </div>
                </div>

                <Separator className="my-3" />

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => loadCustomerDetails(customer)}
                  >
                    <History className="h-4 w-4 mr-1" />
                    Részletek
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => openPointsDialog(customer)}
                  >
                    <Star className="h-4 w-4 mr-1" />
                    Pontok
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Ügyfél hozzáadása párbeszédablak */}
      <Dialog open={customerDialog} onOpenChange={setCustomerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Új Ügyfél Hozzáadása</DialogTitle>
            <DialogDescription>
              Ügyfél regisztrálása a hűségprogramba
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Név</Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ügyfél neve"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="email@pelda.hu"
              />
            </div>
            <div className="space-y-2">
              <Label>Telefon</Label>
              <Input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+36..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeCustomerDialog}>
              Mégse
            </Button>
            <Button onClick={saveCustomer} disabled={saving}>
              {saving ? 'Mentés...' : 'Hozzáadás'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ügyfél részletek párbeszédablak */}
      <Dialog open={detailDialog} onOpenChange={setDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedCustomer?.name || 'Vendég Ügyfél'}
            </DialogTitle>
            <DialogDescription>
              Ügyfél történet és hűségprogram aktivitás
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="orders">
            <TabsList>
              <TabsTrigger value="orders">Legutóbbi Rendelések</TabsTrigger>
              <TabsTrigger value="loyalty">Hűség Történet</TabsTrigger>
            </TabsList>
            <TabsContent value="orders" className="mt-4">
              <ScrollArea className="h-[300px]">
                {selectedCustomer?.recent_orders?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Még nincs rendelés
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedCustomer?.recent_orders?.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-2 rounded bg-muted/50"
                      >
                        <div>
                          <div className="font-medium">#{order.order_number}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString('hu-HU')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            {Number(order.total).toLocaleString('hu-HU')} Ft
                          </div>
                          <Badge variant="outline">{order.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
            <TabsContent value="loyalty" className="mt-4">
              <ScrollArea className="h-[300px]">
                {selectedCustomer?.loyalty_history?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Még nincs hűség aktivitás
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedCustomer?.loyalty_history?.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-2 rounded bg-muted/50"
                      >
                        <div>
                          <Badge
                            variant={
                              tx.points > 0 ? 'default' : 'secondary'
                            }
                          >
                            {tx.transaction_type}
                          </Badge>
                          <div className="text-sm text-muted-foreground mt-1">
                            {tx.description || '-'}
                          </div>
                        </div>
                        <div
                          className={
                            tx.points > 0 ? 'text-success font-bold' : 'text-muted-foreground'
                          }
                        >
                          {tx.points > 0 ? '+' : ''}
                          {tx.points}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Pont módosítás párbeszédablak */}
      <Dialog open={pointsDialog} onOpenChange={setPointsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hűségpontok Módosítása</DialogTitle>
            <DialogDescription>
              {selectedCustomer?.name || 'Ügyfél'} - Jelenlegi pontok:{' '}
              {selectedCustomer?.loyalty_points}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Pontszám</Label>
              <Input
                type="number"
                value={pointsAmount}
                onChange={(e) => setPointsAmount(e.target.value)}
                placeholder="Add meg a pontokat"
              />
            </div>
            <div className="space-y-2">
              <Label>Indoklás (opcionális)</Label>
              <Input
                value={pointsReason}
                onChange={(e) => setPointsReason(e.target.value)}
                placeholder="pl.: Születésnapi bónusz, Promóció"
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => selectedCustomer && adjustPoints(selectedCustomer, 'redeem')}
              disabled={saving}
            >
              <Gift className="h-4 w-4 mr-2" />
              Beváltás
            </Button>
            <Button
              className="flex-1"
              onClick={() => selectedCustomer && adjustPoints(selectedCustomer, 'earn')}
              disabled={saving}
            >
              <Star className="h-4 w-4 mr-2" />
              Pont Hozzáadása
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
