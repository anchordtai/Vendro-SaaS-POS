-- Fix foreign key constraint for sales table
-- Run this in Supabase SQL Editor

-- Step 1: Check current sales table structure
SELECT '=== CURRENT SALES TABLE STRUCTURE ===' as table_name;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'sales' 
ORDER BY ordinal_position;

-- Step 2: Check if foreign key constraint exists
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    tc.update_rule,
    tc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu 
    ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'sales' 
AND tc.constraint_type = 'FOREIGN KEY';

-- Step 3: Drop the problematic foreign key constraint
ALTER TABLE sales DROP CONSTRAINT sales_cashier_id_fkey;

-- Step 4: Add new foreign key constraint that references staff table
ALTER TABLE sales 
ADD CONSTRAINT sales_cashier_id_fkey 
    FOREIGN KEY (cashier_id) 
    REFERENCES staff(id) 
    ON DELETE SET NULL;

-- Step 5: Re-enable RLS with correct policies
-- First drop existing policies
DROP POLICY IF EXISTS "Cashiers can create sales" ON sales;
DROP POLICY IF EXISTS "Super admins can manage all sales" ON sales;
DROP POLICY IF EXISTS "Users can view own sales" ON sales;
DROP POLICY IF EXISTS "Users can update own sales" ON sales;

-- Re-enable RLS
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Create policies that work with staff table
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

-- Step 6: Test the fix
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
    '09287c76-3aa5-422b-8747-1df45d8dba7a',  -- Staff ID
    'Test Cashier',
    100.00,
    'cash',
    'TEST-FK-' || EXTRACT(EPOCH FROM NOW())::text,
    NOW(),
    '[]'::jsonb
);

-- Step 7: Verify the fix worked
SELECT '=== FOREIGN KEY FIX TEST ===' as result;
SELECT 
    cashier_id,
    cashier_name,
    total_amount,
    receipt_number,
    created_at
FROM sales 
WHERE receipt_number LIKE 'TEST-FK-%'
ORDER BY created_at DESC;

-- Step 8: Clean up test data
DELETE FROM sales WHERE receipt_number LIKE 'TEST-FK-%';

-- Step 9: Final verification
SELECT '=== FINAL VERIFICATION ===' as result;
SELECT 
    COUNT(*) as total_sales,
    COUNT(DISTINCT cashier_id) as unique_cashiers
    MIN(created_at) as earliest_sale,
    MAX(created_at) as latest_sale
FROM sales;
