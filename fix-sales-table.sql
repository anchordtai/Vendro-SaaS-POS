-- Fix missing columns in sales table
-- Run this in your Supabase SQL editor

-- Add missing columns to sales table
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS cashier_id UUID REFERENCES auth.users(id);

ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS cashier_name TEXT;

ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS receipt_number TEXT;

-- Update existing records with default values
UPDATE sales 
SET 
    cashier_name = COALESCE(cashier_name, 'System'),
    receipt_number = COALESCE(receipt_number, 'RCP' || EXTRACT(EPOCH FROM NOW())::text)
WHERE 
    cashier_name IS NULL OR receipt_number IS NULL;

-- Check the result
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'sales' 
  AND column_name IN ('cashier_id', 'cashier_name', 'receipt_number')
ORDER BY column_name;

-- Also verify sale_items table exists
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'sale_items' 
ORDER BY ordinal_position;
