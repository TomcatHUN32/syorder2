# SYORDER — Adatbázis Migrációs Útmutató

Ez a dokumentum tartalmaz minden SQL parancsot, amellyel az adatbázist frissen fel lehet tölteni, illetve a meglévő sémát frissíteni.

---

## Migrációs sorrend

Minden migrációt sorban kell futtatni a Supabase SQL Editorában (`supabase.com/dashboard/project/<id>/sql/new`).

---

### 001 — Multi-tenant alap séma

```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#1E40AF',
  secondary_color TEXT DEFAULT '#3B82F6',
  accent_color TEXT DEFAULT '#F59E0B',
  address TEXT,
  phone TEXT,
  email TEXT,
  is_active BOOLEAN DEFAULT true,
  subscription_plan TEXT DEFAULT 'trial',
  subscription_ends_at TIMESTAMPTZ,
  settings JSONB DEFAULT '{}',
  delivery_cities TEXT[] DEFAULT '{}',
  cuisines TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'staff' CHECK (role IN ('owner', 'manager', 'staff', 'admin')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- (+ menu_categories, menu_items, ingredients, recipe_ingredients,
--    customers, orders, order_items, loyalty_transactions,
--    inventory_transactions, daily_stats — lásd 001_multi_tenant_schema.sql)
```

---

### 002 — RLS polítiák

```sql
-- Helper függvény: az aktuális felhasználó tenant_id-jét adja vissza
CREATE OR REPLACE FUNCTION public.auth_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Példa: tenants tábla RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select_own" ON tenants FOR SELECT
  TO authenticated USING (id = public.auth_tenant_id());

-- Hasonlóan az összes többi táblára (lásd 002_rls_policies.sql)
```

---

### 003 — Auth triggerek

```sql
-- Automatikusan hoz létre public.users rekordot, ha auth.users-be kerül bejegyzés
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

### 005 — Felhasználói szerepkörök és igénylések

```sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'owner',
  ADD COLUMN IF NOT EXISTS is_superadmin boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS restaurant_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  address text,
  city text,
  message text,
  status text NOT NULL DEFAULT 'pending',
  subdomain text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE restaurant_requests ENABLE ROW LEVEL SECURITY;
```

---

### 008 — Csomag és számlázási mező az igényléseken

```sql
ALTER TABLE restaurant_requests
  ADD COLUMN IF NOT EXISTS plan text,
  ADD COLUMN IF NOT EXISTS billing_period text;
```

---

### 009 — Nyilvános menü és rendelési RLS

```sql
-- Anonim felhasználók is olvashatják az aktív éttermeket és menüt
CREATE POLICY "public_select_tenants" ON tenants
  FOR SELECT TO anon USING (is_active = true);

CREATE POLICY "public_select_menu_categories" ON menu_categories
  FOR SELECT TO anon USING (is_active = true);

CREATE POLICY "public_select_menu_items" ON menu_items
  FOR SELECT TO anon USING (is_available = true);

-- Anonim rendelés leadás
CREATE POLICY "anon_insert_orders" ON orders
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_insert_order_items" ON order_items
  FOR INSERT TO anon WITH CHECK (true);
```

---

### 010 — Hitelesített vevői rendelés

```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);

CREATE POLICY "auth_customer_insert_orders" ON orders
  FOR INSERT TO authenticated
  WITH CHECK (auth_user_id = auth.uid() OR auth_user_id IS NULL);
```

---

### 011 — POS email az igényléseken

```sql
ALTER TABLE restaurant_requests
  ADD COLUMN IF NOT EXISTS pos_email TEXT,
  ADD COLUMN IF NOT EXISTS pos_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
```

---

### 012 — Előfizetés (subscriptions) tábla ⬅ ÚJ

```sql
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE UNIQUE NOT NULL,
  plan_name TEXT NOT NULL DEFAULT 'Induló',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'expired', 'cancelled', 'trial')),
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  billing_period TEXT CHECK (billing_period IN ('havi', 'negyedeves', 'eves')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Étterem saját előfizetése
CREATE POLICY "select_own_subscription" ON subscriptions
  FOR SELECT TO authenticated
  USING (tenant_id = public.auth_tenant_id());

-- Szuperadmin mindent lát/módosíthat
CREATE POLICY "superadmin_all_subscriptions" ON subscriptions
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_superadmin = true)
  );

