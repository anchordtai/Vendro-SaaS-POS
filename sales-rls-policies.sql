-- Create RLS policies for sales and sale_items tables
-- Run this in your Supabase SQL editor

-- Enable RLS on sales table
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Enable RLS on sale_items table  
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own sales" ON sales;
DROP POLICY IF EXISTS "Users can insert their own sales" ON sales;
DROP POLICY IF EXISTS "Users can update their own sales" ON sales;
DROP POLICY IF EXISTS "Users can delete their own sales" ON sales;

DROP POLICY IF EXISTS "Users can view sale items" ON sale_items;
DROP POLICY IF EXISTS "Users can insert sale items" ON sale_items;
DROP POLICY IF EXISTS "Users can update sale items" ON sale_items;
DROP POLICY IF EXISTS "Users can delete sale items" ON sale_items;

-- Create policies for sales table
CREATE POLICY "Users can view their own sales" ON sales
    FOR SELECT USING (auth.uid() = cashier_id);

CREATE POLICY "Users can insert their own sales" ON sales
    FOR INSERT WITH CHECK (auth.uid() = cashier_id);

CREATE POLICY "Users can update their own sales" ON sales
    FOR UPDATE USING (auth.uid() = cashier_id);

CREATE POLICY "Users can delete their own sales" ON sales
    FOR DELETE USING (auth.uid() = cashier_id);

-- Create policies for sale_items table
CREATE POLICY "Users can view sale items" ON sale_items
    FOR SELECT USING (true);

CREATE POLICY "Users can insert sale items" ON sale_items
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update sale items" ON sale_items
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete sale items" ON sale_items
    FOR DELETE USING (true);

-- Grant necessary permissions
GRANT ALL ON sales TO authenticated;
GRANT ALL ON sale_items TO authenticated;

-- Allow service role to bypass RLS for admin operations
ALTER TABLE sales FORCE ROW LEVEL SECURITY;
ALTER TABLE sale_items FORCE ROW LEVEL SECURITY;
