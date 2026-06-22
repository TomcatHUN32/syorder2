-- RLS Policies for Multi-tenant Architecture
-- Auth.uid() returns the user's ID, but we need to look up their tenant_id from users table

-- Helper function to get tenant_id from auth
CREATE OR REPLACE FUNCTION auth_tenant_id() RETURNS UUID AS $$
BEGIN
  RETURN (SELECT tenant_id FROM users WHERE id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Tenants: only users belonging to tenant can see their own tenant
CREATE POLICY "select_own_tenant" ON tenants FOR SELECT
  TO authenticated USING (id = auth_tenant_id());
CREATE POLICY "update_own_tenant" ON tenants FOR UPDATE
  TO authenticated USING (id = auth_tenant_id()) WITH CHECK (id = auth_tenant_id());

-- Users: can see/update users in same tenant
CREATE POLICY "select_tenant_users" ON users FOR SELECT
  TO authenticated USING (tenant_id = auth_tenant_id());
CREATE POLICY "insert_tenant_users" ON users FOR INSERT
  TO authenticated WITH CHECK (tenant_id = auth_tenant_id());
CREATE POLICY "update_tenant_users" ON users FOR UPDATE
  TO authenticated USING (tenant_id = auth_tenant_id()) WITH CHECK (tenant_id = auth_tenant_id());
CREATE POLICY "delete_tenant_users" ON users FOR DELETE
  TO authenticated USING (tenant_id = auth_tenant_id());

-- Menu Categories
CREATE POLICY "select_menu_categories" ON menu_categories FOR SELECT
  TO authenticated USING (tenant_id = auth_tenant_id());
CREATE POLICY "insert_menu_categories" ON menu_categories FOR INSERT
  TO authenticated WITH CHECK (tenant_id = auth_tenant_id());
CREATE POLICY "update_menu_categories" ON menu_categories FOR UPDATE
  TO authenticated USING (tenant_id = auth_tenant_id()) WITH CHECK (tenant_id = auth_tenant_id());
CREATE POLICY "delete_menu_categories" ON menu_categories FOR DELETE
  TO authenticated USING (tenant_id = auth_tenant_id());

-- Menu Items
CREATE POLICY "select_menu_items" ON menu_items FOR SELECT
  TO authenticated USING (tenant_id = auth_tenant_id());
CREATE POLICY "insert_menu_items" ON menu_items FOR INSERT
  TO authenticated WITH CHECK (tenant_id = auth_tenant_id());
CREATE POLICY "update_menu_items" ON menu_items FOR UPDATE
  TO authenticated USING (tenant_id = auth_tenant_id()) WITH CHECK (tenant_id = auth_tenant_id());
CREATE POLICY "delete_menu_items" ON menu_items FOR DELETE
  TO authenticated USING (tenant_id = auth_tenant_id());

-- Ingredients
CREATE POLICY "select_ingredients" ON ingredients FOR SELECT
  TO authenticated USING (tenant_id = auth_tenant_id());
CREATE POLICY "insert_ingredients" ON ingredients FOR INSERT
  TO authenticated WITH CHECK (tenant_id = auth_tenant_id());
CREATE POLICY "update_ingredients" ON ingredients FOR UPDATE
  TO authenticated USING (tenant_id = auth_tenant_id()) WITH CHECK (tenant_id = auth_tenant_id());
CREATE POLICY "delete_ingredients" ON ingredients FOR DELETE
  TO authenticated USING (tenant_id = auth_tenant_id());

-- Recipe Ingredients
CREATE POLICY "select_recipe_ingredients" ON recipe_ingredients FOR SELECT
  TO authenticated USING (tenant_id = auth_tenant_id());
CREATE POLICY "insert_recipe_ingredients" ON recipe_ingredients FOR INSERT
  TO authenticated WITH CHECK (tenant_id = auth_tenant_id());
CREATE POLICY "update_recipe_ingredients" ON recipe_ingredients FOR UPDATE
  TO authenticated USING (tenant_id = auth_tenant_id()) WITH CHECK (tenant_id = auth_tenant_id());
CREATE POLICY "delete_recipe_ingredients" ON recipe_ingredients FOR DELETE
  TO authenticated USING (tenant_id = auth_tenant_id());

-- Customers
CREATE POLICY "select_customers" ON customers FOR SELECT
  TO authenticated USING (tenant_id = auth_tenant_id());
CREATE POLICY "insert_customers" ON customers FOR INSERT
  TO authenticated WITH CHECK (tenant_id = auth_tenant_id());
CREATE POLICY "update_customers" ON customers FOR UPDATE
  TO authenticated USING (tenant_id = auth_tenant_id()) WITH CHECK (tenant_id = auth_tenant_id());
CREATE POLICY "delete_customers" ON customers FOR DELETE
  TO authenticated USING (tenant_id = auth_tenant_id());

-- Orders
CREATE POLICY "select_orders" ON orders FOR SELECT
  TO authenticated USING (tenant_id = auth_tenant_id());
CREATE POLICY "insert_orders" ON orders FOR INSERT
  TO authenticated WITH CHECK (tenant_id = auth_tenant_id());
CREATE POLICY "update_orders" ON orders FOR UPDATE
  TO authenticated USING (tenant_id = auth_tenant_id()) WITH CHECK (tenant_id = auth_tenant_id());
CREATE POLICY "delete_orders" ON orders FOR DELETE
  TO authenticated USING (tenant_id = auth_tenant_id());

-- Order Items
CREATE POLICY "select_order_items" ON order_items FOR SELECT
  TO authenticated USING (tenant_id = auth_tenant_id());
CREATE POLICY "insert_order_items" ON order_items FOR INSERT
  TO authenticated WITH CHECK (tenant_id = auth_tenant_id());
CREATE POLICY "update_order_items" ON order_items FOR UPDATE
  TO authenticated USING (tenant_id = auth_tenant_id()) WITH CHECK (tenant_id = auth_tenant_id());
CREATE POLICY "delete_order_items" ON order_items FOR DELETE
  TO authenticated USING (tenant_id = auth_tenant_id());

-- Loyalty Transactions
CREATE POLICY "select_loyalty" ON loyalty_transactions FOR SELECT
  TO authenticated USING (tenant_id = auth_tenant_id());
CREATE POLICY "insert_loyalty" ON loyalty_transactions FOR INSERT
  TO authenticated WITH CHECK (tenant_id = auth_tenant_id());

-- Inventory Transactions
CREATE POLICY "select_inventory" ON inventory_transactions FOR SELECT
  TO authenticated USING (tenant_id = auth_tenant_id());
CREATE POLICY "insert_inventory" ON inventory_transactions FOR INSERT
  TO authenticated WITH CHECK (tenant_id = auth_tenant_id());

-- Daily Stats
CREATE POLICY "select_stats" ON daily_stats FOR SELECT
  TO authenticated USING (tenant_id = auth_tenant_id());
CREATE POLICY "insert_stats" ON daily_stats FOR INSERT
  TO authenticated WITH CHECK (tenant_id = auth_tenant_id());
CREATE POLICY "update_stats" ON daily_stats FOR UPDATE
  TO authenticated USING (tenant_id = auth_tenant_id()) WITH CHECK (tenant_id = auth_tenant_id());