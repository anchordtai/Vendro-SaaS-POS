-- Check all users created in the last 2 hours
SELECT 
    email,
    id,
    created_at,
    last_sign_in_at
FROM auth.users 
WHERE created_at > NOW() - INTERVAL '2 hours'
ORDER BY created_at DESC;

-- Also check your custom users table
SELECT 
    email,
    name,
    role,
    created_at
FROM users 
WHERE created_at > NOW() - INTERVAL '2 hours'
ORDER BY created_at DESC;
