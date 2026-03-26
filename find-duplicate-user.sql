-- Find the existing user record with this email
SELECT 
    id,
    email,
    name,
    role,
    tenant_id,
    is_active,
    created_at
FROM users 
WHERE email = 'admin@afstore.com';

-- Check what tenant this user is linked to
SELECT 
    u.id as user_id,
    u.email,
    t.id as tenant_id,
    t.business_name,
    t.email as tenant_email
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
WHERE u.email = 'admin@afstore.com';

-- Check if there's a mismatch between auth user ID and custom user ID
SELECT 
    au.id as auth_user_id,
    au.email as auth_email,
    u.id as custom_user_id,
    u.email as custom_email,
    CASE 
        WHEN au.id = u.id THEN 'MATCH'
        ELSE 'MISMATCH'
    END as status
FROM auth.users au
LEFT JOIN users u ON au.email = u.email
WHERE au.email = 'admin@afstore.com';
