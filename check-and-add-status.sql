-- Check if status column exists and add it if it doesn't
-- Run this in your Supabase SQL editor

-- First, check if the column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'status'
    ) THEN
        -- Column exists, do nothing
        RAISE NOTICE 'Status column already exists in products table';
    ELSE
        -- Column doesn't exist, add it
        ALTER TABLE products 
        ADD COLUMN status BOOLEAN DEFAULT true;
        
        -- Update existing records to have status = true by default
        UPDATE products 
        SET status = true 
        WHERE status IS NULL;
        
        RAISE NOTICE 'Status column added to products table';
    END IF;
END $$;

-- Verify the column was added
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'products' 
  AND column_name = 'status';
