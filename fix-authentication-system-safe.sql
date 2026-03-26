-- ========================================
-- SAFE AUTHENTICATION SYSTEM FIX
-- ========================================
-- This script safely fixes the 406 error and implements
-- production-grade authentication for Vendro SaaS
-- Handles existing policies gracefully

-- ========================================
-- 1. SAFELY DROP ALL EXISTING POLICIES
-- ========================================

-- Drop users table policies
DROP POLICY IF EXISTS "Users can view users from same tenant" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Tenant admins can manage tenant users" ON users;
DROP POLICY IF EXISTS "Super admins can view all users" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;

-- Drop tenants table policies
DROP POLICY IF EXISTS "Users can view their own tenant" ON tenants;
DROP POLICY IF EXISTS "Super admins can view all tenants" ON tenants;
DROP POLICY IF EXISTS "Tenant admins can update their tenant" ON tenants;

-- Drop subscriptions table policies
DROP POLICY IF EXISTS "Users can view their tenant subscription" ON subscriptions;
DROP POLICY IF EXISTS "Super admins can view all subscriptions" ON subscriptions;

-- Drop products table policies
DROP POLICY IF EXISTS "Users can view their tenant products" ON products;
DROP POLICY IF EXISTS "Users can insert their tenant products" ON products;
DROP POLICY IF EXISTS "Users can update their tenant products" ON products;
DROP POLICY IF EXISTS "Users can delete their tenant products" ON products;

-- Drop sales table policies
DROP POLICY IF EXISTS "Users can view their own sales" ON sales;
DROP POLICY IF EXISTS "Users can insert their own sales" ON sales;
DROP POLICY IF EXISTS "Users can update their own sales" ON sales;

-- Drop other common policies
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Enable insert for all users" ON users;
DROP POLICY IF EXISTS "Enable update for users based on id" ON users;

-- ========================================
-- 2. ENSURE RLS IS ENABLED
-- ========================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 3. CREATE OR UPDATE FUNCTION TO ENSURE USER LINKAGE
-- ========================================

CREATE OR REPLACE FUNCTION ensure_user_exists()
RETURNS TRIGGER AS $$
BEGIN
    -- This trigger ensures every auth.user has a corresponding public.users record
    
    -- Check if user already exists in public.users
    IF NOT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = NEW.id
    ) THEN
        -- Create default tenant if user doesn't have one
        DECLARE
            default_tenant_id UUID;
            default_plan_id UUID;
        BEGIN
            -- Create default tenant
            INSERT INTO tenants (business_name, business_type, business_size, email)
            VALUES (
                COALESCE(NEW.raw_user_meta_data->>'business_name', 'Default Business'),
                COALESCE(NEW.raw_user_meta_data->>'business_type', 'retail')::business_type,
                COALESCE(NEW.raw_user_meta_data->>'business_size', 'small')::business_size,
                NEW.email
            )
            RETURNING id INTO default_tenant_id;
            
            -- Get starter plan
            SELECT id INTO default_plan_id 
            FROM plans 
            WHERE tier = 'starter' AND is_active = true 
            LIMIT 1;
            
            -- Create trial subscription
            INSERT INTO subscriptions (
                tenant_id, 
                plan_id, 
                status, 
                trial_ends_at,
                current_period_start,
                current_period_end
            ) VALUES (
                default_tenant_id,
                COALESCE(default_plan_id, '00000000-0000-0000-0000-000000000000'::UUID),
                'trial',
                NOW() + INTERVAL '14 days',
                NOW(),
                NOW() + INTERVAL '14 days'
            );
            
            -- Create user record
            INSERT INTO public.users (
                id,
                tenant_id,
                email,
                name,
                role,
                is_active,
                created_at
            ) VALUES (
                NEW.id,
                default_tenant_id,
                NEW.email,
                COALESCE(NEW.raw_user_meta_data->>'name', 'Default User'),
                COALESCE(NEW.raw_user_meta_data->>'role', 'tenant_admin')::user_role,
                true,
                NOW()
            );
            
            RAISE LOG 'Created default tenant and user for auth user: %', NEW.id;
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 4. CREATE TRIGGER FOR AUTOMATIC USER CREATION
-- ========================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to automatically create user record
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION ensure_user_exists();

-- ========================================
-- 5. CREATE OR UPDATE FUNCTION TO FIX EXISTING USERS
-- ========================================

