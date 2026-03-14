-- Debug cashier login issue
-- Run this in Supabase SQL Editor

-- 1. Check if staff record exists and has user_id
SELECT 
    id,
    name,
    email,
    user_id,
    role,
    status,
    created_at
FROM staff 
WHERE email = 'cashier@onyxxnightlife.com.ng';

-- 2. Check if auth user exists (you can see this in Authentication tab)
-- This is just for reference - you can't query auth.users directly with standard SQL

-- 3. Check all staff records to see structure
SELECT 
    id,
    name,
    email,
    user_id IS NOT NULL as has_user_id,
    role,
    status
FROM staff 
ORDER BY created_at DESC;

-- 4. If staff record exists but user_id is NULL, update it
UPDATE staff 
SET user_id = '09287c76-3aa5-422b-8747-1df45d8dba7a' 
WHERE email = 'cashier@onyxxnightlife.com.ng' 
AND user_id IS NULL;

-- 5. Final verification
SELECT 
    id,
    name,
    email,
    user_id,
    role,
    status,
    CASE 
        WHEN user_id = '09287c76-3aa5-422b-8747-1df45d8dba7a' THEN 'USER_ID_CORRECT'
        ELSE 'USER_ID_INCORRECT_OR_MISSING'
    END as status_check
FROM staff 
WHERE email = 'cashier@onyxxnightlife.com.ng';
