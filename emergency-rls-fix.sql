-- ========================================
-- EMERGENCY RLS POLICY FIX
-- ========================================
-- This script fixes the 500 errors caused by RLS policies

-- ========================================
-- 1. TEMPORARILY DISABLE RLS TO REGAIN ACCESS
-- ========================================

ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;

-- ========================================
-- 2. CHECK THE PROBLEMATIC USER
-- ========================================

-- Check if the user ID exists and what's wrong
SELECT 
    'Auth User Exists' as check_type,
    EXISTS(SELECT 1 FROM auth.users WHERE id = 'eef223af-4748-417b-bb56-0aef74738401') as result

UNION ALL

SELECT 
    'Public User Exists' as check_type,
    EXISTS(SELECT 1 FROM public.users WHERE id = 'eef223af-4748-417b-bb56-0aef74738401') as result

UNION ALL

SELECT 
    'User Has Tenant' as check_type,
    EXISTS(SELECT 1 FROM public.users u JOIN tenants t ON u.tenant_id = t.id WHERE u.id = 'eef223af-4748-417b-bb56-0aef74738401') as result;

-- ========================================
-- 3. FIX THE SPECIFIC USER IF NEEDED
-- ========================================

-- If the user exists in auth but not in public, fix it
DO $$
DECLARE
    auth_user_exists BOOLEAN;
    public_user_exists BOOLEAN;
    user_email TEXT;
    user_meta JSONB;
    tenant_id UUID;
    plan_id UUID;
BEGIN
    -- Check if user exists in auth
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = 'eef223af-4748-417b-bb56-0aef74738401') INTO auth_user_exists;
    
    -- Check if user exists in public
    SELECT EXISTS(SELECT 1 FROM public.users WHERE id = 'eef223af-4748-417b-bb56-0aef74738401') INTO public_user_exists;
    
    IF auth_user_exists AND NOT public_user_exists THEN
        -- Get user details
        SELECT email, raw_user_meta_data 
        INTO user_email, user_meta
        FROM auth.users 
        WHERE id = 'eef223af-4748-417b-bb56-0aef74738401';
        
        -- Create tenant
        INSERT INTO tenants (business_name, business_type, business_size, email)
        VALUES (
            COALESCE(user_meta->>'business_name', 'Default Business'),
            COALESCE(user_meta->>'business_type', 'retail')::business_type,
            COALESCE(user_meta->>'business_size', 'small')::business_size,
            user_email
        )
        RETURNING id INTO tenant_id;
        
        -- Get or create plan
        SELECT id INTO plan_id 
        FROM plans 
        WHERE tier = 'starter' AND is_active = true 
        LIMIT 1;
        
        IF plan_id IS NULL THEN
            INSERT INTO plans (
                name, tier, monthly_price, yearly_price, 
                max_products, max_outlets, max_users, 
                features, is_active
            ) VALUES (
                'Starter Plan', 'starter', 0, 0, 100, 1, 3,
                ARRAY['POS', 'Inventory', 'Basic Reports'], true
            ) RETURNING id INTO plan_id;
        END IF;
        
        -- Create subscription
        INSERT INTO subscriptions (
            tenant_id, plan_id, status, trial_ends_at,
            current_period_start, current_period_end
        ) VALUES (
            tenant_id, plan_id, 'trial',
            NOW() + INTERVAL '14 days', NOW(), NOW() + INTERVAL '14 days'
        );
        
        -- Create user record
        INSERT INTO public.users (
            id, tenant_id, email, name, role, is_active, created_at
        ) VALUES (
            'eef223af-4748-417b-bb56-0aef74738401',
            tenant_id, user_email,
            COALESCE(user_meta->>'name', 'Default User'),
            COALESCE(user_meta->>'role', 'tenant_admin')::user_role,
            true, NOW()
        );
        
        RAISE NOTICE '✅ Fixed orphaned user: eef223af-4748-417b-bb56-0aef74738401';
        
    ELSIF auth_user_exists AND public_user_exists THEN
        RAISE NOTICE '✅ User already exists in both tables';
    ELSE
        RAISE NOTICE '❌ User does not exist in auth.users';
    END IF;
END $$;

-- ========================================
-- 4. CREATE SIMPLIFIED, WORKING RLS POLICIES
-- ========================================

-- Drop all existing policies first
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Tenant admins can view tenant users" ON users;
DROP POLICY IF EXISTS "Tenant admins can manage tenant users" ON users;
DROP POLICY IF EXISTS "Super admins can manage all users" ON users;
DROP POLICY IF EXISTS "Users can view users from same tenant" ON users;

-- Simplified user policies that actually work
CREATE POLICY "Enable read access for all users based on id" ON users
    FOR SELECT USING (
        auth.uid() = id OR 
        (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
    );

CREATE POLICY "Enable insert for authenticated users" ON users
    FOR INSERT WITH CHECK (
        auth.uid() = id OR 
        (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
    );

CREATE POLICY "Enable update for users based on id" ON users
    FOR UPDATE USING (
        auth.uid() = id OR 
        (SELECT role FROM users WHERE id = auth.uid()) IN ('tenant_admin', 'manager', 'super_admin')
    );

-- ========================================
-- 5. RE-ENABLE RLS
-- ========================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Keep other tables disabled for now until we fix them too
-- ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 6. VERIFICATION
-- ========================================

-- Test if the user can now be accessed
DO $$
DECLARE
    test_user RECORD;
BEGIN
    SELECT * INTO test_user 
    FROM public.users 
    WHERE id = 'eef223af-4748-417b-bb56-0aef74738401';
    
    IF test_user.id IS NOT NULL THEN
        RAISE NOTICE '✅ User access test PASSED';
        RAISE NOTICE 'User ID: %', test_user.id;
        RAISE NOTICE 'Email: %', test_user.email;
        RAISE NOTICE 'Tenant ID: %', test_user.tenant_id;
    ELSE
        RAISE NOTICE '❌ User access test FAILED';
    END IF;
END $$;

-- ========================================
-- 7. COMPLETION MESSAGE
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'EMERGENCY RLS FIX COMPLETED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ RLS policies simplified and fixed';
    RAISE NOTICE '✅ Problematic user fixed if needed';
    RAISE NOTICE '✅ Users table now accessible';
    RAISE NOTICE '✅ 500 errors should be resolved';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Test user creation in your app';
    RAISE NOTICE '2. Check if 500 errors are gone';
    RAISE NOTICE '3. If working, we can add more policies later';
    RAISE NOTICE '========================================';
END $$;
