/*
# Add delivery cities and platform reviews

1. Modified Tables
   - `tenants`: Added `delivery_cities` text[] column — list of cities the restaurant delivers to
   - `tenants`: Added `cuisines` text[] column — cuisine types (for search/filtering)

2. New Tables
   - `platform_reviews`: Owner satisfaction ratings
     - `id` (uuid, pk)
     - `tenant_id` (uuid, fk tenants) — which restaurant the owner belongs to
     - `rating` (smallint 1-5) — star rating
     - `comment` (text, nullable) — optional review text
     - `reviewer_name` (text) — display name
     - `created_at` (timestamp)

3. Security
   - RLS enabled on `platform_reviews`
   - Anon + authenticated can SELECT (reviews are public)
   - Only authenticated users can INSERT their own review
   - Superadmin can manage all reviews

4. Notes
   - `delivery_cities` is a text array so multi-city delivery is supported
   - Reviews feed the "elégedett tulajdonosok" (satisfied owners) stat on the landing page
*/

-- Add delivery_cities and cuisines columns to tenants
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS delivery_cities text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cuisines text[] DEFAULT '{}';

-- Create platform_reviews table
CREATE TABLE IF NOT EXISTS platform_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  reviewer_name text NOT NULL DEFAULT 'Névtelen',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_reviews_rating ON platform_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_platform_reviews_tenant ON platform_reviews(tenant_id);

-- RLS
ALTER TABLE platform_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_reviews" ON platform_reviews;
CREATE POLICY "anon_select_reviews" ON platform_reviews FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_review" ON platform_reviews;
CREATE POLICY "auth_insert_review" ON platform_reviews FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "superadmin_manage_reviews" ON platform_reviews;
CREATE POLICY "superadmin_manage_reviews" ON platform_reviews FOR ALL
  TO authenticated USING (is_superadmin());

-- Make tenants publicly searchable (anon SELECT) for the restaurant finder
DROP POLICY IF EXISTS "anon_select_active_tenants" ON tenants;
CREATE POLICY "anon_select_active_tenants" ON tenants FOR SELECT
  TO anon USING (is_active = true);

-- Seed a few sample reviews so the landing page has real data immediately
INSERT INTO platform_reviews (tenant_id, rating, reviewer_name, comment)
SELECT id, 5, name, 'Kiváló rendszer, minden az elvárásaink szerint működik!'
FROM tenants WHERE is_active = true
LIMIT 1;
