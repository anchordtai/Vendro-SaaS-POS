-- Simple script to add status column
-- Run this in your Supabase SQL editor

-- Add the status column (will fail if already exists, but that's ok)
ALTER TABLE products 
ADD COLUMN status BOOLEAN DEFAULT true;

-- Update any existing records that might have NULL status
UPDATE products 
SET status = true 
WHERE status IS NULL;

-- Check the result
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'products' 
  AND column_name = 'status';
