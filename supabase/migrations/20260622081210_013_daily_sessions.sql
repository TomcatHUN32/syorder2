-- Migration 013: Register Sessions for Daily Open/Close
CREATE TABLE IF NOT EXISTS register_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  opened_by UUID REFERENCES users(id) NOT NULL,
  closed_by UUID REFERENCES users(id),
  opened_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  closed_at TIMESTAMPTZ,
  starting_cash DECIMAL(12,2) DEFAULT 0 NOT NULL,
  expected_cash DECIMAL(12,2),
  actual_cash DECIMAL(12,2),
  total_sales DECIMAL(12,2) DEFAULT 0,
  total_canceled DECIMAL(12,2) DEFAULT 0,
  total_payouts DECIMAL(12,2) DEFAULT 0,
  payout_records JSONB DEFAULT '[]', -- JSON array of: {id, amount, reason, created_at, created_by_name}
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE register_sessions ENABLE ROW LEVEL SECURITY;

-- Dynamic RLS Policies
DROP POLICY IF EXISTS "select_own_register_session" ON register_sessions;
CREATE POLICY "select_own_register_session" ON register_sessions FOR SELECT
  TO authenticated USING (tenant_id = auth_tenant_id() OR is_superadmin());

DROP POLICY IF EXISTS "insert_own_register_session" ON register_sessions;
CREATE POLICY "insert_own_register_session" ON register_sessions FOR INSERT
  TO authenticated WITH CHECK (tenant_id = auth_tenant_id() OR is_superadmin());

DROP POLICY IF EXISTS "update_own_register_session" ON register_sessions;
CREATE POLICY "update_own_register_session" ON register_sessions FOR UPDATE
  TO authenticated USING (tenant_id = auth_tenant_id() OR is_superadmin());

-- Create Trigger for updated_at
CREATE TRIGGER update_register_sessions_updated_at
  BEFORE UPDATE ON register_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
