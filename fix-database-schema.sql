-- Fix missing columns in sales and sale_items tables
ALTER TABLE sales ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Fix sale_items table - add missing total_price column
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS total_price DECIMAL(10,2);

-- Update existing sale_items to calculate total_price
UPDATE sale_items SET total_price = quantity * unit_price WHERE total_price IS NULL;

-- Also ensure products table has all required columns
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Fix any other potential missing columns
ALTER TABLE sales ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(50);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'completed';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update sales table to ensure receipt numbers exist
UPDATE sales SET receipt_number = 'RCP' || EXTRACT(EPOCH FROM NOW())::BIGINT WHERE receipt_number IS NULL;

-- Update sales calculations
UPDATE sales SET 
    subtotal = (SELECT COALESCE(SUM(total_price), 0) FROM sale_items WHERE sale_id = sales.id),
    tax_amount = subtotal * 0.05,
    total_amount = subtotal + COALESCE(tax_amount, 0)
WHERE (subtotal IS NULL OR total_amount IS NULL);

-- Set default payment method if missing
UPDATE sales SET payment_method = 'cash' WHERE payment_method IS NULL;
