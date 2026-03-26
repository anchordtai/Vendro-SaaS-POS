-- ========================================
-- DEBUG USER CREATION ISSUES
-- ========================================
-- Run this script to identify and fix user creation problems

-- ========================================
-- 1. CHECK CURRENT SYSTEM STATUS
-- ========================================

-- Check if RLS is properly enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity 
FROM pg_tables 
WHERE tablename IN ('users', 'tenants', 'subscriptions', 'plans')
ORDER BY tablename;

-- Check existing policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('users', 'tenants', 'subscriptions', 'plans')
ORDER BY tablename, policyname;

-- ========================================
-- 2. CHECK ORPHANED USERS
-- ========================================

-- Count auth users vs public users
SELECT 
    'Auth Users' as user_type,
    COUNT(*) as count
FROM auth.users

UNION ALL

SELECT 
    'Public Users' as user_type,
    COUNT(*) as count
FROM public.users

UNION ALL

SELECT 
    'Orphaned Auth Users' as user_type,
    COUNT(*) as count
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

-- ========================================
-- 3. CHECK TABLE STRUCTURES
-- ========================================

-- Check users table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check tenants table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'tenants' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if plans table exists and has data
SELECT 
    'Plans Table Exists' as check_type,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'plans' AND table_schema = 'public') as result

UNION ALL

SELECT 
    'Plans Have Data' as check_type,
    EXISTS(SELECT 1 FROM plans LIMIT 1) as result

UNION ALL

SELECT 
    'Starter Plan Exists' as check_type,
    EXISTS(SELECT 1 FROM plans WHERE tier = 'starter' AND is_active = true) as result;

-- ========================================
-- 4. TEST USER CREATION MANUALLY
-- ========================================

-- First, let's try to create a test auth user manually
-- (This will help us identify where the issue occurs)

-- Check if we can insert into users table directly
DO $$
DECLARE
    test_user_id UUID := '12345678-1234-1234-1234-123456789abc';
    test_tenant_id UUID := '87654321-4321-4321-4321-cba987654321';
    test_plan_id UUID;
BEGIN
    RAISE NOTICE '=== TESTING USER CREATION ===';
    
    -- Get a valid plan ID
    SELECT id INTO test_plan_id 
    FROM plans 
    WHERE tier = 'starter' AND is_active = true 
    LIMIT 1;
    
    IF test_plan_id IS NULL THEN
        RAISE NOTICE '❌ No starter plan found - creating one...';
        
        -- Create a starter plan if none exists
        INSERT INTO plans (
            name, 
            tier, 
            monthly_price, 
            yearly_price, 
            max_products, 
            max_outlets, 
            max_users, 
            features, 
            is_active
        ) VALUES (
            'Starter Plan',
            'starter',
            0,
            0,
            100,
            1,
            3,
            ARRAY['POS', 'Inventory', 'Basic Reports'],
            true
        ) RETURNING id INTO test_plan_id;
        
        RAISE NOTICE '✅ Created starter plan with ID: %', test_plan_id;
    ELSE
        RAISE NOTICE '✅ Found starter plan with ID: %', test_plan_id;
    END IF;
    
    -- Clean up any existing test data
    DELETE FROM public.users WHERE id = test_user_id;
    DELETE FROM tenants WHERE id = test_tenant_id;
    DELETE FROM subscriptions WHERE tenant_id = test_tenant_id;
    
    -- Test tenant creation
    BEGIN
        INSERT INTO tenants (
            id,
            business_name, 
            business_type, 
            business_size, 
            email
        ) VALUES (
            test_tenant_id,
            'Test Business',
            'retail',
            'small',
            'test@example.com'
        );
        
        RAISE NOTICE '✅ Tenant creation successful';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Tenant creation failed: %', SQLERRM;
        RETURN;
    END;
    
    -- Test subscription creation
    BEGIN
        INSERT INTO subscriptions (
            tenant_id, 
            plan_id, 
            status, 
            trial_ends_at,
            current_period_start,
            current_period_end
        ) VALUES (
            test_tenant_id,
            test_plan_id,
            'trial',
            NOW() + INTERVAL '14 days',
            NOW(),
            NOW() + INTERVAL '14 days'
        );
        
        RAISE NOTICE '✅ Subscription creation successful';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Subscription creation failed: %', SQLERRM;
        RETURN;
    END;
    
    -- Test user creation
    BEGIN
        INSERT INTO public.users (
            id,
            tenant_id,
            email,
            name,
            role,
            is_active,
            created_at
        ) VALUES (
            test_user_id,
            test_tenant_id,
            'test@example.com',
            'Test User',
            'tenant_admin',
            true,
            NOW()
        );
        
        RAISE NOTICE '✅ User creation successful';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ User creation failed: %', SQLERRM;
        RETURN;
    END;
    
    -- Clean up test data
    DELETE FROM public.users WHERE id = test_user_id;
    DELETE FROM subscriptions WHERE tenant_id = test_tenant_id;
    DELETE FROM tenants WHERE id = test_tenant_id;
    
    RAISE NOTICE '✅ All tests completed successfully - system is working!';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '💥 Test failed with error: %', SQLERRM;
END $$;

-- ========================================
-- 5. CHECK TRIGGERS AND FUNCTIONS
-- ========================================

-- Check if trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_condition,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Check if functions exist
SELECT 
    proname,
    prosrc
FROM pg_proc 
WHERE proname IN ('ensure_user_exists', 'self_heal_user', 'fix_existing_users');

-- ========================================
-- 6. PROVIDE SOLUTIONS
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DEBUGGING COMPLETE - NEXT STEPS';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'If tests passed above, the issue might be:';
    RAISE NOTICE '1. Frontend sending invalid data';
    RAISE NOTICE '2. API endpoint not working correctly';
    RAISE NOTICE '3. Permission issues in the application';
    RAISE NOTICE '';
    RAISE NOTICE 'Common fixes:';
    RAISE NOTICE '1. Check browser console for JavaScript errors';
    RAISE NOTICE '2. Verify API requests in Network tab';
    RAISE NOTICE '3. Ensure user is logged in with proper permissions';
    RAISE NOTICE '4. Check Supabase logs for detailed errors';
    RAISE NOTICE '========================================';
END $$;
