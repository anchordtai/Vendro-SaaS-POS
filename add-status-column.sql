-- Add status column to products table
-- This migration adds the missing 'status' column to the products table

-- First, add the column if it doesn't exist
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS status BOOLEAN DEFAULT true;

-- Update existing records to have status = true by default
UPDATE products 
SET status = true 
WHERE status IS NULL;

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'products' 
  AND column_name = 'status';

-- Add comment to the column
COMMENT ON COLUMN products.status IS 'Whether the product is active/enabled for sale';
