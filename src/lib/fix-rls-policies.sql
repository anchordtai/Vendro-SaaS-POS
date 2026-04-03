-- Fix RLS policies for users table

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Tenant admins can view tenant users" ON users;
DROP POLICY IF EXISTS "Tenant admins can update tenant users" ON users;
DROP POLICY IF EXISTS "Service role can manage all users" ON users;

-- Create new policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Tenant admins can view tenant users" ON users
  FOR SELECT
  USING (
    auth.role() = 'authenticated' 
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('tenant_admin', 'manager', 'super_admin')
      AND users.tenant_id = users.tenant_id
    )
  );

CREATE POLICY "Tenant admins can update tenant users" ON users
  FOR UPDATE
  USING (
    auth.role() = 'authenticated' 
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('tenant_admin', 'manager', 'super_admin')
      AND users.tenant_id = users.tenant_id
    )
  );

CREATE POLICY "Service role can manage all users" ON users
  FOR ALL
  USING (auth.role() = 'service_role');

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Also fix the auth.users RLS if it exists
-- Note: auth.users typically doesn't have RLS, but let's ensure it's disabled
ALTER TABLE auth.users DISABLE ROW LEVEL SECURITY;
