-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default roles
INSERT INTO roles (name, description, permissions) VALUES
('super_admin', 'System administrator with full access', '["all"]'),
('tenant_admin', 'Business owner with full tenant access', '["products:read", "products:write", "products:delete", "sales:read", "inventory:read", "users:read", "users:write"]'),
('cashier', 'Point of sale operator', '["products:read", "sales:write", "pos:access"]')
ON CONFLICT (name) DO NOTHING;

-- Update existing users to have proper roles
UPDATE users SET role = 'tenant_admin' WHERE email = 'admin@afstore.com' AND role = 'super_admin';

-- Create cashiers table for tenant admins to manage
CREATE TABLE IF NOT EXISTS cashiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    employee_id VARCHAR(50) UNIQUE,
    hire_date DATE,
    salary DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create receipts table for thermal printing
CREATE TABLE IF NOT EXISTS receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    printed_at TIMESTAMP WITH TIME ZONE,
    printer_name VARCHAR(100),
    print_status VARCHAR(50) DEFAULT 'pending', -- pending, printed, failed
    receipt_data JSONB, -- Store formatted receipt data for printing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create print_settings table for thermal printer configuration
CREATE TABLE IF NOT EXISTS print_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    printer_name VARCHAR(100),
    printer_model VARCHAR(100),
    connection_type VARCHAR(50), -- usb, bluetooth, network
    connection_config JSONB,
    paper_width INTEGER DEFAULT 80, -- 80mm thermal paper
    print_logo BOOLEAN DEFAULT true,
    print_header TEXT DEFAULT 'SALES RECEIPT',
    print_footer TEXT DEFAULT 'Thank you for your business!',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default print settings for existing tenant
INSERT INTO print_settings (tenant_id, printer_name, connection_type) VALUES
    ((SELECT tenant_id FROM users WHERE email = 'admin@afstore.com' LIMIT 1), 'Default Thermal Printer', 'usb')
ON CONFLICT DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cashiers_tenant_id ON cashiers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cashiers_user_id ON cashiers(user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_sale_id ON receipts(sale_id);
CREATE INDEX IF NOT EXISTS idx_print_settings_tenant_id ON print_settings(tenant_id);