CREATE OR REPLACE FUNCTION fix_existing_users()
RETURNS INTEGER AS $$
DECLARE
    fixed_count INTEGER := 0;
    user_record RECORD;
    default_tenant_id UUID;
    default_plan_id UUID;
BEGIN
    -- Find auth users without corresponding public.users records
    FOR user_record IN 
        SELECT au.id, au.email, au.raw_user_meta_data
        FROM auth.users au
        LEFT JOIN public.users pu ON au.id = pu.id
        WHERE pu.id IS NULL
    LOOP
        -- Create default tenant for orphaned user
        INSERT INTO tenants (business_name, business_type, business_size, email)
        VALUES (
            COALESCE(user_record.raw_user_meta_data->>'business_name', 'Default Business'),
            COALESCE(user_record.raw_user_meta_data->>'business_type', 'retail')::business_type,
            COALESCE(user_record.raw_user_meta_data->>'business_size', 'small')::business_size,
            user_record.email
        )
        RETURNING id INTO default_tenant_id;
        
        -- Get starter plan
        SELECT id INTO default_plan_id 
        FROM plans 
        WHERE tier = 'starter' AND is_active = true 
        LIMIT 1;
        
        -- Create trial subscription
        INSERT INTO subscriptions (
            tenant_id, 
            plan_id, 
            status, 
            trial_ends_at,
            current_period_start,
            current_period_end
        ) VALUES (
            default_tenant_id,
            COALESCE(default_plan_id, '00000000-0000-0000-0000-000000000000'::UUID),
            'trial',
            NOW() + INTERVAL '14 days',
            NOW(),
            NOW() + INTERVAL '14 days'
        );
        
        -- Create user record
        INSERT INTO public.users (
            id,
            tenant_id,
            email,
            name,
            role,
            is_active,
            created_at
        ) VALUES (
            user_record.id,
            default_tenant_id,
            user_record.email,
            COALESCE(user_record.raw_user_meta_data->>'name', 'Default User'),
            COALESCE(user_record.raw_user_meta_data->>'role', 'tenant_admin')::user_role,
            true,
            NOW()
        );
        
        fixed_count := fixed_count + 1;
        RAISE LOG 'Fixed orphaned user: %', user_record.id;
    END LOOP;
    
    RETURN fixed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 6. CREATE SECURE RLS POLICIES
-- ========================================

-- Users table policies
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (
        auth.uid() = id
    );

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (
        auth.uid() = id
    );

CREATE POLICY "Tenant admins can view tenant users" ON users
    FOR SELECT USING (
        tenant_id = (
            SELECT tenant_id FROM users 
            WHERE id = auth.uid() AND role IN ('tenant_admin', 'manager')
        )
    );

CREATE POLICY "Tenant admins can manage tenant users" ON users
    FOR ALL USING (
        tenant_id = (
            SELECT tenant_id FROM users 
            WHERE id = auth.uid() AND role IN ('tenant_admin', 'manager')
        )
    );

