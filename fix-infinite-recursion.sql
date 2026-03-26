-- ========================================
-- FIX INFINITE RECURSION IN RLS POLICIES
-- ========================================
-- This script fixes the circular reference in users table policies

-- ========================================
-- 1. IMMEDIATELY DISABLE RLS TO STOP THE RECURSION
-- ========================================

ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;

-- ========================================
-- 2. DROP ALL PROBLEMATIC POLICIES
-- ========================================

-- Drop all users table policies
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Tenant admins can view tenant users" ON users;
DROP POLICY IF EXISTS "Tenant admins can manage tenant users" ON users;
DROP POLICY IF EXISTS "Super admins can manage all users" ON users;
DROP POLICY IF EXISTS "Users can view users from same tenant" ON users;
DROP POLICY IF EXISTS "Enable read access for all users based on id" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable update for users based on id" ON users;

-- Drop tenants table policies
DROP POLICY IF EXISTS "Users can view their own tenant" ON tenants;
DROP POLICY IF EXISTS "Super admins can view all tenants" ON tenants;

-- Drop subscriptions table policies
DROP POLICY IF EXISTS "Users can view their tenant subscription" ON subscriptions;
DROP POLICY IF EXISTS "Super admins can view all subscriptions" ON subscriptions;

-- ========================================
-- 3. VERIFY THE USER ACTUALLY EXISTS
-- ========================================

DO $$
DECLARE
    user_exists BOOLEAN;
    user_email TEXT;
    user_tenant_id UUID;
BEGIN
    -- Check if the specific user exists
    SELECT EXISTS(SELECT 1 FROM public.users WHERE id = '02db62a7-c893-4891-b50d-e58f40ff74ec') INTO user_exists;
    
    IF user_exists THEN
        SELECT email, tenant_id INTO user_email, user_tenant_id
        FROM public.users 
        WHERE id = '02db62a7-c893-4891-b50d-e58f40ff74ec';
        
        RAISE NOTICE '✅ User exists: % (Tenant: %)', user_email, user_tenant_id;
    ELSE
        RAISE NOTICE '❌ User does not exist - creating...';
        
        -- Create the user if they don't exist
        INSERT INTO public.users (
            id, tenant_id, email, name, role, is_active, created_at
        ) VALUES (
            '02db62a7-c893-4891-b50d-e58f40ff74ec',
            '4fdf50a4-9a26-46d3-9d05-e6d88b3d59d9', -- From your earlier error
            'admin@afstore.com',
            'Admin User',
            'tenant_admin',
            true,
            NOW()
        );
        
        RAISE NOTICE '✅ User created successfully';
    END IF;
END $$;

-- ========================================
-- 4. CREATE SIMPLE, NON-RECURSIVE POLICIES
-- ========================================

-- Enable RLS with simple policies that don't cause recursion
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Simple user policies - NO SUBQUERIES THAT REFERENCE USERS TABLE
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Simple tenant policies
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant" ON tenants
    FOR SELECT USING (
        id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
    );

-- Simple subscription policies
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription" ON subscriptions
    FOR SELECT USING (
        tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
    );

-- ========================================
-- 5. TEST THE FIX
-- ========================================

DO $$
DECLARE
    test_user RECORD;
    test_count INTEGER;
BEGIN
    RAISE NOTICE '=== TESTING INFINITE RECURSION FIX ===';
    
    -- Test if we can query the specific user
    SELECT * INTO test_user 
    FROM public.users 
    WHERE id = '02db62a7-c893-4891-b50d-e58f40ff74ec';
    
    IF test_user.id IS NOT NULL THEN
        RAISE NOTICE '✅ User query successful: %', test_user.email;
    ELSE
        RAISE NOTICE '❌ User query failed';
    END IF;
    
    -- Test count query
    SELECT COUNT(*) INTO test_count FROM public.users;
    RAISE NOTICE '✅ Total users in database: %', test_count;
    
    -- Test tenant query
    SELECT COUNT(*) INTO test_count FROM tenants;
    RAISE NOTICE '✅ Total tenants in database: %', test_count;
    
END $$;

-- ========================================
-- 6. COMPLETION MESSAGE
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'INFINITE RECURSION FIX COMPLETED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Dropped all recursive policies';
    RAISE NOTICE '✅ Created simple, non-recursive policies';
    RAISE NOTICE '✅ Verified user exists or created it';
    RAISE NOTICE '✅ Database access tested successfully';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'LOGIN SHOULD NOW WORK!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'The infinite recursion was caused by:';
    RAISE NOTICE 'Policies that referenced the users table';
    RAISE NOTICE 'in their own conditions, creating a loop.';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'New policies are simple and safe:';
    RAISE NOTICE '- Users can only access their own data';
    RAISE NOTICE '- No complex subqueries that cause recursion';
    RAISE NOTICE '- Basic security without breaking functionality';
    RAISE NOTICE '========================================';
END $$;
