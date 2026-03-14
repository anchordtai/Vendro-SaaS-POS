-- Create RLS policies for sales table to allow cashiers to create sales
-- Run this in Supabase SQL Editor

-- First, check if sales table exists
SELECT '=== SALES TABLE EXISTS ===' as table_name;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'sales' 
ORDER BY ordinal_position;

-- Enable RLS on sales table (if not already enabled)
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Drop existing sales policies if they exist
DROP POLICY IF EXISTS "Cashiers can create sales" ON sales;
DROP POLICY IF EXISTS "Super admins can manage all sales" ON sales;
DROP POLICY IF EXISTS "Users can view own sales" ON sales;

-- Create RLS policies for sales table
CREATE POLICY "Cashiers can create sales" ON sales
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated'
        AND auth.jwt() ->> 'role' IN ('cashier', 'super_admin')
    );

CREATE POLICY "Super admins can manage all sales" ON sales
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'super_admin'
    );

CREATE POLICY "Users can view own sales" ON sales
    FOR SELECT USING (
        auth.role() = 'authenticated'
        AND (
            auth.jwt() ->> 'role' = 'super_admin'
            OR cashier_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own sales" ON sales
    FOR UPDATE USING (
        auth.role() = 'authenticated'
        AND (
            auth.jwt() ->> 'role' = 'super_admin'
            OR cashier_id = auth.uid()
        )
    );

-- Grant necessary permissions
GRANT ALL ON sales TO authenticated;

-- Verify policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
    with_check
FROM pg_policies 
WHERE tablename = 'sales'
ORDER BY policyname;

-- Test policy with a simple select (should work for authenticated users)
SELECT '=== POLICY TEST ===' as test_name;
SELECT COUNT(*) as can_select_sales
FROM sales 
WHERE cashier_id = auth.uid()
LIMIT 1;
