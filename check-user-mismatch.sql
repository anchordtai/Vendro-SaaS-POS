-- Check if this specific user exists in the users table
SELECT * FROM users WHERE id = '02db62a7-c893-4891-b50d-e58f40ff74ec';

-- Check all users in the database
SELECT id, email, name, role, tenant_id, is_active, created_at FROM users ORDER BY created_at DESC;

-- Check if there's a mismatch between auth users and our users table
SELECT 
    au.id as auth_id,
    au.email as auth_email,
    au.created_at as auth_created,
    u.id as user_id,
    u.email as user_email,
    u.created_at as user_created
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE au.id = '02db62a7-c893-4891-b50d-e58f40ff74ec';
