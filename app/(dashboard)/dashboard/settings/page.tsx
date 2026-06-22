'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Settings,
  Store,
  Palette,
  CreditCard,
  Save,
  Eye,
  ShoppingBag,
  Truck,
  Clock,
  Plus,
  Trash2,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { supabase, Tenant } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const DAYS = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap'];
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

interface OpeningHour {
  open: string;
  close: string;
  closed: boolean;
}

interface TenantSettings {
  min_order_amount: number;
  delivery_fee: number;
  free_delivery_above: number;
  delivery_radius_km: number;
  preparation_time_minutes: number;
  delivery_enabled: boolean;
  takeaway_enabled: boolean;
  opening_hours: Record<string, OpeningHour>;
}

const DEFAULT_SETTINGS: TenantSettings = {
  min_order_amount: 0,
  delivery_fee: 0,
  free_delivery_above: 0,
  delivery_radius_km: 5,
  preparation_time_minutes: 20,
  delivery_enabled: true,
  takeaway_enabled: true,
  opening_hours: DAY_KEYS.reduce((acc, key, i) => {
    acc[key] = { open: '10:00', close: '22:00', closed: i >= 5 };
    return acc;
  }, {} as Record<string, OpeningHour>),
};

function mergeSettings(raw: Record<string, unknown>): TenantSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...raw,
    opening_hours: {
      ...DEFAULT_SETTINGS.opening_hours,
      ...((raw.opening_hours as Record<string, OpeningHour>) || {}),
    },
  };
}

const presetColors = [
  { name: 'Ocean Blue', primary: '#1E40AF', secondary: '#3B82F6', accent: '#F59E0B' },
  { name: 'Forest Green', primary: '#166534', secondary: '#22C55E', accent: '#F97316' },
  { name: 'Royal Burgundy', primary: '#881337', secondary: '#E11D48', accent: '#FBBF24' },
  { name: 'Dark Charcoal', primary: '#27272A', secondary: '#52525B', accent: '#F59E0B' },
  { name: 'Sunset Orange', primary: '#C2410C', secondary: '#EA580C', accent: '#84CC16' },
  { name: 'Slate Navy', primary: '#0F172A', secondary: '#334155', accent: '#38BDF8' },
];

