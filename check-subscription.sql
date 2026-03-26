-- Check if the user has a subscription
SELECT 
    u.id,
    u.email,
    u.tenant_id,
    s.id as subscription_id,
    s.status,
    s.plan_id,
    s.trial_ends_at,
    s.current_period_end,
    p.name as plan_name,
    p.tier as plan_tier
FROM users u
LEFT JOIN subscriptions s ON u.tenant_id = s.tenant_id
LEFT JOIN plans p ON s.plan_id = p.id
WHERE u.email = 'admin@afstore.com';
