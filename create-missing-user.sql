-- Create the missing user record for the existing auth user
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
    (SELECT id FROM tenants WHERE email = 'admin@afstore.com' LIMIT 1),
    'admin@afstore.com',
    'hashed_password', -- This is handled by Supabase Auth
    'Admin User',
    'super_admin',
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Verify it was created
SELECT 
    u.id,
    u.email,
    u.name,
    u.role,
    u.tenant_id,
    u.is_active,
    u.created_at,
    t.business_name
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
WHERE u.id = '02db62a7-c893-4891-b50d-e58f40ff74ec';
