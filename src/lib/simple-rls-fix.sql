-- Simple RLS fix - disable RLS temporarily for testing

-- Disable RLS on users table (temporary fix)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Disable RLS on auth.users (should already be disabled)
ALTER TABLE auth.users DISABLE ROW LEVEL SECURITY;

-- If you need RLS enabled, use this simpler policy later:
/*
-- Enable RLS first
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Simple policy for all authenticated users
CREATE POLICY "Enable all operations for authenticated users" ON users
  FOR ALL
  USING (auth.role() = 'authenticated');

-- Policy for service role (bypasses all restrictions)
CREATE POLICY "Service role full access" ON users
  FOR ALL
  USING (auth.role() = 'service_role');
*/
