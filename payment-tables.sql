-- Additional tables for payment processing

-- Pending transactions table
CREATE TABLE IF NOT EXISTS pending_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans(id),
    billing_cycle VARCHAR(20) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
    tx_ref VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    customer_email VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    flutterwave_tx_id VARCHAR(255),
    flutterwave_flw_ref VARCHAR(255),
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment records table
CREATE TABLE IF NOT EXISTS payment_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
    payment_method VARCHAR(50) NOT NULL,
    flutterwave_tx_id VARCHAR(255),
    flutterwave_flw_ref VARCHAR(255),
    tx_ref VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pending_transactions_tenant_id ON pending_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pending_transactions_tx_ref ON pending_transactions(tx_ref);
CREATE INDEX IF NOT EXISTS idx_payment_records_tenant_id ON payment_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_tx_ref ON payment_records(tx_ref);

-- Enable RLS
ALTER TABLE pending_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their tenant pending transactions" ON pending_transactions
    FOR SELECT USING (
        tenant_id = (
            SELECT tenant_id FROM users 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can view their tenant payment records" ON payment_records
    FOR SELECT USING (
        tenant_id = (
            SELECT tenant_id FROM users 
            WHERE id = auth.uid()
        )
    );
