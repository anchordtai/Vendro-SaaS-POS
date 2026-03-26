-- Add cost column to products table (optional)
-- Uncomment and run this if you want to track product costs for profit calculations

-- ALTER TABLE public.products 
-- ADD COLUMN IF NOT EXISTS cost DECIMAL(10,2) DEFAULT 0.00;

-- Add index for cost column (optional)
-- CREATE INDEX IF NOT EXISTS idx_products_cost ON public.products(cost);

-- Comment: This will allow you to track product costs and calculate profits
-- Cost represents what you paid for the product, while price is what you sell it for
