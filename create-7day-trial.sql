-- Create a 7-day trial subscription for the existing user
INSERT INTO subscriptions (
    tenant_id,
    plan_id,
    status,
    billing_cycle,
    trial_ends_at,
    current_period_start,
    current_period_end,
    created_at,
    updated_at
) VALUES (
    (SELECT tenant_id FROM users WHERE email = 'admin@afstore.com'),
    (SELECT id FROM plans WHERE tier = 'starter' LIMIT 1),
    'trial',
    'monthly',
    NOW() + INTERVAL '7 days',
    NOW(),
    NOW() + INTERVAL '7 days',
    NOW(),
    NOW()
) ON CONFLICT (tenant_id) DO UPDATE SET
    status = 'trial',
    trial_ends_at = NOW() + INTERVAL '7 days',
    current_period_end = NOW() + INTERVAL '7 days',
    updated_at = NOW();

-- Verify the 7-day trial was created
SELECT 
    u.email,
    s.id as subscription_id,
    s.status,
    s.trial_ends_at,
    s.current_period_end,
    p.name as plan_name,
    p.tier as plan_tier,
    -- Calculate days remaining in trial
    (s.trial_ends_at - NOW()) as days_remaining
FROM users u
LEFT JOIN subscriptions s ON u.tenant_id = s.tenant_id
LEFT JOIN plans p ON s.plan_id = p.id
WHERE u.email = 'admin@afstore.com';
