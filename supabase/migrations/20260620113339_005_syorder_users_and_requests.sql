/*
# SYORDER — Step 1: Extend users table and create restaurant_requests

Adds:
- role column to users (owner | staff | superadmin)
- is_superadmin boolean to users
- restaurant_requests table for the public application form
*/

-- Add role and is_superadmin columns to users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'role'
  ) THEN
    ALTER TABLE users ADD COLUMN role text NOT NULL DEFAULT 'owner';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_superadmin'
  ) THEN
    ALTER TABLE users ADD COLUMN is_superadmin boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Restaurant application/request table
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

CREATE INDEX IF NOT EXISTS idx_restaurant_requests_status ON restaurant_requests(status);
CREATE INDEX IF NOT EXISTS idx_restaurant_requests_email ON restaurant_requests(email);
CREATE INDEX IF NOT EXISTS idx_users_is_superadmin ON users(is_superadmin);
