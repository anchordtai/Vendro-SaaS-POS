-- Create products table with proper schema
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    cost_price DECIMAL(10,2),
    stock_quantity INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 10,
    barcode VARCHAR(100),
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL, -- cash, card, mobile, transfer
    payment_status VARCHAR(50) DEFAULT 'completed', -- pending, completed, failed, refunded
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sale_items table
CREATE TABLE IF NOT EXISTS sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create inventory_transactions table
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    transaction_type VARCHAR(50) NOT NULL, -- sale, restock, adjustment, waste
    quantity_change INTEGER NOT NULL, -- negative for sales, positive for restock
    reference_id UUID, -- sale_id or restock_id
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_sales_tenant_id ON sales(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product_id ON inventory_transactions(product_id);

-- Insert sample products for the existing tenant (prices in Naira)
INSERT INTO products (tenant_id, sku, name, description, category, price, cost_price, stock_quantity, low_stock_threshold, barcode) VALUES
    ((SELECT tenant_id FROM users WHERE email = 'admin@afstore.com' LIMIT 1), 'BEER001', 'Premium Beer', 'High quality imported beer', 'Beverages', 2200.00, 1500.00, 45, 10, '1234567890123'),
    ((SELECT tenant_id FROM users WHERE email = 'admin@afstore.com' LIMIT 1), 'WHISKEY001', 'Whiskey Shot', 'Premium whiskey shot', 'Spirits', 3200.00, 2400.00, 120, 20, '1234567890124'),
    ((SELECT tenant_id FROM users WHERE email = 'admin@afstore.com' LIMIT 1), 'VODKA001', 'Vodka Mix', 'Mixed vodka cocktail', 'Cocktails', 4800.00, 3200.00, 8, 5, '1234567890125'),
    ((SELECT tenant_id FROM users WHERE email = 'admin@afstore.com' LIMIT 1), 'WINE001', 'Wine Glass', 'Premium red wine', 'Wine', 3800.00, 2800.00, 34, 10, '1234567890126'),
    ((SELECT tenant_id FROM users WHERE email = 'admin@afstore.com' LIMIT 1), 'BURGER001', 'Classic Burger', 'Beef burger with fries', 'Food', 6000.00, 4000.00, 25, 10, '1234567890127'),
    ((SELECT tenant_id FROM users WHERE email = 'admin@afstore.com' LIMIT 1), 'FRIES001', 'French Fries', 'Crispy french fries', 'Food', 1800.00, 1200.00, 5, 5, '1234567890128')
ON CONFLICT (sku) DO NOTHING;
