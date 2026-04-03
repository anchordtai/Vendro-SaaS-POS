-- Vendro production RLS (run in Supabase SQL editor after schema exists)
-- Service role bypasses RLS; these policies apply to anon + authenticated clients.

-- Platform tenant for super_admin users (id must match src/services/auth/constants.ts)
INSERT INTO public.tenants (id, business_name, business_type, business_size, email)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Vendro Platform',
  'retail',
  'large',
  'platform@vendro.internal'
)
ON CONFLICT (id) DO NOTHING;

-- Helper: current user's tenant (not used for super_admin platform rows)
CREATE OR REPLACE FUNCTION public.current_user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'super_admin'::user_role
  );
$$;

-- USERS: own row only; super_admin sees all
DROP POLICY IF EXISTS "users_select" ON public.users;
CREATE POLICY "users_select" ON public.users
  FOR SELECT USING (auth.uid() = id OR public.is_super_admin());

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id OR public.is_super_admin());

-- TENANTS: same tenant or super_admin
DROP POLICY IF EXISTS "tenants_select" ON public.tenants;
CREATE POLICY "tenants_select" ON public.tenants
  FOR SELECT USING (
    public.is_super_admin()
    OR id = public.current_user_tenant_id()
  );

DROP POLICY IF EXISTS "tenants_update" ON public.tenants;
CREATE POLICY "tenants_update" ON public.tenants
  FOR UPDATE USING (
    public.is_super_admin()
    OR id = public.current_user_tenant_id()
  );

-- PLANS: global catalog — readable when active
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "plans_select_active" ON public.plans;
CREATE POLICY "plans_select_active" ON public.plans
  FOR SELECT USING (is_active = true OR public.is_super_admin());

-- SUBSCRIPTIONS: tenant-scoped
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subscriptions_tenant" ON public.subscriptions;
CREATE POLICY "subscriptions_tenant" ON public.subscriptions
  FOR ALL USING (
    public.is_super_admin()
    OR tenant_id = public.current_user_tenant_id()
  );

-- OUTLETS
DROP POLICY IF EXISTS "outlets_tenant" ON public.outlets;
CREATE POLICY "outlets_tenant" ON public.outlets
  FOR ALL USING (
    public.is_super_admin()
    OR tenant_id = public.current_user_tenant_id()
  );

-- PRODUCTS, SALES, SALE_ITEMS, etc. — tenant_id match
DROP POLICY IF EXISTS "products_tenant" ON public.products;
CREATE POLICY "products_tenant" ON public.products
  FOR ALL USING (
    public.is_super_admin()
    OR tenant_id = public.current_user_tenant_id()
  );

DROP POLICY IF EXISTS "sales_tenant" ON public.sales;
CREATE POLICY "sales_tenant" ON public.sales
  FOR ALL USING (
    public.is_super_admin()
    OR tenant_id = public.current_user_tenant_id()
  );

DROP POLICY IF EXISTS "sale_items_tenant" ON public.sale_items;
CREATE POLICY "sale_items_tenant" ON public.sale_items
  FOR ALL USING (
    public.is_super_admin()
    OR tenant_id = public.current_user_tenant_id()
  );

-- Optional: FEATURE_FLAGS if table exists
-- DROP POLICY IF EXISTS "feature_flags_tenant" ON public.feature_flags;
-- CREATE POLICY "feature_flags_tenant" ON public.feature_flags
--   FOR ALL USING (
--     public.is_super_admin()
--     OR tenant_id = public.current_user_tenant_id()
--   );