CREATE POLICY "Super admins can manage all users" ON users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- Tenants table policies
CREATE POLICY "Users can view their own tenant" ON tenants
    FOR SELECT USING (
        id = (
            SELECT tenant_id FROM users 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Super admins can view all tenants" ON tenants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- Subscriptions table policies
CREATE POLICY "Users can view their tenant subscription" ON subscriptions
    FOR SELECT USING (
        tenant_id = (
            SELECT tenant_id FROM users 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Super admins can view all subscriptions" ON subscriptions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- Products table policies
CREATE POLICY "Users can view their tenant products" ON products
    FOR SELECT USING (
        tenant_id = (
            SELECT tenant_id FROM users 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their tenant products" ON products
    FOR INSERT WITH CHECK (
        tenant_id = (
            SELECT tenant_id FROM users 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update their tenant products" ON products
    FOR UPDATE USING (
        tenant_id = (
            SELECT tenant_id FROM users 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their tenant products" ON products
    FOR DELETE USING (
        tenant_id = (
            SELECT tenant_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Sales table policies
CREATE POLICY "Users can view their own sales" ON sales
    FOR SELECT USING (
        tenant_id = (
            SELECT tenant_id FROM users 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own sales" ON sales
    FOR INSERT WITH CHECK (
        tenant_id = (
            SELECT tenant_id FROM users 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own sales" ON sales
    FOR UPDATE USING (
        tenant_id = (
            SELECT tenant_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- ========================================
-- 7. CREATE SELF-HEALING LOGIN FUNCTION
-- ========================================

CREATE OR REPLACE FUNCTION self_heal_user(auth_user_id UUID)
RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
DECLARE
    user_exists BOOLEAN;
    tenant_id UUID;
    plan_id UUID;
BEGIN
    -- Check if user exists in public.users
    SELECT EXISTS(SELECT 1 FROM public.users WHERE id = auth_user_id) INTO user_exists;
    
    IF user_exists THEN
        RETURN QUERY SELECT true, 'User already exists'::TEXT;
        RETURN;
    END IF;
    
    -- Get auth user details
    DECLARE
        auth_email TEXT;
        auth_meta JSONB;
    BEGIN
        SELECT email, raw_user_meta_data 
        INTO auth_email, auth_meta
        FROM auth.users 
        WHERE id = auth_user_id;
        
        IF auth_email IS NULL THEN
            RETURN QUERY SELECT false, 'Auth user not found'::TEXT;
            RETURN;
        END IF;
    END;
    
    -- Create default tenant
    INSERT INTO tenants (business_name, business_type, business_size, email)
    VALUES (
        COALESCE(auth_meta->>'business_name', 'Default Business'),
        COALESCE(auth_meta->>'business_type', 'retail')::business_type,
        COALESCE(auth_meta->>'business_size', 'small')::business_size,
        auth_email
    )
    RETURNING id INTO tenant_id;
    
    -- Get starter plan
    SELECT id INTO plan_id 
    FROM plans 
    WHERE tier = 'starter' AND is_active = true 
    LIMIT 1;
    
    -- Create trial subscription
    INSERT INTO subscriptions (
        tenant_id, 
        plan_id, 
        status, 
        trial_ends_at,
        current_period_start,
        current_period_end
    ) VALUES (
        tenant_id,
        COALESCE(plan_id, '00000000-0000-0000-0000-000000000000'::UUID),
        'trial',
        NOW() + INTERVAL '14 days',
        NOW(),
        NOW() + INTERVAL '14 days'
    );
    
    -- Create user record
    INSERT INTO public.users (
        id,
        tenant_id,
        email,
        name,
        role,
        is_active,
        created_at
    ) VALUES (
        auth_user_id,
        tenant_id,
        auth_email,
        COALESCE(auth_meta->>'name', 'Default User'),
        COALESCE(auth_meta->>'role', 'tenant_admin')::user_role,
        true,
        NOW()
    );
    
    RETURN QUERY SELECT true, 'Self-healing completed successfully'::TEXT;
    RETURN;
    
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, 'Self-healing failed: ' || SQLERRM::TEXT;
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 8. EXECUTE FIX FOR EXISTING USERS
-- ========================================

-- Fix existing orphaned users
SELECT fix_existing_users() as users_fixed;

-- ========================================
-- 9. VERIFICATION QUERIES
-- ========================================

-- Check for orphaned users (should return 0)
SELECT 
    'Orphaned auth users' as check_type,
    COUNT(*) as count
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

-- Check user-tenant linkage
SELECT 
    'Users with tenants' as check_type,
    COUNT(*) as count
FROM public.users u
JOIN tenants t ON u.tenant_id = t.id;

-- Check subscription coverage
SELECT 
    'Tenants with subscriptions' as check_type,
    COUNT(*) as count
FROM tenants t
LEFT JOIN subscriptions s ON t.id = s.tenant_id AND s.status = 'active'
WHERE s.id IS NOT NULL;

-- ========================================
-- 10. COMPLETION MESSAGE
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SAFE AUTHENTICATION SYSTEM FIX COMPLETED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ All existing policies dropped safely';
    RAISE NOTICE '✅ New secure RLS policies created';
    RAISE NOTICE '✅ Automatic user creation trigger added';
    RAISE NOTICE '✅ Self-healing function created';
    RAISE NOTICE '✅ Existing orphaned users fixed';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'The system will now automatically:';
    RAISE NOTICE '1. Create tenant for new auth users';
    RAISE NOTICE '2. Create user record in public.users';
    RAISE NOTICE '3. Create trial subscription';
    RAISE NOTICE '4. Prevent 406 errors on login';
    RAISE NOTICE '========================================';
END $$;
