-- Fix missing foreign key relationships

-- First, check if the relationships exist
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
    AND tc.table_name IN ('users', 'subscriptions', 'tenants');

-- Add missing foreign key relationships if they don't exist
-- Users to Tenants relationship
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_tenant_id_fkey' 
        AND table_name = 'users'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_tenant_id_fkey 
        FOREIGN KEY (tenant_id) REFERENCES tenants(id);
    END IF;
END $$;

-- Subscriptions to Tenants relationship
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'subscriptions_tenant_id_fkey' 
        AND table_name = 'subscriptions'
    ) THEN
        ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_tenant_id_fkey 
        FOREIGN KEY (tenant_id) REFERENCES tenants(id);
    END IF;
END $$;

-- Subscriptions to Plans relationship
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'subscriptions_plan_id_fkey' 
        AND table_name = 'subscriptions'
    ) THEN
        ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_id_fkey 
        FOREIGN KEY (plan_id) REFERENCES plans(id);
    END IF;
END $$;

-- Users to Outlets relationship (optional)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_outlet_id_fkey' 
        AND table_name = 'users'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_outlet_id_fkey 
        FOREIGN KEY (outlet_id) REFERENCES outlets(id);
    END IF;
END $$;

-- Verify the relationships were created
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
    AND tc.table_name IN ('users', 'subscriptions', 'tenants')
ORDER BY tc.table_name;
