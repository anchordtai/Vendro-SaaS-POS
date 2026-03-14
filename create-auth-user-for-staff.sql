-- Create auth user for existing staff record
-- Note: This requires service role access. If you don't have it, use the manual method below.

-- Method 1: If you have service role access (run in Supabase SQL Editor)
-- This won't work in regular SQL - you need the service role key

-- Method 2: Manual creation via Supabase Dashboard (Recommended)

-- Step 1: Get the staff record details
SELECT 
    id,
    name,
    email,
    role,
    status
FROM staff 
WHERE email = 'cashier@onyxxnightlife.com.ng';

-- Step 2: Go to Supabase Dashboard → Authentication → Users
-- Step 3: Click "Add User" and enter:
-- Email: cashier@onyxxnightlife.com.ng
-- Password: cashier@123
-- Email confirmation: Check this box
-- User metadata (JSON):
-- {
--   "name": "Cashier",
--   "role": "cashier",
--   "staff_id": "PASTE_STAFF_ID_FROM_ABOVE_QUERY"
-- }

-- Step 4: After creating the auth user, update the staff record with the user_id
-- Run this after creating the auth user (replace with actual auth user ID):

UPDATE staff 
SET user_id = 'AUTH_USER_ID_FROM_DASHBOARD' 
WHERE email = 'cashier@onyxxnightlife.com.ng';

-- Step 5: Verify the link
SELECT 
    s.id as staff_id,
    s.name,
    s.email,
    s.user_id,
    s.role,
    s.status,
    CASE 
        WHEN s.user_id IS NOT NULL THEN 'AUTH_USER_LINKED'
        ELSE 'AUTH_USER_NOT_LINKED'
    END as link_status
FROM staff s
WHERE s.email = 'cashier@onyxxnightlife.com.ng';
