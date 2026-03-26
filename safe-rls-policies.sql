-- Simplified RLS policies - only for core tables that should exist

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own tenant" ON tenants;
DROP POLICY IF EXISTS "Super admins can view all tenants" ON tenants;
DROP POLICY IF EXISTS "Users can view users from same tenant" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Tenant admins can manage tenant users" ON users;
DROP POLICY IF EXISTS "Users can view their tenant subscription" ON subscriptions;

-- Core tables only - enable RLS if tables exist
DO $$
BEGIN
    -- Enable RLS on tenants table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenants' AND table_schema = 'public') THEN
        ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can view their own tenant" ON tenants
            FOR SELECT USING (
                auth.uid() IN (
                    SELECT users.id FROM users 
                    WHERE users.tenant_id = tenants.id
                )
            );
            
        CREATE POLICY "Super admins can view all tenants" ON tenants
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM users 
                    WHERE users.id = auth.uid() 
                    AND users.role = 'super_admin'
                )
            );
    END IF;
    
    -- Enable RLS on users table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        ALTER TABLE users ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can view users from same tenant" ON users
            FOR SELECT USING (
                tenant_id = (
                    SELECT tenant_id FROM users 
                    WHERE id = auth.uid()
                    LIMIT 1
                )
            );
            
        CREATE POLICY "Users can update their own profile" ON users
            FOR UPDATE USING (
                id = auth.uid()
            );
            
        CREATE POLICY "Tenant admins can manage tenant users" ON users
            FOR ALL USING (
                tenant_id = (
                    SELECT tenant_id FROM users 
                    WHERE id = auth.uid()
                    AND role IN ('tenant_admin', 'manager')
                    LIMIT 1
                )
            );
    END IF;
    
    -- Enable RLS on subscriptions table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions' AND table_schema = 'public') THEN
        ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can view their tenant subscription" ON subscriptions
            FOR SELECT USING (
                tenant_id = (
                    SELECT tenant_id FROM users 
                    WHERE id = auth.uid()
                    LIMIT 1
                )
            );
    END IF;
END $$;
