-- Create the missing user record for the existing auth user
-- First, let's see if there's a tenant for this user
SELECT * FROM tenants WHERE email = 'admin@afstore.com';

-- If no tenant exists, we need to create one
INSERT INTO tenants (
    id,
    business_name,
    business_type,
    business_size,
    email,
    settings,
    created_at,
    updated_at
) VALUES (
    '02db62a7-c893-4891-b50d-e58f40ff74ec',
    'AF Store',
    'retail',
    'small',
    'admin@afstore.com',
    '{}'::jsonb,
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Now create the user record
INSERT INTO users (
    id,
    tenant_id,
    email,
    password_hash,
    name,
    role,
    is_active,
    created_at,
    updated_at
) VALUES (
    '02db62a7-c893-4891-b50d-e58f40ff74ec',
    '02db62a7-c893-4891-b50d-e58f40ff74ec',
    'admin@afstore.com',
    'hashed_password', -- This is handled by Supabase Auth
    'Admin User',
    'super_admin',
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Check if it worked
SELECT 
    u.id,
    u.email,
    u.name,
    u.role,
    u.tenant_id,
    u.is_active,
    u.created_at,
    t.business_name,
    t.business_type
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
WHERE u.email = 'admin@afstore.com';
