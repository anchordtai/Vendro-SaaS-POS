-- Update the existing user record to match the auth user ID
UPDATE users 
SET id = '02db62a7-c893-4891-b50d-e58f40ff74ec'
WHERE email = 'admin@afstore.com';

-- Verify the fix
SELECT 
    u.id,
    u.email,
    u.name,
    u.role,
    u.tenant_id,
    t.business_name
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
WHERE u.email = 'admin@afstore.com';
