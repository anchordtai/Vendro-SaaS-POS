-- Create staff record for existing auth user
-- Run this in Supabase SQL Editor

-- Insert staff record for the existing auth user
INSERT INTO staff (
    id,
    user_id,
    name,
    email,
    role,
    status,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),  -- Generate new staff record ID
    '09287c76-3aa5-422b-8747-1df45d8dba7a',  -- The auth user ID
    'Cashier',  -- Name
    'cashier@onyxxnightlife.com.ng',  -- Email
    'cashier',  -- Role
    'active',  -- Status
    NOW(),  -- created_at
    NOW()   -- updated_at
);

-- Verify the staff record was created
SELECT 
    id,
    user_id,
    name,
    email,
    role,
    status,
    created_at
FROM staff 
WHERE email = 'cashier@onyxxnightlife.com.ng';
