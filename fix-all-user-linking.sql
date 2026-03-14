-- Fix user linking issues for staff and users tables
-- Run this in Supabase SQL Editor

-- Step 1: Check current state of all tables
SELECT '=== STAFF TABLE ===' as table_name;
SELECT 
    id,
    name,
    email,
    user_id,
    role,
    status,
    created_at
FROM staff 
ORDER BY created_at DESC;

SELECT '=== USERS TABLE ===' as table_name;
SELECT 
    id,
    name,
    email,
    role,
    status,
    created_at
FROM users 
ORDER BY created_at DESC;

SELECT '=== AUTH USERS ===' as table_name;
-- Note: You can see this in Authentication tab in Supabase Dashboard

-- Step 2: Check for orphaned records (staff without user_id)
SELECT '=== STAFF RECORDS WITHOUT USER_ID ===' as table_name;
SELECT 
    id,
    name,
    email,
    role,
    status
FROM staff 
WHERE user_id IS NULL;

-- Step 3: Check for auth users without staff records
-- This requires service role access to query auth.users
-- You can check this manually in Authentication tab

-- Step 4: Fix staff records that have user_id but wrong email mapping
UPDATE staff 
SET user_id = (
    SELECT id 
    FROM auth.users 
    WHERE email = staff.email
    LIMIT 1
)
WHERE user_id IS NULL
AND EXISTS (
    SELECT 1 FROM auth.users 
    WHERE email = staff.email
);

-- Step 5: Create staff records for auth users that don't have them
INSERT INTO staff (
    id,
    user_id,
    name,
    email,
    role,
    status,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid() as id,
    au.id as user_id,
    COALESCE(au.raw_user_meta_data->>'name', 'Unknown') as name,
    au.email as email,
    COALESCE(au.raw_user_meta_data->>'role', 'cashier') as role,
    'active' as status,
    au.created_at as created_at,
    NOW() as updated_at
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM staff s 
    WHERE s.user_id = au.id
)
AND au.email NOT IN (
    SELECT email FROM staff 
    WHERE user_id IS NOT NULL
);

-- Step 6: Final verification
SELECT '=== FINAL VERIFICATION ===' as table_name;
SELECT 
    s.id as staff_id,
    s.name,
    s.email,
    s.user_id,
    s.role,
    s.status,
    au.email as auth_email,
    CASE 
        WHEN s.user_id IS NOT NULL THEN 'LINKED'
        ELSE 'NOT_LINKED'
    END as link_status,
    s.created_at
FROM staff s
LEFT JOIN auth.users au ON s.user_id = au.id
ORDER BY s.created_at DESC;
