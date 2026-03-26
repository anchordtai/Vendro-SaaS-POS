-- Create tables needed for receipt printing functionality

-- Create print_settings table
CREATE TABLE IF NOT EXISTS print_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    print_header VARCHAR(255) DEFAULT 'SALES RECEIPT',
    print_footer VARCHAR(255) DEFAULT 'Thank you for your business!',
    printer_name VARCHAR(255),
    paper_width INTEGER DEFAULT 48,
    font_size VARCHAR(20) DEFAULT 'normal',
    print_logo BOOLEAN DEFAULT false,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id)
);

-- Create receipts table
CREATE TABLE IF NOT EXISTS receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    receipt_number VARCHAR(50) NOT NULL,
    receipt_data JSONB NOT NULL,
    print_status VARCHAR(50) DEFAULT 'pending',
    printed_at TIMESTAMP WITH TIME ZONE,
    printer_name VARCHAR(255),
    print_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on both tables
ALTER TABLE print_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for print_settings
CREATE POLICY "Users can view their own print settings" ON print_settings
    FOR SELECT USING (tenant_id::text = auth.jwt() ->> 'tenant_id');

CREATE POLICY "Users can insert their own print settings" ON print_settings
    FOR INSERT WITH CHECK (tenant_id::text = auth.jwt() ->> 'tenant_id');

CREATE POLICY "Users can update their own print settings" ON print_settings
    FOR UPDATE USING (tenant_id::text = auth.jwt() ->> 'tenant_id');

-- Create RLS policies for receipts
CREATE POLICY "Users can view their own receipts" ON receipts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM sales 
            WHERE sales.id = receipts.sale_id 
            AND sales.tenant_id::text = auth.jwt() ->> 'tenant_id'
        )
    );

CREATE POLICY "Users can insert their own receipts" ON receipts
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM sales 
            WHERE sales.id = receipts.sale_id 
            AND sales.tenant_id::text = auth.jwt() ->> 'tenant_id'
        )
    );

CREATE POLICY "Users can update their own receipts" ON receipts
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM sales 
            WHERE sales.id = receipts.sale_id 
            AND sales.tenant_id::text = auth.jwt() ->> 'tenant_id'
        )
    );

-- Grant permissions
GRANT ALL ON print_settings TO authenticated;
GRANT ALL ON receipts TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_print_settings_tenant_id ON print_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_receipts_sale_id ON receipts(sale_id);
CREATE INDEX IF NOT EXISTS idx_receipts_print_status ON receipts(print_status);

-- Insert default print settings for existing tenants
INSERT INTO print_settings (tenant_id, print_header, print_footer)
SELECT 
    id,
    'SALES RECEIPT',
    'Thank you for your business!'
FROM tenants
WHERE id NOT IN (SELECT tenant_id FROM print_settings);

-- Verify the tables were created
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('print_settings', 'receipts')
ORDER BY table_name, ordinal_position;
