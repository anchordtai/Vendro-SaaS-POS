-- Add missing columns to products table
-- Run this in your Supabase SQL editor

-- Add status column (if not exists)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS status BOOLEAN DEFAULT true;

-- Add updated_at column (if not exists)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing records that might have NULL values
UPDATE products 
SET status = true 
WHERE status IS NULL;

UPDATE products 
SET updated_at = NOW() 
WHERE updated_at IS NULL;

-- Check the result
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'products' 
  AND column_name IN ('status', 'updated_at')
ORDER BY column_name;
