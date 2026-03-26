-- Fix Row Level Security policies for sales and sale_items tables
-- Run this in your Supabase SQL editor

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own sale_items" ON sale_items;
DROP POLICY IF EXISTS "Users can insert their own sale_items" ON sale_items;
DROP POLICY IF EXISTS "Users can update their own sale_items" ON sale_items;
DROP POLICY IF EXISTS "Users can delete their own sale_items" ON sale_items;

-- Create new RLS policies for sale_items
CREATE POLICY "Users can view their own sale_items" ON sale_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM sales 
            WHERE sales.id = sale_items.sale_id 
            AND sales.tenant_id::text = auth.jwt() ->> 'tenant_id'
        )
    );

CREATE POLICY "Users can insert their own sale_items" ON sale_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM sales 
            WHERE sales.id = sale_items.sale_id 
            AND sales.tenant_id::text = auth.jwt() ->> 'tenant_id'
        )
    );

CREATE POLICY "Users can update their own sale_items" ON sale_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM sales 
            WHERE sales.id = sale_items.sale_id 
            AND sales.tenant_id::text = auth.jwt() ->> 'tenant_id'
        )
    );

CREATE POLICY "Users can delete their own sale_items" ON sale_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM sales 
            WHERE sales.id = sale_items.sale_id 
            AND sales.tenant_id::text = auth.jwt() ->> 'tenant_id'
        )
    );

-- Also fix sales table RLS policies if needed
DROP POLICY IF EXISTS "Users can view their own sales" ON sales;
DROP POLICY IF EXISTS "Users can insert their own sales" ON sales;
DROP POLICY IF EXISTS "Users can update their own sales" ON sales;
DROP POLICY IF EXISTS "Users can delete their own sales" ON sales;

CREATE POLICY "Users can view their own sales" ON sales
    FOR SELECT USING (tenant_id::text = auth.jwt() ->> 'tenant_id');

CREATE POLICY "Users can insert their own sales" ON sales
    FOR INSERT WITH CHECK (tenant_id::text = auth.jwt() ->> 'tenant_id');

CREATE POLICY "Users can update their own sales" ON sales
    FOR UPDATE USING (tenant_id::text = auth.jwt() ->> 'tenant_id');

CREATE POLICY "Users can delete their own sales" ON sales
    FOR DELETE USING (tenant_id::text = auth.jwt() ->> 'tenant_id');

-- Enable RLS on both tables if not already enabled
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON sale_items TO authenticated;
GRANT ALL ON sales TO authenticated;

-- Verify the policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('sales', 'sale_items')
ORDER BY tablename, policyname;
