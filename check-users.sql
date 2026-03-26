-- Check what users exist in the database
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
ORDER BY u.created_at DESC;

-- Also check if there are any auth users
SELECT 
    id,
    email,
    created_at,
    last_sign_in_at
FROM auth.users
ORDER BY created_at DESC;
