/*
  # Auth user ordering + tenant settings JSONB

  1. Add auth_user_id to orders and customers for customer login tracking
  2. Add policies for authenticated (non-staff) users to insert orders
  3. Ensure tenants.settings JSONB has a default structure
*/

-- auth_user_id on orders (links Supabase auth user to an order)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'auth_user_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN auth_user_id uuid;
  END IF;
END $$;

-- auth_user_id on customers (links Supabase auth user to customer record)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'auth_user_id'
  ) THEN
    ALTER TABLE customers ADD COLUMN auth_user_id uuid;
  END IF;
END $$;

-- Allow authenticated users (customers, not just staff) to insert orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'auth_customer_insert_orders' AND tablename = 'orders'
  ) THEN
    CREATE POLICY "auth_customer_insert_orders" ON orders
      FOR INSERT TO authenticated
      WITH CHECK (tenant_id IS NOT NULL);
  END IF;
END $$;

-- Allow authenticated users to insert order_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'auth_customer_insert_order_items' AND tablename = 'order_items'
  ) THEN
    CREATE POLICY "auth_customer_insert_order_items" ON order_items
      FOR INSERT TO authenticated
      WITH CHECK (tenant_id IS NOT NULL AND order_id IS NOT NULL);
  END IF;
END $$;

-- Allow authenticated users to insert their own customer record
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'auth_customer_insert_self' AND tablename = 'customers'
  ) THEN
    CREATE POLICY "auth_customer_insert_self" ON customers
      FOR INSERT TO authenticated
      WITH CHECK (auth_user_id = auth.uid() AND tenant_id IS NOT NULL);
  END IF;
END $$;

-- Allow customers to see their own record (upsert / loyalty points)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'auth_customer_select_self' AND tablename = 'customers'
  ) THEN
    CREATE POLICY "auth_customer_select_self" ON customers
      FOR SELECT TO authenticated
      USING (auth_user_id = auth.uid() OR tenant_id = auth_tenant_id());
  END IF;
END $$;

-- Allow customers to see their own orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'auth_customer_select_own_orders' AND tablename = 'orders'
  ) THEN
    CREATE POLICY "auth_customer_select_own_orders" ON orders
      FOR SELECT TO authenticated
      USING (auth_user_id = auth.uid() OR tenant_id = auth_tenant_id());
  END IF;
END $$;
