-- Check the complete user record
SELECT 
    u.id,
    u.email,
    u.name,
    u.role,
    u.tenant_id,
    u.is_active,
    u.created_at,
    u.updated_at,
    t.business_name,
    t.business_type,
    t.email as tenant_email
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
WHERE u.email = 'admin@afstore.com';

-- Check the auth user
SELECT 
    id,
    email,
    created_at,
    last_sign_in_at,
    email_confirmed_at
FROM auth.users
WHERE email = 'admin@afstore.com';

-- Check if there are any other similar emails (case sensitivity)
SELECT email, id FROM users WHERE email ILIKE '%admin@afstore.com%';
SELECT email, id FROM auth.users WHERE email ILIKE '%admin@afstore.com%';
