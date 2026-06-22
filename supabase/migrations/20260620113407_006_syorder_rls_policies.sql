/*
# SYORDER — Step 2: Security functions and RLS policies

Creates:
- get_current_tenant_id() helper function
- is_superadmin() helper function
- RLS policies on restaurant_requests using these helpers
- Updated RLS on all tenant-scoped tables
*/

-- ============================================================
-- Helper functions
-- ============================================================
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT tenant_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT is_superadmin FROM public.users WHERE id = auth.uid() LIMIT 1),
    false
  );
$$;

-- ============================================================
-- RLS on restaurant_requests
-- ============================================================
DROP POLICY IF EXISTS "anon_insert_requests" ON restaurant_requests;
CREATE POLICY "anon_insert_requests" ON restaurant_requests
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "superadmin_select_requests" ON restaurant_requests;
CREATE POLICY "superadmin_select_requests" ON restaurant_requests
  FOR SELECT TO authenticated USING (is_superadmin());

DROP POLICY IF EXISTS "superadmin_update_requests" ON restaurant_requests;
CREATE POLICY "superadmin_update_requests" ON restaurant_requests
  FOR UPDATE TO authenticated
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- ============================================================
-- Rebuild RLS on tenants
-- ============================================================
DROP POLICY IF EXISTS "select_own_tenant" ON tenants;
CREATE POLICY "select_own_tenant" ON tenants
  FOR SELECT TO authenticated
  USING (id = get_current_tenant_id() OR is_superadmin());

DROP POLICY IF EXISTS "update_own_tenant" ON tenants;
CREATE POLICY "update_own_tenant" ON tenants
  FOR UPDATE TO authenticated
  USING (id = get_current_tenant_id() OR is_superadmin())
  WITH CHECK (id = get_current_tenant_id() OR is_superadmin());

DROP POLICY IF EXISTS "superadmin_insert_tenant" ON tenants;
CREATE POLICY "superadmin_insert_tenant" ON tenants
  FOR INSERT TO authenticated WITH CHECK (is_superadmin());

DROP POLICY IF EXISTS "superadmin_delete_tenant" ON tenants;
CREATE POLICY "superadmin_delete_tenant" ON tenants
  FOR DELETE TO authenticated USING (is_superadmin());

-- ============================================================
-- Rebuild RLS on users
-- ============================================================
DROP POLICY IF EXISTS "select_own_user" ON users;
CREATE POLICY "select_own_user" ON users
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR tenant_id = get_current_tenant_id()
    OR is_superadmin()
  );

DROP POLICY IF EXISTS "update_own_user" ON users;
CREATE POLICY "update_own_user" ON users
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR is_superadmin())
  WITH CHECK (id = auth.uid() OR is_superadmin());

DROP POLICY IF EXISTS "insert_own_user" ON users;
CREATE POLICY "insert_own_user" ON users
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR is_superadmin());

-- ============================================================
-- menu_categories
-- ============================================================
DROP POLICY IF EXISTS "tenant_select_categories" ON menu_categories;
CREATE POLICY "tenant_select_categories" ON menu_categories
  FOR SELECT TO authenticated
  USING (tenant_id = get_current_tenant_id() OR is_superadmin());

DROP POLICY IF EXISTS "tenant_insert_categories" ON menu_categories;
CREATE POLICY "tenant_insert_categories" ON menu_categories
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_current_tenant_id() OR is_superadmin());

DROP POLICY IF EXISTS "tenant_update_categories" ON menu_categories;
CREATE POLICY "tenant_update_categories" ON menu_categories
  FOR UPDATE TO authenticated
  USING (tenant_id = get_current_tenant_id() OR is_superadmin())
  WITH CHECK (tenant_id = get_current_tenant_id() OR is_superadmin());

DROP POLICY IF EXISTS "tenant_delete_categories" ON menu_categories;
CREATE POLICY "tenant_delete_categories" ON menu_categories
  FOR DELETE TO authenticated
  USING (tenant_id = get_current_tenant_id() OR is_superadmin());

-- ============================================================
-- menu_items
-- ============================================================
DROP POLICY IF EXISTS "tenant_select_items" ON menu_items;
CREATE POLICY "tenant_select_items" ON menu_items
  FOR SELECT TO authenticated
  USING (tenant_id = get_current_tenant_id() OR is_superadmin());

