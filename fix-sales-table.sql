-- Fix missing columns in sales table
-- Run this in your Supabase SQL editor

-- Add missing columns to sales table
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS cashier_id UUID REFERENCES auth.users(id);

-- Make cashier_id nullable to avoid constraint violations
ALTER TABLE sales ALTER COLUMN cashier_id DROP NOT NULL;

ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS cashier_name TEXT;

ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS receipt_number TEXT;

-- Add updated_at column (this is causing the payment error)
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add other required columns for payment processing
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);

ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);

ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2);

ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2) DEFAULT 0;

ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;

ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2);

ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'cash';

ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'completed';

ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Fix sale_items table as well
ALTER TABLE sale_items 
ADD COLUMN IF NOT EXISTS total_price DECIMAL(10,2);

ALTER TABLE sale_items 
ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2);

ALTER TABLE sale_items 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

ALTER TABLE sale_items 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing records with default values
UPDATE sales 
SET 
    cashier_name = COALESCE(cashier_name, 'System'),
    receipt_number = COALESCE(receipt_number, 'RCP' || LPAD(EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT, 10, '0')),
    updated_at = NOW()
WHERE 
    cashier_name IS NULL OR receipt_number IS NULL OR updated_at IS NULL;

-- Calculate and update missing totals for existing sales
UPDATE sales SET 
    subtotal = COALESCE((SELECT SUM(total_price) FROM sale_items WHERE sale_id = sales.id), 0),
    tax_amount = COALESCE((SELECT SUM(total_price) FROM sale_items WHERE sale_id = sales.id), 0) * 0.05,
    total_amount = COALESCE((SELECT SUM(total_price) FROM sale_items WHERE sale_id = sales.id), 0) * 1.05,
    updated_at = NOW()
WHERE subtotal IS NULL OR total_amount IS NULL;

-- Update sale_items total_price if missing
UPDATE sale_items SET 
    total_price = quantity * unit_price,
    updated_at = NOW()
WHERE total_price IS NULL;

-- Set default payment method for existing records
UPDATE sales SET 
    payment_method = 'cash',
    payment_status = 'completed',
    updated_at = NOW()
WHERE payment_method IS NULL OR payment_status IS NULL;

-- Check the result
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'sales' 
  AND column_name IN ('user_id', 'cashier_id', 'cashier_name', 'receipt_number', 'updated_at', 'total_amount', 'payment_method')
ORDER BY column_name;

-- Also verify sale_items table exists
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'sale_items' 
ORDER BY ordinal_position;
