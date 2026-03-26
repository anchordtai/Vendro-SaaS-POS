-- Check the newest user account
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
WHERE u.created_at > NOW() - INTERVAL '1 hour'
ORDER BY u.created_at DESC;

-- Check auth users created in the last hour
SELECT 
    id,
    email,
    created_at,
    last_sign_in_at,
    email_confirmed_at
FROM auth.users
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