DROP POLICY IF EXISTS "anon_select_items" ON menu_items;
CREATE POLICY "anon_select_items" ON menu_items
  FOR SELECT TO anon USING (is_available = true);

DROP POLICY IF EXISTS "tenant_insert_items" ON menu_items;
CREATE POLICY "tenant_insert_items" ON menu_items
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_current_tenant_id() OR is_superadmin());

DROP POLICY IF EXISTS "tenant_update_items" ON menu_items;
CREATE POLICY "tenant_update_items" ON menu_items
  FOR UPDATE TO authenticated
  USING (tenant_id = get_current_tenant_id() OR is_superadmin())
  WITH CHECK (tenant_id = get_current_tenant_id() OR is_superadmin());

DROP POLICY IF EXISTS "tenant_delete_items" ON menu_items;
CREATE POLICY "tenant_delete_items" ON menu_items
  FOR DELETE TO authenticated
  USING (tenant_id = get_current_tenant_id() OR is_superadmin());

-- ============================================================
-- orders
-- ============================================================
DROP POLICY IF EXISTS "tenant_select_orders" ON orders;
CREATE POLICY "tenant_select_orders" ON orders
  FOR SELECT TO authenticated
  USING (tenant_id = get_current_tenant_id() OR is_superadmin());

DROP POLICY IF EXISTS "tenant_insert_orders" ON orders;
CREATE POLICY "tenant_insert_orders" ON orders
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_current_tenant_id() OR is_superadmin());

DROP POLICY IF EXISTS "anon_insert_orders" ON orders;
CREATE POLICY "anon_insert_orders" ON orders
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "tenant_update_orders" ON orders;
CREATE POLICY "tenant_update_orders" ON orders
  FOR UPDATE TO authenticated
  USING (tenant_id = get_current_tenant_id() OR is_superadmin())
  WITH CHECK (tenant_id = get_current_tenant_id() OR is_superadmin());

DROP POLICY IF EXISTS "tenant_delete_orders" ON orders;
CREATE POLICY "tenant_delete_orders" ON orders
  FOR DELETE TO authenticated
  USING (tenant_id = get_current_tenant_id() OR is_superadmin());

-- ============================================================
-- customers
-- ============================================================
DROP POLICY IF EXISTS "tenant_select_customers" ON customers;
CREATE POLICY "tenant_select_customers" ON customers
  FOR SELECT TO authenticated
  USING (tenant_id = get_current_tenant_id() OR is_superadmin());

DROP POLICY IF EXISTS "tenant_insert_customers" ON customers;
CREATE POLICY "tenant_insert_customers" ON customers
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_current_tenant_id() OR is_superadmin());

DROP POLICY IF EXISTS "anon_insert_customers" ON customers;
CREATE POLICY "anon_insert_customers" ON customers
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "tenant_update_customers" ON customers;
CREATE POLICY "tenant_update_customers" ON customers
  FOR UPDATE TO authenticated
  USING (tenant_id = get_current_tenant_id() OR is_superadmin())
  WITH CHECK (tenant_id = get_current_tenant_id() OR is_superadmin());

DROP POLICY IF EXISTS "tenant_delete_customers" ON customers;
CREATE POLICY "tenant_delete_customers" ON customers
  FOR DELETE TO authenticated
  USING (tenant_id = get_current_tenant_id() OR is_superadmin());

-- ============================================================
-- ingredients
-- ============================================================
DROP POLICY IF EXISTS "tenant_select_ingredients" ON ingredients;
CREATE POLICY "tenant_select_ingredients" ON ingredients
  FOR SELECT TO authenticated
  USING (tenant_id = get_current_tenant_id() OR is_superadmin());

DROP POLICY IF EXISTS "tenant_insert_ingredients" ON ingredients;
CREATE POLICY "tenant_insert_ingredients" ON ingredients
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_current_tenant_id() OR is_superadmin());

DROP POLICY IF EXISTS "tenant_update_ingredients" ON ingredients;
CREATE POLICY "tenant_update_ingredients" ON ingredients
  FOR UPDATE TO authenticated
  USING (tenant_id = get_current_tenant_id() OR is_superadmin())
  WITH CHECK (tenant_id = get_current_tenant_id() OR is_superadmin());

DROP POLICY IF EXISTS "tenant_delete_ingredients" ON ingredients;
CREATE POLICY "tenant_delete_ingredients" ON ingredients
  FOR DELETE TO authenticated
  USING (tenant_id = get_current_tenant_id() OR is_superadmin());
