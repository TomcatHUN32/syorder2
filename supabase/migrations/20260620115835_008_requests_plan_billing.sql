/*
# Add plan and billing_period to restaurant_requests

1. Modified Tables
   - `restaurant_requests`: Added `plan` text column (induló / professzionális)
   - `restaurant_requests`: Added `billing_period` text column (havi / negyedéves / éves)
*/

ALTER TABLE restaurant_requests
  ADD COLUMN IF NOT EXISTS plan text,
  ADD COLUMN IF NOT EXISTS billing_period text;
