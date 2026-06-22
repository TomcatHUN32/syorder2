'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Utensils,
  Phone,
  MapPin,
  Clock,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  UtensilsCrossed,
  CheckCircle2,
  PackageCheck,
} from 'lucide-react';
import { supabase, Tenant, MenuCategory, MenuItem } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface CartItem {
  item: MenuItem;
  quantity: number;
}

type OrderType = 'dine-in' | 'takeaway' | 'delivery';

export default function PublicMenuPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  // Checkout form
  const [orderType, setOrderType] = useState<OrderType>('takeaway');
  const [tableNumber, setTableNumber] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadMenu();
  }, [slug]);

  async function loadMenu() {
    try {
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (!tenantData) { setLoading(false); return; }
      setTenant(tenantData as Tenant);

      const [catRes, itemsRes] = await Promise.all([
        supabase.from('menu_categories').select('*').eq('tenant_id', tenantData.id).eq('is_active', true).order('display_order'),
        supabase.from('menu_items').select('*').eq('tenant_id', tenantData.id).eq('is_available', true).order('display_order'),
      ]);

      setCategories(catRes.data || []);
      setMenuItems(itemsRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing) return prev.map((c) => c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { item, quantity: 1 }];
    });
    toast.success(`${item.name} hozzáadva`);
  }

  function updateQuantity(item: MenuItem, delta: number) {
    setCart((prev) =>
      prev.map((c) => c.item.id === item.id ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c)
        .filter((c) => c.quantity > 0)
    );
  }

  function removeFromCart(item: MenuItem) {
    setCart((prev) => prev.filter((c) => c.item.id !== item.id));
  }

  async function submitOrder() {
    if (!tenant || cart.length === 0) return;
    if (orderType === 'dine-in' && !tableNumber.trim()) {
      toast.error('Add meg az asztal számát!');
      return;
    }
    if (orderType === 'delivery' && !address.trim()) {
      toast.error('Add meg a szállítási címet!');
      return;
    }

    setSubmitting(true);
    try {
      const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
      const subtotal = cart.reduce((s, c) => s + Number(c.item.price) * c.quantity, 0);

      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          tenant_id: tenant.id,
          order_number: orderNumber,
          status: 'pending',
          order_type: orderType,
          table_number: orderType === 'dine-in' ? tableNumber.trim() : null,
          subtotal,
          tax: 0,
          discount: 0,
          total: subtotal,
          notes: [
            orderType === 'delivery' ? `Szállítási cím: ${address.trim()}` : null,
            notes.trim() || null,
          ].filter(Boolean).join(' | ') || null,
        })
        .select()
        .single();

      if (orderErr || !order) throw orderErr ?? new Error('Rendelés mentése sikertelen');

      const { error: itemsErr } = await supabase.from('order_items').insert(
        cart.map((c) => ({
          tenant_id: tenant.id,
          order_id: order.id,
          menu_item_id: c.item.id,
          quantity: c.quantity,
          unit_price: Number(c.item.price),
          total_price: Number(c.item.price) * c.quantity,
        }))
      );

      if (itemsErr) throw itemsErr;

      setOrderSuccess(orderNumber);
      setCart([]);
      setCheckoutOpen(false);
      setCartOpen(false);
    } catch (err: unknown) {
      toast.error(`Hiba a rendelés leadásakor: ${(err as Error)?.message ?? 'Ismeretlen hiba'}`);
    } finally {
      setSubmitting(false);
    }
  }

  const cartTotal = cart.reduce((s, c) => s + Number(c.item.price) * c.quantity, 0);
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

  const filteredItems = activeCategory === 'all' ? menuItems : menuItems.filter((i) => i.category_id === activeCategory);
  const itemsByCategory = categories.reduce((acc, cat) => {
    acc[cat.id] = filteredItems.filter((i) => i.category_id === cat.id);
    return acc;
  }, {} as Record<string, MenuItem[]>);
  const uncategorizedItems = filteredItems.filter((i) => !i.category_id);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400" />
    </div>
  );

  if (!tenant) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <UtensilsCrossed className="h-16 w-16 text-slate-400 mb-4" />
      <h1 className="text-2xl font-bold mb-2">Étterem Nem Található</h1>
      <p className="text-slate-500 text-center mb-4">A keresett étterem nem létezik vagy nem elérhető.</p>
      <Link href="/"><Button variant="outline">Ugrás a Főoldalra</Button></Link>
    </div>
  );

  // Order success page
  if (orderSuccess) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="h-9 w-9 text-emerald-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-2">Rendelés Leadva!</h1>
        <p className="text-slate-500 mb-4">Rendelésed sikeresen megkaptuk.</p>
        <div className="bg-slate-100 rounded-xl px-6 py-3 inline-block mb-6">
          <p className="text-xs text-slate-500 mb-0.5">Rendelési azonosító</p>
          <p className="font-mono font-bold text-slate-900">{orderSuccess}</p>
        </div>
        <Button className="w-full" onClick={() => setOrderSuccess(null)}
          style={{ backgroundColor: tenant.primary_color }}>
          Új rendelés
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white"
      style={{ '--tenant-primary': tenant.primary_color, '--tenant-secondary': tenant.secondary_color, '--tenant-accent': tenant.accent_color } as React.CSSProperties}
    >
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {tenant.logo_url ? (
              <img src={tenant.logo_url} alt={tenant.name} className="h-8 w-8 object-contain rounded" />
            ) : (
              <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: tenant.primary_color }}>
                {tenant.name.charAt(0)}
              </div>
            )}
            <span className="font-semibold text-slate-900">{tenant.name}</span>
          </div>

          <Button
            className="relative gap-2 text-white"
            style={{ backgroundColor: tenant.primary_color }}
            onClick={() => setCartOpen(true)}
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Kosár</span>
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center font-bold">
                {cartCount}
              </span>
            )}
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="py-12 border-b"
        style={{ background: `linear-gradient(135deg, ${tenant.primary_color}12, ${tenant.secondary_color}08)` }}>
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-slate-900">{tenant.name}</h1>
          <p className="text-slate-500">Böngészd a menüt és add le rendelésed online</p>
          {(tenant.address || tenant.phone) && (
            <div className="flex flex-wrap items-center justify-center gap-4 mt-4 text-sm text-slate-500">
              {tenant.address && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{tenant.address}</span>}
              {tenant.phone && <span className="flex items-center gap-1"><Phone className="h-4 w-4" />{tenant.phone}</span>}
            </div>
          )}
        </div>
      </section>

      {/* Category Tabs */}
      <div className="sticky top-16 z-30 bg-white/95 backdrop-blur border-b">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex gap-2 py-3 overflow-x-auto scrollbar-hide">
            {['all', ...categories.map((c) => c.id)].map((id) => {
              const label = id === 'all' ? 'Összes' : categories.find((c) => c.id === id)?.name ?? '';
              const active = activeCategory === id;
              return (
                <button key={id} onClick={() => setActiveCategory(id)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${active ? 'text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                  style={active ? { backgroundColor: tenant.primary_color } : undefined}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {menuItems.length === 0 ? (
          <div className="text-center py-20">
            <UtensilsCrossed className="h-14 w-14 mx-auto text-slate-300 mb-4" />
            <h2 className="text-xl font-semibold text-slate-600">Menü Hamarosan</h2>
          </div>
        ) : (
          <div className="space-y-10">
            {categories.map((cat) => {
              const items = itemsByCategory[cat.id] || [];
              if (!items.length) return null;
              return (
                <section key={cat.id}>
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-900">
                    <span className="w-1 h-6 rounded-full block" style={{ backgroundColor: tenant.accent_color }} />
                    {cat.name}
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((item) => <MenuItemCard key={item.id} item={item} tenant={tenant} onAdd={addToCart} />)}
                  </div>
                </section>
              );
            })}
            {uncategorizedItems.length > 0 && (
              <section>
                <h2 className="text-xl font-bold mb-4 text-slate-900">Egyéb Tételek</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {uncategorizedItems.map((item) => <MenuItemCard key={item.id} item={item} tenant={tenant} onAdd={addToCart} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      <footer className="border-t py-8 mt-8 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 text-center text-sm text-slate-400">
          <p>Üzemeltető: <span className="font-semibold text-slate-600">SYORDER</span> — Étteremkezelő Platform</p>
        </div>
      </footer>

      {/* Cart Sheet */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent className="w-full sm:max-w-md flex flex-col">
          <SheetHeader className="shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Kosár
              {cartCount > 0 && <span className="text-sm font-normal text-slate-500">({cartCount} tétel)</span>}
            </SheetTitle>
          </SheetHeader>

          <div className="flex flex-col flex-1 overflow-hidden pt-4">
            <ScrollArea className="flex-1">
              {cart.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">A kosarad üres</p>
                  <p className="text-sm mt-1">Adj hozzá tételeket a menüből</p>
                </div>
              ) : (
                <div className="space-y-3 pr-4">
                  {cart.map((c) => (
                    <div key={c.item.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{c.item.name}</p>
                        <p className="text-sm text-slate-500">{Number(c.item.price).toLocaleString('hu-HU')} Ft/db</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => updateQuantity(c.item, -1)}
                          className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors">
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-6 text-center font-semibold text-sm">{c.quantity}</span>
                        <button onClick={() => updateQuantity(c.item, 1)}
                          className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors">
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => removeFromCart(c.item)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 transition-colors ml-1">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {cart.length > 0 && (
              <div className="border-t pt-4 mt-4 shrink-0 space-y-3">
                <div className="flex justify-between font-bold text-lg">
                  <span>Összesen</span>
                  <span>{cartTotal.toLocaleString('hu-HU')} Ft</span>
                </div>
                <Button className="w-full text-white font-semibold" style={{ backgroundColor: tenant.primary_color }}
                  onClick={() => { setCartOpen(false); setCheckoutOpen(true); }}>
                  <PackageCheck className="h-4 w-4 mr-2" />
                  Rendelés Leadása
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Checkout Dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rendelés Részletei</DialogTitle>
            <DialogDescription>Töltsd ki az alábbi adatokat a rendelés leadásához</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Order type */}
            <div className="space-y-1.5">
              <Label>Rendelés típusa</Label>
              <div className="grid grid-cols-3 gap-2">
                {([['dine-in', 'Helyszíni'], ['takeaway', 'Elvitel'], ['delivery', 'Házhozszállítás']] as [OrderType, string][]).map(([val, label]) => (
                  <button key={val} onClick={() => setOrderType(val)}
                    className={`py-2.5 px-2 rounded-xl text-sm font-medium border transition-colors ${orderType === val ? 'text-white border-transparent' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                    style={orderType === val ? { backgroundColor: tenant.primary_color, borderColor: tenant.primary_color } : undefined}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {orderType === 'dine-in' && (
              <div className="space-y-1.5">
                <Label htmlFor="table">Asztal száma *</Label>
                <Input id="table" placeholder="pl. 5" value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} />
              </div>
            )}

            {orderType === 'delivery' && (
              <div className="space-y-1.5">
                <Label htmlFor="address">Szállítási cím *</Label>
                <Input id="address" placeholder="Utca, házszám, város" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="notes">Megjegyzés (opcionális)</Label>
              <Textarea id="notes" placeholder="pl. allergia, különleges kérés..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>

            {/* Order summary */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              <p className="font-semibold text-sm text-slate-700 mb-2">Rendelés összefoglalója</p>
              {cart.map((c) => (
                <div key={c.item.id} className="flex justify-between text-sm">
                  <span className="text-slate-600">{c.quantity}× {c.item.name}</span>
                  <span className="font-medium">{(Number(c.item.price) * c.quantity).toLocaleString('hu-HU')} Ft</span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                <span>Összesen</span>
                <span>{cartTotal.toLocaleString('hu-HU')} Ft</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutOpen(false)} disabled={submitting}>Vissza</Button>
            <Button onClick={submitOrder} disabled={submitting}
              style={{ backgroundColor: tenant.primary_color }} className="text-white">
              {submitting ? 'Leadás folyamatban...' : 'Rendelés Leadása'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MenuItemCard({ item, tenant, onAdd }: { item: MenuItem; tenant: Tenant; onAdd: (i: MenuItem) => void }) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow group">
      {item.image_url ? (
        <div className="aspect-video overflow-hidden bg-slate-100">
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
      ) : (
        <div className="aspect-video bg-slate-100 flex items-center justify-center">
          <Utensils className="h-10 w-10 text-slate-300" />
        </div>
      )}
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 leading-snug">{item.name}</h3>
            {item.description && <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{item.description}</p>}
            {item.preparation_time_minutes > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-400 mt-1.5">
                <Clock className="h-3 w-3" />{item.preparation_time_minutes} perc
              </span>
            )}
          </div>
          <div className="text-right shrink-0">
            <span className="font-bold text-base" style={{ color: tenant.primary_color }}>
              {Number(item.price).toLocaleString('hu-HU')} Ft
            </span>
          </div>
        </div>
        <Button className="w-full text-white text-sm" style={{ backgroundColor: tenant.primary_color }}
          onClick={() => onAdd(item)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />Kosárba
        </Button>
      </CardContent>
    </Card>
  );
}