-- Automatikus updated_at
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Próba előfizetés létező tenantenknél
INSERT INTO subscriptions (tenant_id, plan_name, status, expires_at)
SELECT id, 'Induló', 'trial', NOW() + INTERVAL '30 days'
FROM tenants
WHERE id NOT IN (SELECT tenant_id FROM subscriptions);
```

---

## Előfizetés frissítése (admin)

Egy tenant előfizetésének megújítása SQL Editorból:

```sql
-- Előfizetés megújítása 1 évvel
UPDATE subscriptions
SET
  plan_name    = 'Professzionális',
  status       = 'active',
  billing_period = 'eves',
  expires_at   = NOW() + INTERVAL '1 year'
WHERE tenant_id = '<tenant_uuid_ide>';

-- Előfizetés lekérdezése
SELECT
  t.name        AS etterem,
  s.plan_name,
  s.status,
  s.expires_at,
  GREATEST(0, EXTRACT(DAY FROM (s.expires_at - NOW()))::int) AS napok_hatravannak
FROM subscriptions s
JOIN tenants t ON t.id = s.tenant_id
ORDER BY s.expires_at;
```

---

## Superadmin hozzárendelése

```sql
-- Egy meglévő felhasználó superadminná tétele
UPDATE public.users
SET is_superadmin = true, role = 'admin'
WHERE email = 'admin@syorder.hu';
```

---

## Nginx konfiguráció (VPS / saját szerver)

Ha az alkalmazást VPS-en futtatod (Nginx + PM2 / Docker), az alábbi Nginx konfiguráció szükséges a wildcard aldomain támogatáshoz.

### `/etc/nginx/sites-available/syorder.conf`

```nginx
# Átirányítás HTTP → HTTPS
server {
    listen 80;
    server_name syorder.hu *.syorder.hu;
    return 301 https://$host$request_uri;
}

# HTTPS — fő szerver
server {
    listen 443 ssl http2;
    server_name syorder.hu *.syorder.hu;

    ssl_certificate     /etc/letsencrypt/live/syorder.hu/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/syorder.hu/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    # KRITIKUS: a Host fejléc továbbítása szükséges az aldomain routinghoz
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade    $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }

    # Statikus Next.js fájlok (cache-elés)
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 200 1d;
        add_header Cache-Control "public, max-age=86400, immutable";
    }
}
```

### Aktiválás

```bash
sudo ln -s /etc/nginx/sites-available/syorder.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Wildcard SSL (Let's Encrypt + Certbot DNS-01 kihívás)

```bash
certbot certonly \
  --manual \
  --preferred-challenges dns \
  -d syorder.hu \
  -d "*.syorder.hu"
```

---

## Netlify konfiguráció (wildcard aldomainek)

A Netlify-on a wildcard aldomaineket a **Netlify UI**-ban kell beállítani:

1. `app.netlify.com` → projekt → **Domain management**
2. **Add domain alias**: `*.syorder.hu`
3. DNS-nél adj hozzá egy `A` vagy `CNAME` rekordot: `*.syorder.hu → <netlify-id>.netlify.app`
4. A Netlify automatikusan kezeli a Next.js middleware routingját (`@netlify/plugin-nextjs`).

A `netlify.toml` nem igényel módosítást — az aldomain felismerés a Next.js middleware-ben történik (`middleware.ts`).

---

## 401 Unauthorized hibák elhárítása

A 401-es hibák általában elavult/érvénytelen Supabase auth tokenekből erednek a böngésző localStorage-ában.

**Megoldás** (implementálva a login oldalon):

```typescript
// A bejelentkezés előtt töröljük a régi tokeneket
const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1] ?? '';
if (typeof window !== 'undefined' && projectRef) {
  localStorage.removeItem(`sb-${projectRef}-auth-token`);
}
await supabase.auth.signOut({ scope: 'local' });
// Ezután következik a signInWithPassword(...)
```

**Soha ne használd a `SUPABASE_SERVICE_ROLE_KEY`-t kliensoldali kódban!**
- A service role kulcs csak szerver oldali API route-okban (`app/api/...`) megengedett.
- A `NEXT_PUBLIC_SUPABASE_ANON_KEY` az egyetlen biztonságos kliensoldalon használható kulcs.
