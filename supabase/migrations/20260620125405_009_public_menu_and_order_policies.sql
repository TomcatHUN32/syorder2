/*
  # Public policies for customer-facing restaurant pages

  1. Tenants — anon can read active tenants (needed for restaurant search page)
  2. Menu categories / items — anon can read (public menu)
  3. Orders — anon can insert (customer ordering without login)
  4. Order items — anon can insert
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'public_select_tenants' AND tablename = 'tenants'
  ) THEN
    CREATE POLICY "public_select_tenants" ON tenants
      FOR SELECT TO anon USING (is_active = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'public_select_menu_categories' AND tablename = 'menu_categories'
  ) THEN
    CREATE POLICY "public_select_menu_categories" ON menu_categories
      FOR SELECT TO anon USING (is_active = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'public_select_menu_items' AND tablename = 'menu_items'
  ) THEN
    CREATE POLICY "public_select_menu_items" ON menu_items
      FOR SELECT TO anon USING (is_available = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'anon_insert_orders' AND tablename = 'orders'
  ) THEN
    CREATE POLICY "anon_insert_orders" ON orders
      FOR INSERT TO anon WITH CHECK (tenant_id IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'anon_insert_order_items' AND tablename = 'order_items'
  ) THEN
    CREATE POLICY "anon_insert_order_items" ON order_items
      FOR INSERT TO anon WITH CHECK (tenant_id IS NOT NULL AND order_id IS NOT NULL);
  END IF;
END $$;
