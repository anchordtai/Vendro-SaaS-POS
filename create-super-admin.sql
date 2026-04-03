-- Create Super Admin User for Vendro POS
-- This script creates a super admin user to access the admin dashboard

-- First, create the auth user (you need to do this via Supabase Auth UI or API)
-- Then run this SQL to create the user record

-- IMPORTANT:
-- - Your schema uses users.is_active (not users.status)
-- - Your tenants table in saas-schema.sql does NOT have a status column
-- - Do NOT disable RLS in production. Use the RLS helpers/policies in src/lib/vendro-rls-production.sql instead.

-- 1) Ensure platform tenant exists for super_admin users
-- Must match src/services/auth/constants.ts PLATFORM_TENANT_ID
INSERT INTO public.tenants (id, business_name, business_type, business_size, email)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Vendro Platform',
  'retail',
  'large',
  'platform@vendro.internal'
)
ON CONFLICT (id) DO NOTHING;

-- 2) Insert/update super admin user record
-- Replace YOUR_SUPER_ADMIN_UUID with the UUID from auth.users.id
INSERT INTO public.users (
  id,
  tenant_id,
  name,
  email,
  role,
  password_hash,
  is_active,
  created_at,
  updated_at
) VALUES (
  'YOUR_SUPER_ADMIN_UUID',
  '00000000-0000-0000-0000-000000000001',
  'Super Admin',
  'admin@vendro.com',
  'super_admin',
  'managed_by_supabase',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  tenant_id = EXCLUDED.tenant_id,
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  role = 'super_admin',
  is_active = true,
  updated_at = NOW();

-- 3) RLS note:
-- After running this, run src/lib/vendro-rls-production.sql to create safe super_admin-aware policies.
