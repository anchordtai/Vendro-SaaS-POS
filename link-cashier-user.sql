-- Link cashier auth user to staff record
-- Run this in Supabase SQL Editor

UPDATE staff 
SET user_id = '09287c76-3aa5-422b-8747-1df45d8dba7a' 
WHERE email = 'cashier@onyxxnightlife.com.ng';

-- Verify the update
SELECT * FROM staff WHERE email = 'cashier@onyxxnightlife.com.ng';
