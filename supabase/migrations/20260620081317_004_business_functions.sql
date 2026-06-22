-- Update handle_new_user to handle tenant_id from metadata
-- When a user signs up, tenant_id can be passed in metadata

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_tenant_id UUID;
  user_role TEXT;
BEGIN
  -- Get tenant_id from metadata if provided (for invited users)
  user_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::UUID;
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'owner');
  
  -- If no tenant_id, this is a new registration - create tenant
  IF user_tenant_id IS NULL THEN
    INSERT INTO public.tenants (name, slug)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'restaurant_name', 'My Restaurant'),
      COALESCE(NEW.raw_user_meta_data->>'slug', LOWER(REPLACE(COALESCE(NEW.raw_user_meta_data->>'restaurant_name', 'restaurant'), ' ', '-')))
    )
    RETURNING id INTO user_tenant_id;
    user_role := 'owner';
  END IF;
  
  INSERT INTO public.users (id, tenant_id, email, full_name, role)
  VALUES (
    NEW.id, 
    user_tenant_id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    user_role
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate order number
CREATE OR REPLACE FUNCTION public.generate_order_number(p_tenant_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_count INTEGER;
  v_date TEXT;
BEGIN
  v_date := TO_CHAR(NOW(), 'YYYYMMDD');
  SELECT COUNT(*) + 1 INTO v_count FROM orders WHERE tenant_id = p_tenant_id AND DATE(created_at) = CURRENT_DATE;
  RETURN v_date || '-' || LPAD(v_count::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate loyalty points (1 point per 100 HUF spent)
CREATE OR REPLACE FUNCTION public.calculate_loyalty_points(p_total DECIMAL)
RETURNS INTEGER AS $$
BEGIN
  RETURN FLOOR(p_total / 100);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to auto-consume inventory when order is marked as preparing
CREATE OR REPLACE FUNCTION public.consume_inventory_on_order()
RETURNS TRIGGER AS $$
DECLARE
  rec RECORD;
  ingredient_rec RECORD;
BEGIN
  IF OLD.status = 'confirmed' AND NEW.status = 'preparing' THEN
    -- For each item in the order
    FOR rec IN SELECT * FROM order_items WHERE order_id = NEW.id
    LOOP
      -- For each ingredient in the recipe
      FOR ingredient_rec IN 
        SELECT ri.ingredient_id, ri.quantity * rec.quantity AS total_qty
        FROM recipe_ingredients ri
        WHERE ri.menu_item_id = rec.menu_item_id
      LOOP
        -- Deduct from stock
        UPDATE ingredients 
        SET current_stock = current_stock - ingredient_rec.total_qty
        WHERE id = ingredient_rec.ingredient_id AND tenant_id = NEW.tenant_id;
        
        -- Log transaction
        INSERT INTO inventory_transactions (tenant_id, ingredient_id, quantity, transaction_type, reference_type, reference_id, notes)
        VALUES (NEW.tenant_id, ingredient_rec.ingredient_id, ingredient_rec.total_qty, 'consumption', 'order', NEW.id, 'Auto-consumed from order #' || NEW.order_number);
      END LOOP;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER order_status_change_inventory AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION public.consume_inventory_on_order();