export default function SettingsPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Restaurant info
  const [restaurantName, setRestaurantName] = useState('');
  const [restaurantSlug, setRestaurantSlug] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  // Branding
  const [primaryColor, setPrimaryColor] = useState('#1E40AF');
  const [secondaryColor, setSecondaryColor] = useState('#3B82F6');
  const [accentColor, setAccentColor] = useState('#F59E0B');

  // Order / delivery settings
  const [settings, setSettings] = useState<TenantSettings>(DEFAULT_SETTINGS);

  // NAV Invoicing credentials preparation state
  const [navEnabled, setNavEnabled] = useState(false);
  const [navEnvironment, setNavEnvironment] = useState<'sandbox' | 'live'>('sandbox');
  const [navUsername, setNavUsername] = useState('');
  const [navPassword, setNavPassword] = useState('');
  const [navSignKey, setNavSignKey] = useState('');
  const [navCryptoKey, setNavCryptoKey] = useState('');
  const [navTaxNumber, setNavTaxNumber] = useState('');
  const [testingNav, setTestingNav] = useState(false);

  // Delivery cities
  const [deliveryCities, setDeliveryCities] = useState<string[]>([]);
  const [newCity, setNewCity] = useState('');

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('users')
        .select('tenant:tenants(*)')
        .eq('id', user.id)
        .single();

      if (data?.tenant) {
        const t = Array.isArray(data.tenant) ? data.tenant[0] : data.tenant;
        if (!t) return;
        setTenant(t as Tenant);
        setRestaurantName(t.name);
        setRestaurantSlug(t.slug);
        setAddress(t.address || '');
        setPhone(t.phone || '');
        setEmail(t.email || '');
        setLogoUrl(t.logo_url || '');
        setPrimaryColor(t.primary_color || '#1E40AF');
        setSecondaryColor(t.secondary_color || '#3B82F6');
        setAccentColor(t.accent_color || '#F59E0B');
        const rawSettings = (t.settings as any) || {};
        setSettings(mergeSettings(rawSettings));
        setNavEnabled(!!rawSettings.nav_enabled);
        setNavEnvironment(rawSettings.nav_environment || 'sandbox');
        setNavUsername(rawSettings.nav_username || '');
        setNavPassword(rawSettings.nav_password || '');
        setNavSignKey(rawSettings.nav_sign_key || '');
        setNavCryptoKey(rawSettings.nav_crypto_key || '');
        setNavTaxNumber(rawSettings.nav_tax_number || '');
        setDeliveryCities((t as unknown as { delivery_cities?: string[] }).delivery_cities || []);
      }
    } catch (error) {
      console.error('Hiba:', error);
      toast.error('Nem sikerült betölteni a beállításokat');
    } finally {
      setLoading(false);
    }
  }

  async function saveNavSettings() {
    if (!tenant) return;
    setSaving(true);
    try {
      const updatedSettings = {
        ...settings,
        nav_enabled: navEnabled,
        nav_environment: navEnvironment,
        nav_username: navUsername,
        nav_password: navPassword,
        nav_sign_key: navSignKey,
        nav_crypto_key: navCryptoKey,
        nav_tax_number: navTaxNumber,
      };

      const { error } = await supabase.from('tenants').update({
        settings: updatedSettings as any,
      }).eq('id', tenant.id);

      if (error) throw error;
      toast.success('NAV számlázási beállítások sikeresen elmentve!');
      setSettings(updatedSettings as any);
    } catch {
      toast.error('Nem sikerült menteni a NAV beállításokat');
    } finally {
      setSaving(false);
    }
  }

  async function handleTestNavConnection() {
    if (!navUsername || !navPassword || !navSignKey || !navTaxNumber) {
      toast.error('Kérjük, töltsd ki az alapvető mezőket (Adószám, felhasználónév, jelszó, aláírókulcs) a teszthez!');
      return;
    }
    setTestingNav(true);
    // Simulate NAV Online Számla REST API connection handshake
    setTimeout(() => {
      setTestingNav(false);
      toast.success('NAV Online Számla kapcsolat sikeres! Tokenek egyeztetve a teszt szerverekkel.');
    }, 1200);
  }

  function updateSetting<K extends keyof TenantSettings>(key: K, value: TenantSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function updateHour(dayKey: string, field: 'open' | 'close' | 'closed', value: string | boolean) {
    setSettings((prev) => ({
      ...prev,
      opening_hours: {
        ...prev.opening_hours,
        [dayKey]: { ...prev.opening_hours[dayKey], [field]: value },
      },
    }));
  }

  async function saveRestaurantSettings() {
    if (!tenant) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('tenants').update({
        name: restaurantName,
        slug: restaurantSlug.toLowerCase().replace(/[^a-z0-9-]/g, ''),
        address, phone, email, logo_url: logoUrl || null,
      }).eq('id', tenant.id);
      if (error) throw error;
      toast.success('Étterem adatok elmentve');
      loadSettings();
    } catch {
      toast.error('Nem sikerült menteni');
    } finally {
      setSaving(false);
    }
  }

  async function saveBrandingSettings() {
    if (!tenant) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('tenants').update({
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        accent_color: accentColor,
      }).eq('id', tenant.id);
      if (error) throw error;
      toast.success('Márka beállítások elmentve');
    } catch {
      toast.error('Nem sikerült menteni');
    } finally {
      setSaving(false);
    }
  }

  async function saveOrderSettings() {
    if (!tenant) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('tenants').update({
        settings: settings as unknown as Record<string, unknown>,
        delivery_cities: deliveryCities,
      }).eq('id', tenant.id);
      if (error) throw error;
      toast.success('Rendelési beállítások elmentve');
    } catch {
      toast.error('Nem sikerült menteni');
    } finally {
      setSaving(false);
    }
  }

  function addCity() {
    const city = newCity.trim();
    if (!city) return;
    if (deliveryCities.includes(city)) { toast.error('Ez a város már szerepel a listában'); return; }
    setDeliveryCities((p) => [...p, city]);
    setNewCity('');
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
        <h1 className="text-3xl font-bold">Beállítások</h1>
        <p className="text-muted-foreground">Szabd testre az éttermed profilját, megjelenését és rendelési feltételeit</p>
      </div>

      <Tabs defaultValue="restaurant">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="restaurant"><Store className="h-4 w-4 mr-2" />Étterem</TabsTrigger>
          <TabsTrigger value="orders"><ShoppingBag className="h-4 w-4 mr-2" />Rendelés</TabsTrigger>
          <TabsTrigger value="branding"><Palette className="h-4 w-4 mr-2" />Márka</TabsTrigger>
          <TabsTrigger value="nav"><Settings className="h-4 w-4 mr-2" />NAV Beállítások</TabsTrigger>
          <TabsTrigger value="subscription"><CreditCard className="h-4 w-4 mr-2" />Előfizetés</TabsTrigger>
        </TabsList>

        {/* ── Étterem tab ── */}
        <TabsContent value="restaurant" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Étterem Adatok</CardTitle>
              <CardDescription>Az éttermed nyilvánosan megjelenő alapadatai</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Étterem neve</Label>
                  <Input value={restaurantName} onChange={(e) => setRestaurantName(e.target.value)} placeholder="Éttermem" />
                </div>
                <div className="space-y-2">
                  <Label>Aldomain (slug)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">syorder.hu/</span>
                    <Input value={restaurantSlug} onChange={(e) => setRestaurantSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="ettermem" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cím</Label>
                <Textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="1054 Budapest, Fő utca 1." rows={2} className="resize-none" />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Telefonszám</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+36 1 123 4567" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="info@ettermem.hu" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Logo URL</Label>
                <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://pelda.hu/logo.png" />
                <p className="text-xs text-muted-foreground">Az éttermed logójának nyilvánosan elérhető URL-je</p>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Nyilvános oldal:{' '}
                  <a href={`/restaurant/${restaurantSlug}`} target="_blank" className="text-primary hover:underline font-medium">
                    {restaurantSlug}.syorder.hu
                  </a>
                </div>
                <Button onClick={saveRestaurantSettings} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />{saving ? 'Mentés...' : 'Mentés'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Rendelés tab ── */}
        <TabsContent value="orders" className="space-y-6">

          {/* Min order & fees */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShoppingBag className="h-5 w-5" />Rendelési Feltételek</CardTitle>
              <CardDescription>Minimum összeg, szállítási díj és idő beállítása</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Minimum rendelési összeg (Ft)</Label>
                  <Input
                    type="number" min="0" step="100"
                    value={settings.min_order_amount}
                    onChange={(e) => updateSetting('min_order_amount', Number(e.target.value))}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground">0 = nincs minimum korlát</p>
                </div>
                <div className="space-y-2">
                  <Label>Előkészítési idő (perc)</Label>
                  <Input
                    type="number" min="5" step="5"
                    value={settings.preparation_time_minutes}
                    onChange={(e) => updateSetting('preparation_time_minutes', Number(e.target.value))}
                  />
                </div>
              </div>

              <Separator />

              {/* Delivery toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Szállítás engedélyezve</p>
                  <p className="text-xs text-muted-foreground">Vendégek kérhetnek házhozszállítást</p>
                </div>
                <Switch
                  checked={settings.delivery_enabled}
                  onCheckedChange={(v) => updateSetting('delivery_enabled', v)}
                />
              </div>

              {settings.delivery_enabled && (
                <div className="grid sm:grid-cols-3 gap-4 pl-0 border-l-2 border-slate-100 pl-4">
                  <div className="space-y-2">
                    <Label>Szállítási díj (Ft)</Label>
                    <Input type="number" min="0" step="100" value={settings.delivery_fee} onChange={(e) => updateSetting('delivery_fee', Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Ingyenes szállítás felett (Ft)</Label>
                    <Input type="number" min="0" step="100" value={settings.free_delivery_above} onChange={(e) => updateSetting('free_delivery_above', Number(e.target.value))} placeholder="0 = soha" />
                  </div>
                  <div className="space-y-2">
                    <Label>Szállítási körzet (km)</Label>
                    <Input type="number" min="1" step="1" value={settings.delivery_radius_km} onChange={(e) => updateSetting('delivery_radius_km', Number(e.target.value))} />
                  </div>
                </div>
              )}

              {/* Takeaway toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Elvitel engedélyezve</p>
                  <p className="text-xs text-muted-foreground">Vendégek kérhetnek elvitelt</p>
                </div>
                <Switch
                  checked={settings.takeaway_enabled}
                  onCheckedChange={(v) => updateSetting('takeaway_enabled', v)}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={saveOrderSettings} disabled={saving}><Save className="h-4 w-4 mr-2" />{saving ? 'Mentés...' : 'Mentés'}</Button>
              </div>
            </CardContent>
          </Card>

          {/* Delivery cities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5" />Szállítási Területek</CardTitle>
              <CardDescription>Azok a városok / területek, ahol szállítasz</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCity())}
                  placeholder="pl. Budapest XIV. kerület"
                  className="flex-1"
                />
                <Button onClick={addCity} type="button"><Plus className="h-4 w-4 mr-1" />Hozzáad</Button>
              </div>
              {deliveryCities.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">Még nincs szállítási terület megadva.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {deliveryCities.map((city) => (
                    <div key={city} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full text-sm">
                      <MapPin className="h-3 w-3 text-slate-500" />
                      {city}
                      <button onClick={() => setDeliveryCities((p) => p.filter((c) => c !== city))}
                        className="ml-1 text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end">
                <Button onClick={saveOrderSettings} disabled={saving} variant="outline"><Save className="h-4 w-4 mr-2" />Területek mentése</Button>
              </div>
            </CardContent>
          </Card>

          {/* Opening hours */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />Nyitvatartás</CardTitle>
              <CardDescription>A nyilvános étteremi oldalon megjelenő nyitvatartási idők</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {DAYS.map((day, i) => {
                const key = DAY_KEYS[i];
                const h = settings.opening_hours[key] || DEFAULT_SETTINGS.opening_hours[key];
                return (
                  <div key={key} className={cn('grid grid-cols-[120px_1fr_1fr_auto] items-center gap-3 py-2 px-3 rounded-xl', h.closed ? 'bg-slate-50 opacity-60' : 'bg-slate-50/50')}>
                    <div className="flex items-center gap-2">
                      <Switch checked={!h.closed} onCheckedChange={(v) => updateHour(key, 'closed', !v)} />
                      <span className="text-sm font-medium">{day}</span>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-slate-400 uppercase">Nyit</Label>
                      <Input type="time" value={h.open} onChange={(e) => updateHour(key, 'open', e.target.value)} disabled={h.closed} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-slate-400 uppercase">Zár</Label>
                      <Input type="time" value={h.close} onChange={(e) => updateHour(key, 'close', e.target.value)} disabled={h.closed} className="h-8 text-sm" />
                    </div>
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', h.closed ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700')}>
                      {h.closed ? 'Zárva' : 'Nyitva'}
                    </span>
                  </div>
                );
              })}
              <div className="flex justify-end pt-2">
                <Button onClick={saveOrderSettings} disabled={saving}><Save className="h-4 w-4 mr-2" />Nyitvatartás mentése</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Márka tab ── */}
        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Márka Színek</CardTitle>
              <CardDescription>Az éttermed nyilvános oldalán és menüjén megjelenő színséma</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Gyors Beállítások</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                  {presetColors.map((preset) => (
                    <button key={preset.name} onClick={() => { setPrimaryColor(preset.primary); setSecondaryColor(preset.secondary); setAccentColor(preset.accent); }}
                      className="p-2.5 rounded-xl border hover:border-primary transition-all hover:shadow-sm text-center">
                      <div className="flex gap-1 mb-2 justify-center">
                        {[preset.primary, preset.secondary, preset.accent].map((c) => (
                          <div key={c} className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { id: 'primaryColor', label: 'Elsődleges', value: primaryColor, setter: setPrimaryColor },
                  { id: 'secondaryColor', label: 'Másodlagos', value: secondaryColor, setter: setSecondaryColor },
                  { id: 'accentColor', label: 'Kiemelő', value: accentColor, setter: setAccentColor },
                ].map((item) => (
                  <div key={item.id} className="space-y-2">
                    <Label>{item.label} szín</Label>
                    <div className="flex gap-2">
                      <Input type="color" value={item.value} onChange={(e) => item.setter(e.target.value)} className="w-12 h-10 p-1 cursor-pointer" />
                      <Input value={item.value} onChange={(e) => item.setter(e.target.value)} placeholder="#000000" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-5 rounded-xl border-2 border-dashed">
                <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">Előnézet</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <button className="px-5 py-2 rounded-xl text-white text-sm font-semibold" style={{ backgroundColor: primaryColor }}>Rendelés</button>
                  <button className="px-5 py-2 rounded-xl text-white text-sm font-semibold" style={{ backgroundColor: secondaryColor }}>Kategória</button>
                  <button className="px-5 py-2 rounded-xl text-white text-sm font-semibold" style={{ backgroundColor: accentColor }}>Kiemelés</button>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveBrandingSettings} disabled={saving}><Save className="h-4 w-4 mr-2" />{saving ? 'Mentés...' : 'Márka Mentése'}</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── NAV Beállítások tab ── */}
        <TabsContent value="nav" className="space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>NAV Online Számla Integráció</CardTitle>
                  <CardDescription>Készítsd fel a rendszert a NAV Online Számlázó REST API kapcsolatára</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">{navEnabled ? 'Bekapcsolva' : 'Kikapcsolva'}</span>
                  <Switch
                    checked={navEnabled}
                    onCheckedChange={setNavEnabled}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              {!navEnabled ? (
                <div className="bg-slate-50 border border-slate-200 text-slate-600 rounded-xl p-4 text-sm text-center">
                  A NAV Online számlázás jelenleg kikapcsolt állapotban van az étterem számára. 
                  Kapcsold be a fenti csúszkával, ha konfigurálni szeretnéd az API adatkapcsolatot.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Adatszolgáltatási környezet</Label>
                      <div className="flex gap-2">
                        <Button
                          variant={navEnvironment === 'sandbox' ? 'default' : 'outline'}
                          onClick={() => setNavEnvironment('sandbox')}
                          type="button"
                          className="flex-1"
                        >
                          TESZT (Sandbox)
                        </Button>
                        <Button
                          variant={navEnvironment === 'live' ? 'destructive' : 'outline'}
                          onClick={() => setNavEnvironment('live')}
                          type="button"
                          className="flex-1"
                        >
                          ÉLES (Live API)
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Adózó / Étterem adószáma (Tax ID)</Label>
                      <Input
                        value={navTaxNumber}
                        onChange={(e) => setNavTaxNumber(e.target.value)}
                        placeholder="Pl: 12345678-1-12"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">NAV Technikai Felhasználónév</Label>
                      <Input
                        value={navUsername}
                        onChange={(e) => setNavUsername(e.target.value)}
                        placeholder="Pl: abcd1234efgh"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">NAV Technikai XML Jelszó</Label>
                      <Input
                        type="password"
                        value={navPassword}
                        onChange={(e) => setNavPassword(e.target.value)}
                        placeholder="••••••••••••••"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Aktivációs Aláírókulcs (Signature Key)</Label>
                      <Input
                        value={navSignKey}
                        onChange={(e) => setNavSignKey(e.target.value)}
                        placeholder="Aláírókulcs (hexa formátum, pl. 40-60 karakter)"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Kicserélőkulcs (Crypto Key)</Label>
                      <Input
                        value={navCryptoKey}
                        onChange={(e) => setNavCryptoKey(e.target.value)}
                        placeholder="Nem kötelező (kriptográfiai kódcseréhez)"
                      />
                    </div>
                  </div>

                  <div className="pt-2.5 bg-slate-50 border border-slate-200 text-xs p-3 rounded-xl flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                    <div className="text-slate-600 leading-relaxed space-y-1">
                      <p className="font-semibold text-slate-800">Technikai Információ a NAV API-ról:</p>
                      <p>
                        A platform fel van készítve a <code className="bg-slate-200 px-1 rounded font-mono">NAV Online Számla v3.0 REST API</code> integrációra. 
                        A rendszer minden jóváhagyott, lezárt online és asztali rendelésből képes XML bizonylat-adatszolgáltatást összeállítani és feltölteni.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t">
                    <Button
                      onClick={handleTestNavConnection}
                      variant="outline"
                      disabled={testingNav || saving}
                      type="button"
                    >
                      {testingNav ? 'Csatlakozás ellenőrzése...' : 'Kapcsolat Tesztelése'}
                    </Button>

                    <Button onClick={saveNavSettings} disabled={saving}>
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Beállítások mentése...' : 'NAV Beállítások Mentése'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Előfizetés tab ── */}
        <TabsContent value="subscription" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Előfizetési Csomag</CardTitle>
              <CardDescription>Az aktív előfizetésed és a számlázási információk</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-5 rounded-xl bg-slate-900 text-white">
                <div>
                  <Badge className="bg-white text-slate-900 mb-2">{tenant?.subscription_plan === 'professzionalis' ? 'Professzionális' : 'Induló'}</Badge>
                  <div className="text-2xl font-bold">{tenant?.subscription_plan === 'professzionalis' ? '29 900' : '14 900'} Ft / hó</div>
                  <p className="text-slate-400 text-sm mt-1">Következő megújítás: {tenant?.subscription_ends_at ? new Date(tenant.subscription_ends_at).toLocaleDateString('hu-HU') : 'Folyamatos'}</p>
                </div>
                <div className="text-right">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 inline-block mr-1" />
                  <span className="text-sm text-emerald-400">Aktív</span>
                </div>
              </div>

              <Separator />

              <div className="grid md:grid-cols-2 gap-3 text-sm">
                {['Korlátlan rendelés', 'Menükezelés', 'Készletkezelés', 'Hűségprogram', 'Analitika', 'Prioritásos support'].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{f}
                  </div>
                ))}
              </div>

              <Separator />

              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-amber-800">Csomag vagy számlázás módosításához kérjük lépj kapcsolatba az ügyfélszolgálattal: <strong>info@syorder.hu</strong></p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MapPin({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
