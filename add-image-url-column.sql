-- Add image_url column to products table
-- Run this in Supabase SQL Editor

ALTER TABLE products 
ADD COLUMN image_url TEXT;

-- Verify column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products' 
  AND table_schema = 'public'
  AND column_name = 'image_url';
