-- Check if users exist in the database
SELECT 
    u.id,
    u.email,
    u.name,
    u.role,
    u.is_active,
    u.tenant_id,
    t.business_name,
    s.status as subscription_status,
    s.trial_ends_at
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
LEFT JOIN subscriptions s ON u.tenant_id = s.tenant_id AND s.status = 'active'
WHERE u.email = 'admin@afstore.com';
