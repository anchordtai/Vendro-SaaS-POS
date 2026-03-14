-- Final fix for sales table missing columns
-- Run this in your Supabase SQL editor

-- Add items column to sales table
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS items JSONB;

-- Add cashier_id column if not exists
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS cashier_id UUID REFERENCES auth.users(id);

-- Add cashier_name column if not exists  
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS cashier_name TEXT;

-- Add receipt_number column if not exists
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS receipt_number TEXT;

-- Update existing records with default values
UPDATE sales 
SET 
    items = '[]',
    cashier_name = COALESCE(cashier_name, 'System'),
    receipt_number = COALESCE(receipt_number, 'RCP' || EXTRACT(EPOCH FROM NOW())::text)
WHERE 
    items IS NULL OR 
    cashier_name IS NULL OR 
    receipt_number IS NULL;

-- Check the final result
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'sales' 
  AND column_name IN ('items', 'cashier_id', 'cashier_name', 'receipt_number')
ORDER BY column_name;
