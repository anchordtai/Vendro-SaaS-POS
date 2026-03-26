-- Create Super Admin User for Vendro POS
-- This script creates a super admin user to access the admin dashboard

-- First, create the auth user (you need to do this via Supabase Auth UI or API)
-- Then run this SQL to create the user record

-- Insert super admin user record
-- Replace 'YOUR_SUPER_ADMIN_UUID' with the actual UUID from auth.users
INSERT INTO public.users (
    id,
    tenant_id, -- Super admin doesn't need a tenant, use a default
    name,
    email,
    role,
    status,
    created_at,
    updated_at
) VALUES (
    'YOUR_SUPER_ADMIN_UUID', -- Replace with actual auth.user.id
    '00000000-0000-0000-0000-000000000000', -- Default tenant ID for super admin
    'Super Admin',
    'admin@vendro.com',
    'super_admin',
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    role = 'super_admin',
    status = true,
    updated_at = NOW();

-- Alternative: Create a specific super admin tenant
INSERT INTO public.tenants (
    id,
    business_name,
    business_type,
    business_size,
    status,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'Vendro System Administration',
    'system',
    'enterprise',
    'active',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Grant super admin access to all data (bypass RLS)
-- This allows the super admin to see all tenant data
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS with super admin exceptions
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Create super admin policies that bypass tenant restrictions
CREATE POLICY "Super admin full access to users" ON public.users
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'super_admin' OR 
        auth.uid() = id
    );

CREATE POLICY "Super admin full access to tenants" ON public.tenants
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'super_admin'
    );

CREATE POLICY "Super admin full access to products" ON public.products
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'super_admin' OR 
        tenant_id = auth.uid()::text::uuid
    );

CREATE POLICY "Super admin full access to sales" ON public.sales
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'super_admin' OR 
        tenant_id = auth.uid()::text::uuid
    );

CREATE POLICY "Super admin full access to customers" ON public.customers
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'super_admin' OR 
        tenant_id = auth.uid()::text::uuid
    );

CREATE POLICY "Super admin full access to subscriptions" ON public.subscriptions
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'super_admin' OR 
        tenant_id = auth.uid()::text::uuid
    );
