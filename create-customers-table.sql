-- Create customers table for the POS system
-- This table stores customer information for multi-tenant POS

CREATE TABLE IF NOT EXISTS public.customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON public.customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_active ON public.customers(is_active);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);

-- Enable RLS (Row Level Security)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for customers table
-- Users can only access customers from their own tenant
CREATE POLICY "Users can view their tenant's customers" ON public.customers
    FOR SELECT USING (tenant_id = auth.uid()::text::uuid);

CREATE POLICY "Users can insert customers for their tenant" ON public.customers
    FOR INSERT WITH CHECK (tenant_id = auth.uid()::text::uuid);

CREATE POLICY "Users can update customers for their tenant" ON public.customers
    FOR UPDATE USING (tenant_id = auth.uid()::text::uuid);

CREATE POLICY "Users can delete customers for their tenant" ON public.customers
    FOR DELETE USING (tenant_id = auth.uid()::text::uuid);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Grant permissions
GRANT ALL ON public.customers TO authenticated;
GRANT SELECT ON public.customers TO anon;

-- Insert some sample customers for testing (optional)
INSERT INTO public.customers (tenant_id, name, email, phone, address) VALUES
    ('5fb3d37b-3963-4ac6-9f67-3d1e316cf723', 'John Doe', 'john@example.com', '08012345678', '123 Main St, Lagos'),
    ('5fb3d37b-3963-4ac6-9f67-3d1e316cf723', 'Jane Smith', 'jane@example.com', '08087654321', '456 Oak Ave, Lagos'),
    ('5fb3d37b-3963-4ac6-9f67-3d1e316cf723', 'Mike Johnson', 'mike@example.com', '08098765432', '789 Pine Rd, Lagos')
ON CONFLICT DO NOTHING;
