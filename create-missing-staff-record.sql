-- Create missing staff record for existing auth user
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
    '09287c76-3aa5-422b-8747-1df45d8dba7a',  -- The existing auth user ID
    'Cashier',  -- Name from auth user metadata
    'cashier@onyxxnightlife.com.ng',  -- Email
    'cashier',  -- Role
    'active',  -- Status
    NOW(),  -- created_at
    NOW()   -- updated_at
);

-- Verify the staff record was created and linked correctly
SELECT 
    s.id as staff_id,
    s.name,
    s.email,
    s.user_id,
    s.role,
    s.status,
    s.created_at,
    u.email as auth_user_email,
    CASE 
        WHEN s.user_id IS NOT NULL THEN 'NOT_LINKED'
        ELSE 'LINKED'
    END as link_status
FROM staff s
LEFT JOIN auth.users u ON s.user_id = u.id
WHERE s.email = 'cashier@onyxxnightlife.com.ng';
