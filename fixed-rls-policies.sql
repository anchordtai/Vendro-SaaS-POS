-- Fixed Row Level Security policies for Vendro SaaS platform

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own tenant" ON tenants;
DROP POLICY IF EXISTS "Super admins can view all tenants" ON tenants;
DROP POLICY IF EXISTS "Users can view users from same tenant" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Tenant admins can manage tenant users" ON users;
DROP POLICY IF EXISTS "Users can view their tenant subscription" ON subscriptions;

-- Tenants table policies (FIXED - removed circular reference)
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

-- Users table policies (FIXED - simplified to avoid recursion)
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

-- Subscriptions table policies (FIXED)
CREATE POLICY "Users can view their tenant subscription" ON subscriptions
    FOR SELECT USING (
        tenant_id = (
            SELECT tenant_id FROM users 
            WHERE id = auth.uid()
            LIMIT 1
        )
    );

-- Enable RLS on all tables if not already enabled
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
