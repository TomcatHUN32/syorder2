'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  ChevronRight,
  CheckCircle,
  Loader2,
  Package,
  LogIn,
  User,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  settings: Record<string, unknown>;
}

interface MenuCategory {
  id: string;
  name: string;
  display_order: number;
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number | string;
  image_url: string | null;
  category_id: string | null;
  preparation_time_minutes: number | null;
  tenant_id: string;
}

interface CartItem {
  item: MenuItem;
  quantity: number;
}

function generateOrderNumber(): string {
  const now = new Date();
  const ts = now.getHours().toString().padStart(2, '0') + now.getMinutes().toString().padStart(2, '0');
  return `${ts}-${Math.floor(Math.random() * 900 + 100)}`;
}

export default function RestaurantPage() {
  const params = useParams();
  const slug = params.subdomain as string;

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successOrderNum, setSuccessOrderNum] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [orderType, setOrderType] = useState<'takeaway' | 'delivery'>('takeaway');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  // Auth form state
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUser(session?.user ?? null);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('*')
          .eq('slug', slug)
          .eq('is_active', true)
          .maybeSingle();

        if (!tenantData) { setLoading(false); return; }
        setTenant(tenantData as Tenant);

        const [catsRes, itemsRes] = await Promise.all([
          supabase.from('menu_categories').select('*').eq('tenant_id', tenantData.id).eq('is_active', true).order('display_order'),
          supabase.from('menu_items').select('*').eq('tenant_id', tenantData.id).eq('is_available', true).order('display_order'),
        ]);

        setCategories(catsRes.data || []);
        setMenuItems(itemsRes.data || []);
      } catch (err) {
        console.error('Error loading restaurant:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing) return prev.map((c) => c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { item, quantity: 1 }];
    });
    toast.success(`${item.name} hozzáadva`);
  }

  function updateQty(itemId: string, delta: number) {
    setCart((prev) =>
      prev.map((c) => c.item.id === itemId ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c)
        .filter((c) => c.quantity > 0)
    );
  }

  function handleCheckout() {
    if (cart.length === 0) return;
    if (!currentUser) {
      setAuthOpen(true);
      return;
    }
    // Check min order
    const minOrder = Number((tenant?.settings as Record<string, unknown>)?.min_order_amount ?? 0);
    if (minOrder > 0 && cartTotal < minOrder) {
      toast.error(`Minimum rendelési összeg: ${minOrder.toLocaleString('hu-HU')} Ft`);
      return;
    }
    setCartOpen(false);
    setOrderDialogOpen(true);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
      if (error) { toast.error('Hibás email cím vagy jelszó'); return; }
      toast.success('Sikeresen bejelentkeztél!');
      setAuthOpen(false);
      setCartOpen(false);
      setOrderDialogOpen(true);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!authName.trim()) { toast.error('Add meg a neved!'); return; }
    setAuthLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email: authEmail, password: authPassword });
      if (error) { toast.error(error.message); return; }
      if (data.user && tenant) {
        // Create customer record for this restaurant
        await supabase.from('customers').upsert({
          tenant_id: tenant.id,
          email: authEmail,
          name: authName,
          phone: authPhone || null,
          auth_user_id: data.user.id,
        }, { onConflict: 'tenant_id,email' });
      }
      toast.success('Regisztráció sikeres! Bejelentkezés...');
      // Sign in immediately after register
      await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
      setAuthOpen(false);
      setCartOpen(false);
      setOrderDialogOpen(true);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant || !currentUser) return;
    if (orderType === 'delivery' && !deliveryAddress) {
      toast.error('Add meg a szállítási címet!');
      return;
    }
    setSubmitting(true);

    try {
      const subtotal = cart.reduce((s, c) => s + Number(c.item.price) * c.quantity, 0);
      const orderNumber = generateOrderNumber();

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          tenant_id: tenant.id,
          order_number: orderNumber,
          status: 'pending',
          order_type: orderType,
          subtotal,
          total: subtotal,
          notes: [
            orderType === 'delivery' ? `Szállítási cím: ${deliveryAddress}` : null,
            orderNotes ? `Megjegyzés: ${orderNotes}` : null,
          ].filter(Boolean).join(' | ') || null,
          auth_user_id: currentUser.id,
        })
        .select('id')
        .single();

      if (orderError) throw orderError;

      await supabase.from('order_items').insert(
        cart.map((c) => ({
          tenant_id: tenant.id,
          order_id: order.id,
          menu_item_id: c.item.id,
          quantity: c.quantity,
          unit_price: Number(c.item.price),
          total_price: Number(c.item.price) * c.quantity,
        }))
      );

      setSuccessOrderNum(orderNumber);
      setCart([]);
      setOrderDialogOpen(false);
      setCartOpen(false);
    } catch (err) {
      console.error('Order error:', err);
      toast.error('Hiba a rendelés leadásakor. Kérjük próbáld újra!');
    } finally {
      setSubmitting(false);
    }
  }

  const cartTotal = cart.reduce((s, c) => s + Number(c.item.price) * c.quantity, 0);
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);
  const minOrder = Number((tenant?.settings as Record<string, unknown>)?.min_order_amount ?? 0);

  const filteredItems = activeCategory === 'all'
    ? menuItems
    : menuItems.filter((i) => i.category_id === activeCategory);

  const byCategory = categories.reduce<Record<string, MenuItem[]>>((acc, cat) => {
    acc[cat.id] = filteredItems.filter((i) => i.category_id === cat.id);
    return acc;
  }, {});

  const uncategorized = filteredItems.filter((i) => !i.category_id);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <UtensilsCrossed className="h-16 w-16 text-slate-300 mb-4" />
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Étterem nem található</h1>
        <p className="text-slate-500 text-center text-sm">Ez az étterem nem létezik vagy jelenleg nem elérhető.</p>
      </div>
    );
  }

  if (successOrderNum) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center max-w-sm shadow-lg">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ backgroundColor: `${tenant.primary_color}20` }}>
            <CheckCircle className="h-8 w-8" style={{ color: tenant.primary_color }} />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Rendelés leadva!</h2>
          <p className="text-slate-500 text-sm mb-4">A rendelésedet rögzítettük. Hamarosan felveszik veled a kapcsolatot.</p>
          <div className="bg-slate-50 rounded-xl px-5 py-3 mb-6 border border-slate-100">
            <p className="text-xs text-slate-400 mb-1">Rendelési szám</p>
            <p className="text-2xl font-black text-slate-900 tracking-widest"># {successOrderNum}</p>
          </div>
          <button onClick={() => setSuccessOrderNum(null)} className="w-full py-3 rounded-xl text-white font-semibold text-sm" style={{ backgroundColor: tenant.primary_color }}>
            Új rendelés
          </button>
        </div>
      </div>
    );
  }

  const primary = tenant.primary_color || '#1e293b';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {tenant.logo_url ? (
              <div className="h-10 w-10 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                <img src={tenant.logo_url} alt={tenant.name} className="h-9 w-9 object-contain" />
              </div>
            ) : (
              <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-black text-xl shrink-0" style={{ backgroundColor: primary }}>
                {tenant.name.charAt(0)}
              </div>
            )}
            <div>
              <p className="font-bold text-slate-900 leading-tight">{tenant.name}</p>
              {tenant.address && <p className="text-xs text-slate-500 flex items-center gap-0.5"><MapPin className="h-3 w-3" /> {tenant.address}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentUser ? (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <User className="h-3.5 w-3.5" />
                <span className="hidden sm:inline truncate max-w-[120px]">{currentUser.email}</span>
              </div>
            ) : (
              <button onClick={() => setAuthOpen(true)} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50">
                <LogIn className="h-3.5 w-3.5" /> Belépés
              </button>
            )}

            <button
              onClick={() => cartCount > 0 ? setCartOpen(true) : null}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-opacity ${cartCount === 0 ? 'opacity-40 cursor-default' : 'hover:opacity-90'}`}
              style={{ backgroundColor: primary }}
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Kosár</span>
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center font-bold">{cartCount}</span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Hero band */}
      <div className="py-10 px-4" style={{ background: `linear-gradient(135deg, ${primary}15 0%, ${primary}06 100%)` }}>
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-1">{tenant.name}</h1>
          <p className="text-slate-500 text-sm mb-3">Online rendelés</p>
          <div className="flex flex-wrap gap-4 text-sm text-slate-500">
            {tenant.address && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{tenant.address}</span>}
            {tenant.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{tenant.phone}</span>}
          </div>
          {minOrder > 0 && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
              <AlertCircle className="h-3.5 w-3.5" />
              Minimum rendelési összeg: <strong>{minOrder.toLocaleString('hu-HU')} Ft</strong>
            </div>
          )}
        </div>
      </div>

      {/* Category tabs */}
      <div className="sticky top-16 z-30 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex gap-1 py-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {[{ id: 'all', name: 'Összes' }, ...categories].map((cat) => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                className="px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all"
                style={activeCategory === cat.id ? { backgroundColor: primary, color: '#fff' } : { backgroundColor: 'transparent', color: '#64748b' }}>
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {menuItems.length === 0 ? (
          <div className="text-center py-20">
            <Package className="h-14 w-14 mx-auto text-slate-300 mb-4" />
            <h2 className="text-xl font-semibold text-slate-700 mb-2">A menü hamarosan elérhető</h2>
            <p className="text-slate-400 text-sm">Ez az étterem még nem töltötte fel az ételeket.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {categories.map((cat) => {
              const items = byCategory[cat.id] || [];
              if (!items.length) return null;
              return (
                <div key={cat.id}>
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-1 h-5 rounded-full" style={{ backgroundColor: primary }} />
                    <h2 className="text-lg font-bold text-slate-900">{cat.name}</h2>
                    <span className="text-sm text-slate-400">{items.length} tétel</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((item) => <MenuCard key={item.id} item={item} primary={primary} onAdd={addToCart} />)}
                  </div>
                </div>
              );
            })}
            {uncategorized.length > 0 && (
              <div>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-1 h-5 rounded-full bg-slate-300" />
                  <h2 className="text-lg font-bold text-slate-900">Egyéb tételek</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {uncategorized.map((item) => <MenuCard key={item.id} item={item} primary={primary} onAdd={addToCart} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Mobile floating cart */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 left-4 right-4 md:hidden z-50">
          <button onClick={() => setCartOpen(true)}
            className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl text-white font-semibold shadow-xl" style={{ backgroundColor: primary }}>
            <span className="flex items-center gap-2"><ShoppingCart className="h-4 w-4" />{cartCount} tétel</span>
            <span className="flex items-center gap-1">{cartTotal.toLocaleString('hu-HU')} Ft <ChevronRight className="h-4 w-4" /></span>
          </button>
        </div>
      )}

      {/* Cart sheet */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent className="w-full sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" /> Rendelésed</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col flex-1 min-h-0 mt-4">
            <ScrollArea className="flex-1">
              {cart.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">A kosarad üres</p>
                </div>
              ) : (
                <div className="space-y-3 pr-1">
                  {cart.map((cartItem) => (
                    <div key={cartItem.item.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 text-sm truncate">{cartItem.item.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{Number(cartItem.item.price).toLocaleString('hu-HU')} Ft / db</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => updateQty(cartItem.item.id, -1)} className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-100"><Minus className="h-3 w-3" /></button>
                        <span className="w-5 text-center text-sm font-semibold">{cartItem.quantity}</span>
                        <button onClick={() => updateQty(cartItem.item.id, 1)} className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-100"><Plus className="h-3 w-3" /></button>
                        <button onClick={() => setCart((p) => p.filter((c) => c.item.id !== cartItem.item.id))} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 ml-1"><Trash2 className="h-3 w-3 text-red-400" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {cart.length > 0 && (
              <div className="border-t border-slate-200 pt-4 mt-4 space-y-3">
                {minOrder > 0 && cartTotal < minOrder && (
                  <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    Még {(minOrder - cartTotal).toLocaleString('hu-HU')} Ft hiányzik a minimumhoz
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Összesen</span>
                  <span className="text-xl font-bold text-slate-900">{cartTotal.toLocaleString('hu-HU')} Ft</span>
                </div>
                {!currentUser && (
                  <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                    <LogIn className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    A rendelés leadásához bejelentkezés szükséges.
                  </div>
                )}
                <button
                  className="w-full py-3 rounded-xl text-white font-semibold text-base transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: primary }}
                  disabled={minOrder > 0 && cartTotal < minOrder}
                  onClick={handleCheckout}
                >
                  {!currentUser ? 'Bejelentkezés és rendelés →' : 'Rendelés leadása →'}
                </button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Auth modal */}
      <Dialog open={authOpen} onOpenChange={setAuthOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5" style={{ color: primary }} />
              Bejelentkezés a rendeléshez
            </DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="login" className="mt-2">
            <TabsList className="w-full">
              <TabsTrigger value="login" className="flex-1">Bejelentkezés</TabsTrigger>
              <TabsTrigger value="register" className="flex-1">Regisztráció</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-3 mt-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Email cím</Label>
                  <Input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="te@email.hu" required className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Jelszó</Label>
                  <Input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="••••••••" required className="rounded-xl" />
                </div>
                <button type="submit" disabled={authLoading}
                  className="w-full py-2.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 mt-2"
                  style={{ backgroundColor: primary }}>
                  {authLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Bejelentkezés'}
                </button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-3 mt-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Teljes név <span className="text-red-500">*</span></Label>
                  <Input value={authName} onChange={(e) => setAuthName(e.target.value)} placeholder="Nagy Péter" required className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Email cím <span className="text-red-500">*</span></Label>
                  <Input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="te@email.hu" required className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Telefonszám</Label>
                  <Input value={authPhone} onChange={(e) => setAuthPhone(e.target.value)} placeholder="+36 30 123 4567" className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Jelszó <span className="text-red-500">*</span></Label>
                  <Input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="Min. 6 karakter" required minLength={6} className="rounded-xl" />
                </div>
                <button type="submit" disabled={authLoading}
                  className="w-full py-2.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 mt-2"
                  style={{ backgroundColor: primary }}>
                  {authLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Regisztráció és rendelés'}
                </button>
              </form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Order dialog */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rendelési adatok</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleOrder} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-2">
              {(['takeaway', 'delivery'] as const).map((type) => (
                <button key={type} type="button" onClick={() => setOrderType(type)}
                  className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${orderType === type ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  {type === 'takeaway' ? '🛍 Elvitel' : '🚗 Szállítás'}
                </button>
              ))}
            </div>

            {orderType === 'delivery' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Szállítási cím <span className="text-red-500">*</span></Label>
                <Input value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} placeholder="Budapest, Fő utca 1." required className="rounded-xl" />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Megjegyzés</Label>
              <Textarea value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} placeholder="Allergiák, különleges kérések..." rows={2} className="rounded-xl resize-none" />
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <div className="flex justify-between text-sm font-semibold text-slate-900">
                <span>{cartCount} tétel</span>
                <span>{cartTotal.toLocaleString('hu-HU')} Ft</span>
              </div>
              {currentUser && <p className="text-xs text-slate-400 mt-1">{currentUser.email}</p>}
            </div>

            <button type="submit" disabled={submitting}
              className="w-full py-3 rounded-xl text-white font-bold text-base flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: primary }}>
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Küldés...</> : 'Rendelés elküldése'}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MenuCard({ item, primary, onAdd }: { item: MenuItem; primary: string; onAdd: (item: MenuItem) => void }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
      {item.image_url ? (
        <div className="aspect-[16/9] overflow-hidden bg-slate-100">
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
        </div>
      ) : (
        <div className="aspect-[16/9] bg-slate-100 flex items-center justify-center">
          <Utensils className="h-8 w-8 text-slate-300" />
        </div>
      )}
      <div className="p-4">
        <h3 className="font-semibold text-slate-900">{item.name}</h3>
        {item.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{item.description}</p>}
        {item.preparation_time_minutes ? (
          <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1"><Clock className="h-3 w-3" /> {item.preparation_time_minutes} perc</p>
        ) : null}
        <div className="flex items-center justify-between mt-3">
          <span className="text-lg font-bold" style={{ color: primary }}>{Number(item.price).toLocaleString('hu-HU')} Ft</span>
          <button onClick={() => onAdd(item)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: primary }}>
            <Plus className="h-3.5 w-3.5" /> Kosárba
          </button>
        </div>
      </div>
    </div>
  );
}
