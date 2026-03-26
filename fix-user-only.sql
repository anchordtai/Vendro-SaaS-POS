-- Get the existing tenant info for this email
SELECT id, business_name, business_type, business_size FROM tenants WHERE email = 'admin@afstore.com';

-- Create the missing user record using the existing tenant
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
    (SELECT id FROM tenants WHERE email = 'admin@afstore.com'),
    'admin@afstore.com',
    'hashed_password', -- This is handled by Supabase Auth
    'Admin User',
    'super_admin',
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Verify the user was created
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
