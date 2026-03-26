-- Update your user to super_admin role
UPDATE users 
SET role = 'super_admin' 
WHERE email = 'admin@afstore.com';

-- Verify the update
SELECT id, email, name, role, tenant_id, is_active 
FROM users 
WHERE email = 'admin@afstore.com';
