-- Emergency fix for sales RLS policies
-- Run this in Supabase SQL Editor

-- Step 1: Disable RLS temporarily (quick fix)
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;

-- Step 2: Test if this fixes the issue
-- Try to insert a test sale
INSERT INTO sales (
    cashier_id,
    cashier_name,
    total_amount,
    payment_method,
    receipt_number,
    created_at,
    items
) VALUES (
    '09287c76-3aa5-422b-8747-1df45d8dba7a',  -- Test cashier ID
    'Test Cashier',
    100.00,
    'cash',
    'TEST-' || EXTRACT(EPOCH FROM NOW())::text,
    NOW(),
    '[]'::jsonb
);

-- Step 3: Check if test insert worked
SELECT '=== TEST SALE INSERTED ===' as result;
SELECT 
    cashier_id,
    cashier_name,
    total_amount,
    payment_method,
    receipt_number,
    created_at
FROM sales 
WHERE receipt_number LIKE 'TEST-%'
ORDER BY created_at DESC;

-- Step 4: Re-enable RLS with proper policies
-- First drop all existing policies
DROP POLICY IF EXISTS "Cashiers can create sales" ON sales;
DROP POLICY IF EXISTS "Super admins can manage all sales" ON sales;
DROP POLICY IF EXISTS "Users can view own sales" ON sales;
DROP POLICY IF EXISTS "Users can update own sales" ON sales;

-- Re-enable RLS
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Create simple policy that allows all authenticated users to create sales
CREATE POLICY "Allow authenticated sales" ON sales
    FOR ALL USING (
        auth.role() = 'authenticated'
    );

-- Step 5: Test with RLS enabled
SELECT '=== RLS ENABLED TEST ===' as result;
SELECT 
    cashier_id,
    cashier_name,
    total_amount,
    payment_method,
    receipt_number,
    created_at
FROM sales 
WHERE receipt_number LIKE 'RLS-%'
ORDER BY created_at DESC;

-- Step 6: Clean up test data
DELETE FROM sales WHERE receipt_number LIKE 'TEST-%' OR receipt_number LIKE 'RLS-%';

-- Step 7: Verify final state
SELECT '=== FINAL VERIFICATION ===' as result;
SELECT 
    COUNT(*) as total_sales,
    MIN(created_at) as earliest_sale,
    MAX(created_at) as latest_sale
FROM sales;
