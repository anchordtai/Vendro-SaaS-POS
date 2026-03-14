-- Force refresh Supabase schema cache
-- Run this in your Supabase SQL editor

-- First, completely drop and recreate the items column
DROP TABLE IF EXISTS sales CASCADE;

-- Recreate sales table with all required columns
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cashier_id UUID REFERENCES auth.users(id),
    cashier_name TEXT NOT NULL DEFAULT 'System',
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'pos_card', 'bank_transfer')),
    receipt_number TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_sales_cashier_id ON sales(cashier_id);
CREATE INDEX idx_sales_created_at ON sales(created_at);
CREATE INDEX idx_sales_receipt_number ON sales(receipt_number);

-- Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'sales' 
ORDER BY ordinal_position;
