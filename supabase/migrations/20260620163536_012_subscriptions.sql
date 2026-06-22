-- Subscriptions table for per-tenant license tracking
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE UNIQUE NOT NULL,
  plan_name TEXT NOT NULL DEFAULT 'Induló',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'trial')),
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  billing_period TEXT CHECK (billing_period IN ('havi', 'negyedeves', 'eves')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON subscriptions(tenant_id);

CREATE POLICY "select_own_subscription" ON subscriptions FOR SELECT
  TO authenticated USING (tenant_id = public.auth_tenant_id());

CREATE POLICY "superadmin_all_subscriptions" ON subscriptions FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_superadmin = true)
  );

-- Update trigger
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Insert a trial subscription for every existing tenant that doesn't have one
INSERT INTO subscriptions (tenant_id, plan_name, status, expires_at)
SELECT id, 'Induló', 'trial', NOW() + INTERVAL '30 days'
FROM tenants
WHERE id NOT IN (SELECT tenant_id FROM subscriptions);
