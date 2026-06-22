'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Search,
  Clock,
  CheckCircle,
  Package,
  ChefHat,
  XCircle,
  RefreshCw,
  Phone,
  Bell,
  BellOff,
  User,
  Plus,
  Minus,
  MapPin,
  CreditCard,
  Tag,
  ShoppingBag,
  Check,
  Trash2,
  UtensilsCrossed,
  ArrowRight,
  ClipboardList
} from 'lucide-react';
import { supabase, Order, OrderItem, MenuItem, MenuCategory } from '@/lib/supabase/client';
import { toast } from 'sonner';

function playNewOrderSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
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
  customer: { name: string | null; phone: string | null; id?: string } | null;
};

const orderStatuses = [
  { value: 'pending', label: 'Új', icon: Clock, color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { value: 'confirmed', label: 'Elfogadva', icon: CheckCircle, color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'preparing', label: 'Konyhában', icon: ChefHat, color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { value: 'ready', label: 'Kész', icon: Package, color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { value: 'delivered', label: 'Lezárva', icon: CheckCircle, color: 'bg-slate-100 text-slate-800 border-slate-200' },
  { value: 'cancelled', label: 'Sztornó', icon: XCircle, color: 'bg-rose-100 text-rose-800 border-rose-200' },
];

export default function OrdersPage() {
  // Navigation / Tabs
  const [currentTab, setCurrentTab] = useState<'board' | 'phone'>('board');

  // Tenant / Restaurant Settings state
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [restaurantSettings, setRestaurantSettings] = useState<any>(null);

  // Orders Board state
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const knownOrderIds = useRef<Set<string>>(new Set());
  const initialLoad = useRef(true);

  // Phone Order Stepper state
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Customer Info
  const [custPhone, setCustPhone] = useState('');
  const [custFirstName, setCustFirstName] = useState('');
  const [custLastName, setCustLastName] = useState('');
  const [custNote, setCustNote] = useState('');
  const [addressType, setAddressType] = useState<'delivery' | 'takeaway' | 'dine_in'>('delivery');
  
  // Courier / Delivery Address fields
  const [addrCity, setAddrCity] = useState('');
  const [addrStreet, setAddrStreet] = useState('');
  const [addrHouseNumber, setAddrHouseNumber] = useState('');
  const [addrFloor, setAddrFloor] = useState('');
  const [addrDoor, setAddrDoor] = useState('');
  const [addrBell, setAddrBell] = useState('');
  const [addrNote, setAddrNote] = useState('');
  const [tableNumber, setTableNumber] = useState('');

  // Customer search list
  const [searchedCustomers, setSearchedCustomers] = useState<any[]>([]);

  // Step 2: Product Selector
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [productSearch, setProductSearch] = useState('');
  
  // Cart state
  const [cart, setCart] = useState<{ item: MenuItem; quantity: number; notes: string }[]>([]);

  // Step 3: Payment
  const [paymentMethod, setPaymentMethod] = useState<'Készpénz' | 'Bankkártya' | 'SZÉP Kártya'>('Készpénz');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [generalOrderNote, setGeneralOrderNote] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Real-time dynamic phone search for existing customers
  useEffect(() => {
    if (custPhone.trim().length >= 3) {
      const fetchCustomers = async () => {
        const { data } = await supabase
          .from('customers')
          .select('*')
          .ilike('phone', `%${custPhone}%`)
          .limit(5);
        setSearchedCustomers(data || []);
      };
      fetchCustomers();
    } else {
      setSearchedCustomers([]);
    }
  }, [custPhone]);

  // Handle auto-populating custom fields when customer is selected
  const handleSelectCustomer = (c: any) => {
    const spaceIndex = c.name ? c.name.indexOf(' ') : -1;
    if (spaceIndex !== -1) {
      setCustLastName(c.name.substring(0, spaceIndex));
      setCustFirstName(c.name.substring(spaceIndex + 1));
    } else {
      setCustFirstName(c.name || '');
      setCustLastName('');
    }
    setCustPhone(c.phone || '');
    setCustNote(c.loyalty_points ? `Hűségpontok: ${c.loyalty_points}` : '');
    setSearchedCustomers([]);
    toast.success(`Ügyfél beolvasva: ${c.name}`);
  };

  const loadTenantAndSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData, error: userErr } = await supabase
          .from('users')
          .select('tenant_id, tenant:tenants(*)')
          .eq('id', user.id)
          .single();

        if (userData?.tenant_id) {
          setTenantId(userData.tenant_id);
          const t = Array.isArray(userData.tenant) ? userData.tenant[0] : userData.tenant;
          if (t) {
            setRestaurantSettings(t);
            // Default address city from restaurant city if available
            if (t.address && t.address.includes(',')) {
              const matchedParts = t.address.split(',');
              if (matchedParts.length > 0) {
                setAddrCity(matchedParts[0].trim());
              }
            } else if (t.address) {
              setAddrCity(t.address.substring(0, 15).trim());
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadOrders = useCallback(async (triggerSound = false) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*, menu_item:menu_items(*)), customer:customers(name, phone, id)')
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

  // Load categories and items for step 2
  const loadMenuData = async () => {
    if (!tenantId) return;
    setLoadingProducts(true);
    try {
      const [{ data: cats }, { data: items }] = await Promise.all([
        supabase.from('menu_categories').select('*').order('display_order'),
        supabase.from('menu_items').select('*').eq('is_available', true).order('display_order'),
      ]);
      setCategories(cats || []);
      setMenuItems(items || []);
    } catch {
      toast.error('Hiba a termékek betöltésekor');
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    loadTenantAndSettings();
  }, []);

  useEffect(() => {
    if (tenantId) {
      loadOrders(false);
      loadMenuData();

      const channel = supabase
        .channel('orders-realtime-pos')
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
    }
  }, [tenantId, loadOrders]);

  async function updateOrderStatus(orderId: string, newStatus: string) {
    setUpdating(orderId);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      const statusLabel = orderStatuses.find((s) => s.value === newStatus)?.label || newStatus;
      toast.success(`Rendelés státusza frissítve: ${statusLabel}`);
      loadOrders();
    } catch (error) {
      console.error(error);
      toast.error('Nem sikerült frissíteni a státuszt');
    } finally {
      setUpdating(null);
    }
  }

  // Cart operations
  const addToCart = (product: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((x) => x.item.id === product.id);
      if (existing) {
        return prev.map((x) => x.item.id === product.id ? { ...x, quantity: x.quantity + 1 } : x);
      }
      return [...prev, { item: product, quantity: 1, notes: '' }];
    });
    toast.success(`${product.name} kosárhoz adva`);
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((x) => {
          if (x.item.id === productId) {
            const newQty = x.quantity + delta;
            return { ...x, quantity: newQty };
          }
          return x;
        })
        .filter((x) => x.quantity > 0);
    });
  };

  const updateItemNote = (productId: string, notes: string) => {
    setCart((prev) => prev.map((x) => x.item.id === productId ? { ...x, notes } : x));
  };

  // Calculations
  const cartSubtotal = cart.reduce((acc, x) => acc + Number(x.item.price) * x.quantity, 0);
  const deliveryFee = addressType === 'delivery' && restaurantSettings?.settings?.delivery_fee ? Number(restaurantSettings.settings.delivery_fee) : 0;
  
  // Discounts & Coupons
  const discountVal = discountPercent > 0 ? (cartSubtotal * discountPercent) / 100 : discountAmount;
  const totalAmount = Math.max(0, cartSubtotal + deliveryFee - discountVal);

  const applyCoupon = () => {
    if (!couponCode.trim()) {
      toast.error('Kérjük adj meg egy kuponkódot');
      return;
    }
    // Simple custom promo logic
    if (couponCode.toUpperCase() === 'PROMO10' || couponCode.toUpperCase() === 'SYORDER10') {
      setDiscountPercent(10);
      setDiscountAmount(0);
      setCouponApplied(true);
      toast.success('10%-os kuponkód sikeresen érvényesítve!');
    } else if (couponCode.toUpperCase() === 'FREE500') {
      setDiscountAmount(500);
      setDiscountPercent(0);
      setCouponApplied(true);
      toast.success('500 Ft-os fix kuponkód sikeresen érvényesítve!');
    } else {
      toast.error('Érvénytelen vagy lejárt kuponkód!');
    }
  };

  // Submit whole order
  const handleCreatePhoneOrder = async () => {
    if (cart.length === 0) {
      toast.error('A kosár üres!');
      return;
    }
    if (!custPhone.trim() || !custFirstName.trim()) {
      toast.error('A telefonszám és a név kitöltése kötelező!');
      setStep(1);
      return;
    }
    if (addressType === 'delivery' && (!addrStreet.trim() || !addrHouseNumber.trim())) {
      toast.error('A szállítási utca és a házszám kötelező!');
      setStep(1);
      return;
    }

    setSubmittingOrder(true);
    try {
      // 1. Manage customer record
      let customerId: string | null = null;
      const fullCustomerName = `${custLastName.trim()} ${custFirstName.trim()}`.trim();
      
      // Look up customer by phone
      const { data: existingCust } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', custPhone.trim())
        .maybeSingle();

      if (existingCust) {
        customerId = existingCust.id;
        // Optionally update details
        await supabase
          .from('customers')
          .update({ name: fullCustomerName, updated_at: new Date().toISOString() })
          .eq('id', existingCust.id);
      } else {
        // Insert new customer record
        const { data: newCust, error: custErr } = await supabase
          .from('customers')
          .insert({
            tenant_id: tenantId,
            phone: custPhone.trim(),
            name: fullCustomerName,
          })
          .select()
          .single();

        if (custErr) throw custErr;
        customerId = newCust.id;
      }

      // 2. Build structured address notes
      let finalNoteSegments = [];
      if (addressType === 'delivery') {
        const fullAddr = `CÍM: ${addrCity || 'Pécs'}, ${addrStreet} ${addrHouseNumber}.${addrFloor ? ` Emelet: ${addrFloor}.` : ''}${addrDoor ? ` Ajtó: ${addrDoor}.` : ''}${addrBell ? ` Csengő: ${addrBell}.` : ''}`;
        finalNoteSegments.push(fullAddr);
        if (addrNote.trim()) {
          finalNoteSegments.push(`Megjegyzés futárnak: ${addrNote.trim()}`);
        }
      } else if (addressType === 'dine_in') {
        finalNoteSegments.push(`ASZTAL: ${tableNumber || 'Pult'}`);
      } else {
        finalNoteSegments.push('TÍPUS: ELVITEL (Személyes átvétel)');
      }

      if (generalOrderNote.trim()) {
        finalNoteSegments.push(`Rendelés megjegyzés: ${generalOrderNote.trim()}`);
      }

      const orderNotesString = finalNoteSegments.join(' | ');

      // Generate order number
      const orderNum = 'T' + Math.floor(1000 + Math.random() * 9000).toString();

      // 3. Create the order
      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .insert({
          tenant_id: tenantId,
          customer_id: customerId,
          order_number: orderNum,
          status: 'pending',
          order_type: addressType === 'delivery' ? 'delivery' : addressType === 'takeaway' ? 'takeaway' : 'dine-in',
          table_number: addressType === 'dine_in' ? tableNumber : null,
          subtotal: cartSubtotal,
          tax: 0,
          discount: discountVal,
          total: totalAmount,
          notes: orderNotesString,
        })
        .select()
        .single();

      if (orderErr) throw orderErr;

      // 4. Create order items
      const orderItemsToInsert = cart.map((x) => ({
        tenant_id: tenantId,
        order_id: orderData.id,
        menu_item_id: x.item.id,
        quantity: x.quantity,
        unit_price: x.item.price,
        total_price: Number(x.item.price) * x.quantity,
        notes: x.notes || null,
      }));

      const { error: itemsErr } = await supabase.from('order_items').insert(orderItemsToInsert);
      if (itemsErr) throw itemsErr;

      toast.success(`Telefonos rendelés sikeresen felvéve! Rendelésszám: #${orderNum}`);
      
      // Reset the POS flow state
      setCart([]);
      setCustPhone('');
      setCustFirstName('');
      setCustLastName('');
      setCustNote('');
      setAddrStreet('');
      setAddrHouseNumber('');
      setAddrFloor('');
      setAddrDoor('');
      setAddrBell('');
      setAddrNote('');
      setTableNumber('');
      setDiscountPercent(0);
      setDiscountAmount(0);
      setCouponCode('');
      setCouponApplied(false);
      setGeneralOrderNote('');
      setStep(1);

      // Return to real-time order board
      setCurrentTab('board');
      loadOrders();

    } catch (e: any) {
      console.error(e);
      toast.error('Nem sikerült elmenteni a rendelést: ' + (e.message || 'Hiba'));
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Split active/past orders for column render
  const filteredActiveOrders = orders.filter((order) => {
    const matchesMatch = order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (order.notes && order.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesMatch;
  });

  const columns = {
    new: filteredActiveOrders.filter((o) => o.status === 'pending' || o.status === 'confirmed'),
    preparing: filteredActiveOrders.filter((o) => o.status === 'preparing' || o.status === 'ready'),
    completed: filteredActiveOrders.filter((o) => o.status === 'delivered' || o.status === 'cancelled'),
  };

  const getHungarianStatus = (status: string) => {
    switch (status) {
      case 'pending': return 'Új rendelés';
      case 'confirmed': return 'Elfogadva';
      case 'preparing': return 'Készül';
      case 'ready': return 'Kész / Futárra vár';
      case 'delivered': return 'Kiszállítva (Lezárva)';
      case 'cancelled': return 'Sztornózva';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Upper Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 flex items-center justify-center bg-slate-900 rounded-xl text-white">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900">POS2 · Érintőképernyős Értékesítés</h1>
              <p className="text-xs text-slate-500 font-medium">Automatikus valós idejű szinkronizáció</p>
            </div>
          </div>
        </div>

        {/* Navigation Selector Tabs */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
            <Button
              variant={currentTab === 'board' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentTab('board')}
              className={`rounded-lg gap-2 text-xs font-semibold px-4 py-2 ${currentTab === 'board' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50 hover:bg-white' : 'text-slate-600 hover:bg-slate-200/50'}`}
            >
              <UtensilsCrossed className="h-3.5 w-3.5" />
              RENDELŐTÁBLA (Kanban)
            </Button>
            <Button
              variant={currentTab === 'phone' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentTab('phone')}
              className={`rounded-lg gap-2 text-xs font-semibold px-4 py-2 ${currentTab === 'phone' ? 'bg-slate-900 text-white shadow-sm hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-200/50'}`}
            >
              <Phone className="h-3.5 w-3.5 animate-pulse" />
              TELEFONOS RENDELÉSFELVÉTEL
            </Button>
          </div>

          <div className="h-6 w-[1px] bg-slate-200 mx-1 hidden sm:block" />

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSoundEnabled((v) => !v)}
              className={`h-9 rounded-xl border px-3 text-xs gap-1.5 font-semibold transition-all ${soundEnabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'text-slate-400 hover:bg-slate-50'}`}
              title={soundEnabled ? 'Hangjelzés Be' : 'Hangjelzés Ki'}
            >
              {soundEnabled ? <Bell className="h-3.5 w-3.5 text-emerald-600" /> : <BellOff className="h-3.5 w-3.5" />}
              {soundEnabled ? 'Hang Be' : 'Hang Ki'}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadOrders(false)}
              className="h-9 rounded-xl text-xs gap-1.5 font-semibold bg-white"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Frissít
            </Button>
          </div>
        </div>
      </div>

      {/* RENDER VIEW 1: RENDELÉSEK KANBAN TÁBLA */}
      {currentTab === 'board' && (
        <div className="space-y-4">
          {/* Filtering bar for active board */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Keress rendelésszám, név, vagy szállítási cím alapján..."
              className="pl-9 h-11 bg-white rounded-xl border-slate-200 text-sm shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center min-h-[450px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* COL 1: ÚJ BEÉRKEZŐ RENDELÉSEK */}
              <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl flex flex-col min-h-[600px] shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping" />
                    <span className="font-extrabold text-slate-800 text-sm tracking-tight">ÚJ / ELFOGADOTT</span>
                  </div>
                  <Badge className="bg-amber-100 text-amber-900 border-amber-200 font-semibold">{columns.new.length} db</Badge>
                </div>

                <ScrollArea className="flex-1">
                  <div className="space-y-3.5">
                    {columns.new.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 text-xs">Nincs aktív új rendelés</div>
                    ) : (
                      columns.new.map((order) => {
                        const ageMinutes = Math.floor((new Date().getTime() - new Date(order.created_at).getTime()) / 60000);
                        return (
                          <div key={order.id} className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm space-y-3 relative hover:shadow transition-shadow">
                            {/* Card badge header */}
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-slate-900 text-base">#{order.order_number}</span>
                              <div className="flex items-center gap-1 text-slate-400 text-[10px] font-bold">
                                <Clock className="h-3 w-3" />
                                <span>{ageMinutes <= 0 ? 'Épp most' : `${ageMinutes} perce`}</span>
                              </div>
                            </div>

                            {/* Customer information */}
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                                <User className="h-3.5 w-3.5 text-slate-400" />
                                <span>{order.customer?.name || 'Vendég'}</span>
                              </div>
                              {order.customer?.phone && (
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                                  <span>{order.customer.phone}</span>
                                </div>
                              )}
                              
                              {/* Order Type badge */}
                              <div className="pt-1">
                                {order.order_type === 'delivery' ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-sky-100 text-sky-800 tracking-wider">Házhozszállítás</span>
                                ) : order.order_type === 'takeaway' ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800 tracking-wider">Elviteles</span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 tracking-wider">Helyben: asztal #{order.table_number || 'Pult'}</span>
                                )}
                              </div>
                            </div>

                            {/* Order items inside card */}
                            <div className="bg-slate-50 p-2.5 rounded-lg space-y-1 border border-slate-100">
                              {order.order_items.map((it) => (
                                <div key={it.id} className="flex justify-between items-start text-xs font-semibold text-slate-800">
                                  <span>{it.quantity}x {it.menu_item?.name || 'Egyéb tétel'}</span>
                                  <span className="text-slate-500 font-mono text-[11px] shrink-0">{Number(it.total_price).toLocaleString('hu-HU')} Ft</span>
                                </div>
                              ))}
                              {order.notes && (
                                <div className="text-[10px] text-slate-500 italic mt-1 pt-1 border-t border-slate-200/50 leading-relaxed truncate-2" title={order.notes}>
                                  {order.notes}
                                </div>
                              )}
                            </div>

                            <div className="flex justify-between items-center pt-1">
                              <span className="text-[11px] font-bold text-slate-400">FIZETENDŐ</span>
                              <span className="text-sm font-extrabold text-slate-900 font-mono">{Number(order.total).toLocaleString('hu-HU')} Ft</span>
                            </div>

                            {/* State controls */}
                            <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                              {order.status === 'pending' && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => updateOrderStatus(order.id, 'confirmed')}
                                    className="flex-1 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg h-8"
                                  >
                                    Elfogad
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateOrderStatus(order.id, 'cancelled')}
                                    className="text-xs font-bold text-rose-600 border-rose-200 hover:bg-rose-50 rounded-lg h-8 px-2"
                                  >
                                    Töröl
                                  </Button>
                                </>
                              )}

                              {order.status === 'confirmed' && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => updateOrderStatus(order.id, 'preparing')}
                                    className="flex-1 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-lg h-8"
                                  >
                                    Konyhának küld
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateOrderStatus(order.id, 'cancelled')}
                                    className="text-xs font-bold text-rose-600 border-rose-200 hover:bg-rose-50 rounded-lg h-8 px-2"
                                  >
                                    Töröl
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* COL 2: KÉSZÍTÉS ALATT / ELKÉSZÜLT */}
              <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl flex flex-col min-h-[600px] shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-purple-500 rounded-full" />
                    <span className="font-extrabold text-slate-800 text-sm tracking-tight">KÉSZÍTÉS / KÉSZ</span>
                  </div>
                  <Badge className="bg-purple-100 text-purple-900 border-purple-200 font-semibold">{columns.preparing.length} db</Badge>
                </div>

                <ScrollArea className="flex-1">
                  <div className="space-y-3.5">
                    {columns.preparing.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 text-xs">Nincs folyamatban lévő készítés</div>
                    ) : (
                      columns.preparing.map((order) => {
                        const ageMinutes = Math.floor((new Date().getTime() - new Date(order.created_at).getTime()) / 60000);
                        return (
                          <div key={order.id} className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm space-y-3 hover:shadow transition-shadow">
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-slate-900 text-base">#{order.order_number}</span>
                              <div className="flex items-center gap-1">
                                {order.status === 'preparing' ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">Készül</span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" /> Kész
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Customer info */}
                            <div className="space-y-1">
                              <div className="text-xs font-semibold text-slate-700">{order.customer?.name || 'Vendég'}</div>
                              {order.customer?.phone && <div className="text-xs text-slate-500 font-medium">{order.customer.phone}</div>}
                              <div className="pt-0.5">
                                {order.order_type === 'delivery' ? (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-sky-50 text-sky-800">Házhozszállítás</span>
                                ) : order.order_type === 'takeaway' ? (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-50 text-amber-800">Elvitel</span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-50 text-emerald-800">Asztal #{order.table_number || 'Pult'}</span>
                                )}
                              </div>
                            </div>

                            {/* Items details */}
                            <div className="bg-slate-50 p-2.5 rounded-lg space-y-1 border border-slate-100">
                              {order.order_items.map((it) => (
                                <div key={it.id} className="flex justify-between items-start text-xs font-semibold text-slate-800">
                                  <span>{it.quantity}x {it.menu_item?.name || 'Egyéb tétel'}</span>
                                </div>
                              ))}
                              {order.notes && (
                                <div className="text-[10px] text-slate-500 italic mt-0.5 pt-0.5 border-t border-slate-200/50 whitespace-pre-wrap leading-relaxed">
                                  {order.notes}
                                </div>
                              )}
                            </div>

                            <div className="flex justify-between items-center pt-1">
                              <span className="text-[11px] font-bold text-slate-400">FIZETENDŐ</span>
                              <span className="text-sm font-extrabold text-slate-900 font-mono">{Number(order.total).toLocaleString('hu-HU')} Ft</span>
                            </div>

                            {/* Action buttons */}
                            <div className="pt-2 border-t border-slate-100">
                              {order.status === 'preparing' ? (
                                <Button
                                  size="sm"
                                  onClick={() => updateOrderStatus(order.id, 'ready')}
                                  className="w-full text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg h-8"
                                >
                                  Készre jelentés
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => updateOrderStatus(order.id, 'delivered')}
                                  className="w-full text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg h-8"
                                >
                                  Rendelés Lezárása / Kézbesítve
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* COL 3: LEZÁRT / SZTORNÓZOTT RENDELÉSEK */}
              <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl flex flex-col min-h-[600px] shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-slate-400 rounded-full" />
                    <span className="font-extrabold text-slate-800 text-sm tracking-tight">LEZÁRT / SZTORNÓ</span>
                  </div>
                  <Badge className="bg-slate-200 text-slate-700 font-semibold">{columns.completed.length} db</Badge>
                </div>

                <ScrollArea className="flex-1">
                  <div className="space-y-3.5">
                    {columns.completed.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 text-xs">Nincs lezárt rendelés a listában</div>
                    ) : (
                      columns.completed.map((order) => (
                        <div key={order.id} className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm space-y-2.5 opacity-80 hover:opacity-100 transition-opacity">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-slate-800 text-sm">#{order.order_number}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${order.status === 'delivered' ? 'bg-slate-100 text-slate-700' : 'bg-rose-100 text-rose-700'}`}>
                              {order.status === 'delivered' ? 'Lezárva' : 'Sztornó'}
                            </span>
                          </div>

                          <div className="text-xs text-slate-500 font-medium">
                            <div className="font-semibold text-slate-700">{order.customer?.name || 'Vendég'}</div>
                            <div>{new Date(order.created_at).toLocaleString('hu-HU', { hour: '2-digit', minute: '2-digit' })}</div>
                          </div>

                          <div className="bg-slate-50 p-2 rounded-lg text-xs text-slate-600">
                            {order.order_items.map((it) => (
                              <div key={it.id} className="flex justify-between items-center">
                                <span>{it.quantity}x {it.menu_item?.name || 'Egyéb'}</span>
                              </div>
                            ))}
                          </div>

                          <div className="flex justify-between items-center text-xs pt-1">
                            <span className="font-semibold text-slate-400">VÉGÖSSZEG</span>
                            <span className="font-extrabold text-slate-800">{Number(order.total).toLocaleString('hu-HU')} Ft</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </div>
      )}

      {/* RENDER VIEW 2: TELEFONOS RENDELÉSFELVÉTEL */}
      {currentTab === 'phone' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md grid grid-cols-1 xl:grid-cols-12 gap-8 relative overflow-hidden">
          {/* Main POS column left side: input flows (8 cols) */}
          <div className="xl:col-span-8 flex flex-col space-y-6">
            {/* Steps indicator banner */}
            <div className="flex items-center justify-between bg-slate-50 border border-slate-100 p-4 rounded-2xl sm:px-6">
              {[
                { number: 1, label: 'VÁSÁRLÓ & CÍM' },
                { number: 2, label: 'KOSÁR ÖSSZEÁLLÍTÁSA' },
                { number: 3, label: 'FIZETÉS & ÖSSZEGZÉS' }
              ].map((s) => (
                <div key={s.number} className="flex items-center gap-2">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center font-extrabold text-sm transition-colors ${step === s.number ? 'bg-slate-900 text-white' : step > s.number ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    {step > s.number ? <Check className="h-4 w-4" /> : s.number}
                  </div>
                  <span className={`text-[11px] sm:text-xs font-bold tracking-tight hidden md:inline ${step === s.number ? 'text-slate-900' : 'text-slate-400'}`}>{s.label}</span>
                </div>
              ))}
            </div>

            {/* STEP 1: CUSTOMER REGISTRATION */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">1. Vásárló & Szállítási adatok</h2>
                  <p className="text-xs text-slate-500 font-medium">Adj meg egy telefonszámot, és a rendszer kikeresi a korábbi adatokat.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
                  <div className="space-y-4">
                    <div className="space-y-1.5 relative">
                      <Label htmlFor="custPhone" className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
                        <Phone className="h-3 w-4 text-slate-400" />
                        TELEFONSZÁM <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        id="custPhone"
                        placeholder="Keresés pl: 06301234567"
                        className="h-11 rounded-xl text-sm border-slate-200 font-medium bg-slate-50/50 hover:bg-slate-50 focus:bg-white"
                        value={custPhone}
                        onChange={(e) => setCustPhone(e.target.value)}
                        required
                      />
                      {searchedCustomers.length > 0 && (
                        <div className="absolute left-0 right-0 top-18 bg-white border border-slate-200 rounded-xl shadow-lg z-40 divide-y divide-slate-100 overflow-hidden">
                          <p className="text-[10px] text-slate-400 bg-slate-50 px-3 py-1 font-bold">TALÁLT ÜGYFELEK (Kattints a beolvasáshoz)</p>
                          {searchedCustomers.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => handleSelectCustomer(c)}
                              className="w-full text-left px-3 py-2.5 text-xs hover:bg-slate-50 transition-colors flex justify-between font-semibold text-slate-800"
                            >
                              <span>{c.name}</span>
                              <span className="text-slate-500 font-mono">{c.phone}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="custLastName" className="text-xs font-extrabold text-slate-700">VEZETÉKNÉV</Label>
                        <Input
                          id="custLastName"
                          placeholder="Kovács"
                          className="h-11 rounded-xl text-sm border-slate-200"
                          value={custLastName}
                          onChange={(e) => setCustLastName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5 align-middle">
                        <Label htmlFor="custFirstName" className="text-xs font-extrabold text-slate-700">KERESZTNÉV <span className="text-rose-500">*</span></Label>
                        <Input
                          id="custFirstName"
                          placeholder="János"
                          className="h-11 rounded-xl text-sm border-slate-200"
                          value={custFirstName}
                          onChange={(e) => setCustFirstName(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="custNote" className="text-xs font-extrabold text-slate-700">BELSŐ JELZÉS / MEGJEGYZÉS AZ ÜGYFÉLHEZ</Label>
                      <Input
                        id="custNote"
                        placeholder="Pl. hűséges vendég, kényes a pontos szállításra"
                        className="h-11 rounded-xl text-xs border-slate-200"
                        value={custNote}
                        onChange={(e) => setCustNote(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Address Selection Type */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-extrabold text-slate-700">RENDELÉS JELLEGE</Label>
                      <div className="grid grid-cols-3 gap-2.5">
                        {[
                          { key: 'delivery', label: 'Házhoz', sub: 'Futár' },
                          { key: 'takeaway', label: 'Elvitel', sub: 'Személyes' },
                          { key: 'dine_in', label: 'Beülős', sub: 'Asztalszám' }
                        ].map((at) => (
                          <button
                            key={at.key}
                            type="button"
                            onClick={() => setAddressType(at.key as any)}
                            className={`flex flex-col items-center justify-center py-2.5 px-1.5 rounded-xl border font-bold text-xs transition-all ${addressType === at.key ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                          >
                            <span>{at.label}</span>
                            <span className="text-[9px] font-medium opacity-70">{at.sub}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Conditional Delivery Address Inputs */}
                    {addressType === 'delivery' && (
                      <div className="space-y-3.5 bg-slate-50/50 p-4 border border-slate-100 rounded-2xl">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-1.5 space-y-1">
                            <Label htmlFor="addrCity" className="text-[10px] font-extrabold text-slate-500 uppercase">TELEPÜLÉS</Label>
                            {/* Simple dynamic dropdown/input with Hungary cities configured in settings */}
                            <Input
                              id="addrCity"
                              placeholder="Pécs"
                              className="h-9 text-xs rounded-lg border-slate-200 bg-white"
                              value={addrCity}
                              onChange={(e) => setAddrCity(e.target.value)}
                            />
                          </div>
                          <div className="col-span-1.5 space-y-1">
                            <Label htmlFor="addrStreet" className="text-[10px] font-extrabold text-slate-500 uppercase">UTCA / KÖZTÉR <span className="text-rose-500">*</span></Label>
                            <Input
                              id="addrStreet"
                              placeholder="Fő utca"
                              className="h-9 text-xs rounded-lg border-slate-200 bg-white"
                              value={addrStreet}
                              onChange={(e) => setAddrStreet(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                          <div className="space-y-1">
                            <Label htmlFor="addrHouse" className="text-[10px] font-extrabold text-slate-500 uppercase">HÁZSZÁM <span className="text-rose-500">*</span></Label>
                            <Input
                              id="addrHouse"
                              placeholder="12/A"
                              className="h-9 text-xs rounded-lg border-slate-200 bg-white"
                              value={addrHouseNumber}
                              onChange={(e) => setAddrHouseNumber(e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="addrFloor" className="text-[10px] font-extrabold text-slate-500 uppercase">EMELET</Label>
                            <Input
                              id="addrFloor"
                              placeholder="2"
                              className="h-9 text-xs rounded-lg border-slate-200 bg-white"
                              value={addrFloor}
                              onChange={(e) => setAddrFloor(e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="addrDoor" className="text-[10px] font-extrabold text-slate-500 uppercase">AJTÓ</Label>
                            <Input
                              id="addrDoor"
                              placeholder="4"
                              className="h-9 text-xs rounded-lg border-slate-200 bg-white"
                              value={addrDoor}
                              onChange={(e) => setAddrDoor(e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="addrBell" className="text-[10px] font-extrabold text-slate-500 uppercase">CSENGŐ</Label>
                            <Input
                              id="addrBell"
                              placeholder="42"
                              className="h-9 text-xs rounded-lg border-slate-200 bg-white"
                              value={addrBell}
                              onChange={(e) => setAddrBell(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="addrNote" className="text-[10px] font-extrabold text-slate-500 uppercase">MEDJEGYZÉS FUTÁRNAK / KAPUKÓD</Label>
                          <Input
                            id="addrNote"
                            placeholder="Pl: Kapukód csillag 2046, a kapunál nyomd a kettes gombot"
                            className="h-9 text-xs rounded-lg border-slate-200 bg-white"
                            value={addrNote}
                            onChange={(e) => setAddrNote(e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {/* Conditional Dine-in Table number */}
                    {addressType === 'dine_in' && (
                      <div className="space-y-2 bg-slate-50 p-4 border border-slate-100 rounded-2xl">
                        <Label htmlFor="tableNumber" className="text-xs font-extrabold text-slate-700">ASZTALSZÁM / PULT HELY</Label>
                        <Input
                          id="tableNumber"
                          placeholder="Pl: 5-ös asztal"
                          className="h-11 rounded-xl text-sm border-slate-200 bg-white"
                          value={tableNumber}
                          onChange={(e) => setTableNumber(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={() => {
                      if (!custPhone.trim() || !custFirstName.trim()) {
                        toast.error('Kérjük töltsd ki a kötelező telefonszám és keresztnév mezőket!');
                        return;
                      }
                      setStep(2);
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold h-11 px-6 rounded-xl gap-2 text-xs"
                  >
                    Tovább a Kosárhoz
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: CART SELECTION */}
            {step === 2 && (
              <div className="space-y-5 flex-1 flex flex-col">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">2. Termékek felvitele rendeléshez</h2>
                    <p className="text-xs text-slate-500 font-medium">Böngéssz kategóriák szerint vagy keress közvetlenül a menüben.</p>
                  </div>

                  {/* Filter / Search input inside STEP 2 */}
                  <div className="relative w-full sm:w-60">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      placeholder="Termék gyorskeresés..."
                      className="pl-8 h-9 text-xs rounded-xl"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                    />
                  </div>
                </div>

                {/* Categories Scroll bar */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 select-none">
                  <Button
                    variant={activeCategory === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveCategory('all')}
                    className={`rounded-xl px-4 py-1.5 text-xs font-bold shrink-0 ${activeCategory === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
                  >
                    ÖSSZES
                  </Button>
                  {categories.map((c) => (
                    <Button
                      key={c.id}
                      variant={activeCategory === c.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActiveCategory(c.id)}
                      className={`rounded-xl px-4 py-1.5 text-xs font-bold shrink-0 ${activeCategory === c.id ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
                    >
                      {c.name.toUpperCase()}
                    </Button>
                  ))}
                </div>

                {/* Product Grid Area */}
                {loadingProducts ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-800" />
                  </div>
                ) : (
                  <ScrollArea className="h-[360px] pr-2">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {menuItems
                        .filter((item) => activeCategory === 'all' || item.category_id === activeCategory)
                        .filter((item) => !productSearch.trim() || item.name.toLowerCase().includes(productSearch.toLowerCase()))
                        .map((item) => (
                          <div
                            key={item.id}
                            onClick={() => addToCart(item)}
                            className="bg-slate-50 border border-slate-200 hover:border-slate-300 hover:bg-slate-100/50 p-3 rounded-xl cursor-pointer transition-all flex flex-col justify-between h-28 select-none"
                          >
                            <div className="space-y-0.5">
                              <p className="font-extrabold text-slate-800 text-xs sm:text-sm line-clamp-2 leading-tight">{item.name}</p>
                              {item.description && <p className="text-[10px] text-slate-400 line-clamp-2 leading-snug">{item.description}</p>}
                            </div>
                            <div className="flex justify-between items-center pt-1 mt-auto">
                              <span className="text-[11px] font-extrabold text-slate-900 font-mono">{Number(item.price).toLocaleString('hu-HU')} Ft</span>
                              <div className="h-5 w-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">+</div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                )}

                <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-auto">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="border-slate-200 text-xs font-bold rounded-xl h-10 px-5 text-slate-600"
                  >
                    Vissza a Címhez
                  </Button>
                  
                  <Button
                    onClick={() => {
                      if (cart.length === 0) {
                        toast.error('Kérjük tegyél legalább egy terméket a kosárba!');
                        return;
                      }
                      setStep(3);
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold h-10 px-6 rounded-xl gap-2 text-xs"
                  >
                    Tovább a Fizetésre
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: PAYMENT & SUMMARY */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">3. Fizetési beállítások & Összegzés</h2>
                  <p className="text-xs text-slate-500 font-medium">Add meg a fizetési módot és alkalmazz kedvezményeket.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left block options */}
                  <div className="space-y-5">
                    {/* Payment Method selector */}
                    <div className="space-y-2">
                      <Label className="text-xs font-extrabold text-slate-700">FIZETÉSI MÓD</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { key: 'Készpénz', icon: ClipboardList },
                          { key: 'Bankkártya', icon: CreditCard },
                          { key: 'SZÉP Kártya', icon: Tag }
                        ].map((pm) => (
                          <button
                            key={pm.key}
                            type="button"
                            onClick={() => setPaymentMethod(pm.key as any)}
                            className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl border text-xs font-bold transition-all ${paymentMethod === pm.key ? 'bg-slate-900 border-slate-900 text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                          >
                            <pm.icon className="h-4 w-4 mb-2 opacity-80" />
                            <span>{pm.key}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Discounts configurations */}
                    <div className="space-y-3 bg-slate-50 p-4 border border-slate-100 rounded-2xl">
                      <span className="text-[11px] font-bold text-slate-700 block uppercase tracking-wider">Kedvezmények</span>
                      
                      <div className="grid grid-cols-2 gap-3.5">
                        <div className="space-y-1">
                          <Label htmlFor="discPct" className="text-[10px] text-slate-500 font-bold uppercase">KEDVEZMÉNY %</Label>
                          <Input
                            id="discPct"
                            type="number"
                            min="0"
                            max="100"
                            className="bg-white h-9 rounded-lg text-xs"
                            value={discountPercent}
                            onChange={(e) => {
                              setDiscountPercent(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)));
                              setDiscountAmount(0);
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="discAmt" className="text-[10px] text-slate-500 font-bold uppercase">FIX KEDVEZMÉNY (Ft)</Label>
                          <Input
                            id="discAmt"
                            type="number"
                            min="0"
                            className="bg-white h-9 rounded-lg text-xs"
                            value={discountAmount}
                            onChange={(e) => {
                              setDiscountAmount(Math.max(0, parseInt(e.target.value) || 0));
                              setDiscountPercent(0);
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Promotion Coupons */}
                    <div className="space-y-2">
                      <Label htmlFor="coupon" className="text-xs font-extrabold text-slate-700">KUPONKÓD ALKALMAZÁSA</Label>
                      <div className="flex gap-2">
                        <Input
                          id="coupon"
                          placeholder="Pl: PROMO10, FREE500"
                          className="h-10 rounded-xl text-xs uppercase"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          disabled={couponApplied}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={applyCoupon}
                          className="rounded-xl font-bold text-xs px-4 border"
                          disabled={couponApplied}
                        >
                          {couponApplied ? 'Érvényes!' : 'Aktivál'}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Right block details */}
                  <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-extrabold text-slate-700 block uppercase mb-3">Rendelés Összesítő</span>
                      
                      <div className="space-y-2.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Név & Telefonszám:</span>
                          <span className="font-bold text-slate-800 text-right">{custLastName} {custFirstName} ({custPhone})</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Típus:</span>
                          <span className="font-bold text-slate-800 uppercase text-right">
                            {addressType === 'delivery' ? `Házhozszállítás (${addrCity})` : addressType === 'dine_in' ? `Beülős (Asztal: ${tableNumber || 'Pult'})` : 'Személyes átvétel'}
                          </span>
                        </div>
                        
                        {addressType === 'delivery' && (
                          <div className="flex justify-between items-start">
                            <span className="text-slate-500">Szállítási cím:</span>
                            <span className="font-bold text-slate-800 max-w-[180px] text-right truncate text-[11px]">
                              {addrCity} {addrStreet} {addrHouseNumber}. {addrFloor ? `${addrFloor}e ` : ''}{addrDoor ? `${addrDoor}a` : ''}
                            </span>
                          </div>
                        )}
                        
                        <Separator className="my-1" />

                        <div className="flex justify-between text-slate-500">
                          <span>Köztük termékek részösszege:</span>
                          <span>{cartSubtotal.toLocaleString('hu-HU')} Ft</span>
                        </div>
                        {deliveryFee > 0 && (
                          <div className="flex justify-between text-slate-500">
                            <span>Szállítási díj:</span>
                            <span>{deliveryFee.toLocaleString('hu-HU')} Ft</span>
                          </div>
                        )}
                        {discountVal > 0 && (
                          <div className="flex justify-between text-rose-600 font-semibold">
                            <span>Alkalmazott kedvezmény:</span>
                            <span>-{discountVal.toLocaleString('hu-HU')} Ft</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-200 mt-4">
                      <div className="space-y-2.5">
                        <Label htmlFor="orderGeneralNote" className="text-[10px] font-bold text-slate-400 uppercase">ÁLTALÁNOS RENDELÉSI MEGJEGYZÉS (Pl: kapualj kódja)</Label>
                        <Textarea
                          id="orderGeneralNote"
                          placeholder="Ide beírhatsz egyéb rendelési részleteket vagy kéréseket..."
                          className="bg-white text-xs"
                          value={generalOrderNote}
                          onChange={(e) => setGeneralOrderNote(e.target.value)}
                          rows={2}
                        />
                      </div>

                      <div className="flex justify-between items-center mt-4">
                        <span className="text-sm font-black text-slate-950">VÉGSŐ FIZETENDŐ:</span>
                        <span className="text-xl font-black text-slate-900 font-mono">{totalAmount.toLocaleString('hu-HU')} Ft</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center border-t border-slate-100 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep(2)}
                    className="border-slate-200 text-xs font-bold rounded-xl h-10 px-5 text-slate-600"
                    disabled={submittingOrder}
                  >
                    Vissza a Kosárhoz
                  </Button>
                  
                  <Button
                    onClick={handleCreatePhoneOrder}
                    disabled={submittingOrder || cart.length === 0}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-8 rounded-xl gap-2 text-xs shadow-md shadow-emerald-100"
                  >
                    {submittingOrder ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Rögzítés folyamatban...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        NYUGTA GENERÁLÁSA (Rendelés leadása)
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right side PERSISTENT CART PANEL (4 cols) */}
          <div className="xl:col-span-4 bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col min-h-[500px] justify-between relative shadow-sm">
            <div>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
                <ShoppingBag className="h-4 w-4 text-slate-600" />
                <span className="font-extrabold text-slate-800 text-sm tracking-tight">KOSÁR TARTALMA</span>
              </div>

              <ScrollArea className="h-[360px] pr-1.5 select-none">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400 space-y-2">
                    <ShoppingBag className="h-10 w-10 opacity-30 animate-bounce" />
                    <span className="text-xs font-semibold">A kosár üres</span>
                    <span className="text-[10px] max-w-[170px]">Lépj a 2. pontra és válassz a termékeidből!</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map((x) => (
                      <div key={x.item.id} className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
                        <div className="flex justify-between items-start gap-1">
                          <div className="space-y-0.5">
                            <span className="text-xs font-extrabold text-slate-800">{x.item.name}</span>
                            <div className="text-[11px] font-mono text-slate-400">{Number(x.item.price).toLocaleString('hu-HU')} Ft / db</div>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => updateCartQty(x.item.id, -x.quantity)}
                            className="h-6 w-6 text-slate-400 hover:text-red-600 shrink-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        {/* Extra Topping / notes input as requested by screenshot detail fields */}
                        <div className="space-y-1">
                          <Input
                            placeholder="Módosító (pl: extra sajt, hagyma nélkül)"
                            value={x.notes}
                            onChange={(e) => updateItemNote(x.item.id, e.target.value)}
                            className="h-7 text-[10px] rounded bg-slate-50/50"
                          />
                        </div>

                        {/* Quantity Counter */}
                        <div className="flex justify-between items-center pt-1.5 border-t border-slate-100">
                          <span className="text-xs font-bold text-slate-500 font-mono">{(Number(x.item.price) * x.quantity).toLocaleString('hu-HU')} Ft</span>
                          
                          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => updateCartQty(x.item.id, -1)}
                              className="h-5 w-5 rounded-md hover:bg-slate-200 text-slate-600"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-xs font-extrabold text-slate-800 w-4 text-center">{x.quantity}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => updateCartQty(x.item.id, 1)}
                              className="h-5 w-5 rounded-md hover:bg-slate-200 text-slate-600"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Persistent Cart Summary inside POS stepper */}
            <div className="border-t border-slate-200 pt-3 mt-4">
              <div className="space-y-1.5 text-xs font-semibold">
                <div className="flex justify-between text-slate-500">
                  <span>Termékek:</span>
                  <span className="font-bold text-slate-800">{cartSubtotal.toLocaleString('hu-HU')} Ft</span>
                </div>
                {deliveryFee > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Szállítás:</span>
                    <span className="font-bold text-slate-800">{deliveryFee.toLocaleString('hu-HU')} Ft</span>
                  </div>
                )}
                {discountVal > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Kedvezmény:</span>
                    <span>-{discountVal.toLocaleString('hu-HU')} Ft</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-slate-900 border-t border-slate-100 pt-2">
                  <span>ÖSSZESEN:</span>
                  <span className="font-mono">{totalAmount.toLocaleString('hu-HU')} Ft</span>
                </div>
              </div>

              {step < 3 && cart.length > 0 && (
                <Button
                  onClick={() => setStep((s) => Math.min(3, s + 1) as any)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-10 rounded-xl mt-3.5 text-xs gap-1"
                >
                  Tovább a következő lépésre
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
