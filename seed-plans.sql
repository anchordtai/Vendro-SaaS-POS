-- Insert default plans for Vendro SaaS platform

-- Starter Plans
INSERT INTO plans (name, tier, monthly_price, yearly_price, max_products, max_outlets, max_users, features) VALUES
('Starter - Small', 'starter', 29.99, 299.99, 100, 1, 3, '["basic_inventory", "sales_tracking", "basic_reports", "mobile_app"]'),
('Starter - Medium', 'starter', 49.99, 499.99, 500, 2, 5, '["basic_inventory", "sales_tracking", "basic_reports", "mobile_app", "multi_outlet"]'),
('Starter - Large', 'starter', 79.99, 799.99, 2000, 3, 10, '["basic_inventory", "sales_tracking", "basic_reports", "mobile_app", "multi_outlet", "staff_management"]');

-- Growth Plans
INSERT INTO plans (name, tier, monthly_price, yearly_price, max_products, max_outlets, max_users, features) VALUES
('Growth - Small', 'growth', 79.99, 799.99, 1000, 2, 10, '["advanced_inventory", "sales_tracking", "advanced_reports", "mobile_app", "analytics", "api_access"]'),
('Growth - Medium', 'growth', 129.99, 1299.99, 5000, 5, 25, '["advanced_inventory", "sales_tracking", "advanced_reports", "mobile_app", "analytics", "api_access", "loyalty_program"]'),
('Growth - Large', 'growth', 199.99, 1999.99, 20000, 10, 50, '["advanced_inventory", "sales_tracking", "advanced_reports", "mobile_app", "analytics", "api_access", "loyalty_program", "advanced_analytics"]');

-- Enterprise Plans
INSERT INTO plans (name, tier, monthly_price, yearly_price, max_products, max_outlets, max_users, features) VALUES
('Enterprise - Small', 'enterprise', 199.99, 1999.99, 5000, 5, 25, '["unlimited_inventory", "sales_tracking", "enterprise_reports", "mobile_app", "analytics", "api_access", "loyalty_program", "advanced_analytics", "priority_support"]'),
('Enterprise - Medium', 'enterprise', 349.99, 3499.99, 50000, 20, 100, '["unlimited_inventory", "sales_tracking", "enterprise_reports", "mobile_app", "analytics", "api_access", "loyalty_program", "advanced_analytics", "priority_support", "custom_integrations"]'),
('Enterprise - Large', 'enterprise', 599.99, 5999.99, 200000, 50, 500, '["unlimited_inventory", "sales_tracking", "enterprise_reports", "mobile_app", "analytics", "api_access", "loyalty_program", "advanced_analytics", "priority_support", "custom_integrations", "dedicated_account_manager"]');

-- Note: Feature flags are created dynamically when new tenants are created
-- through the TenantService.initializeFeatureFlags() method
