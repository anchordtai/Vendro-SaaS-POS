-- Row Level Security policies for Vendro SaaS platform

-- Tenants table policies
CREATE POLICY "Users can view their own tenant" ON tenants
    FOR SELECT USING (
        auth.uid()::text = (
            SELECT users.id::text FROM users 
            WHERE users.tenant_id = tenants.id 
            AND users.id = auth.uid()
            LIMIT 1
        )
    );

CREATE POLICY "Super admins can view all tenants" ON tenants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

-- Users table policies
CREATE POLICY "Users can view users from same tenant" ON users
    FOR SELECT USING (
        tenant_id = (
            SELECT tenant_id FROM users 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (
        id = auth.uid()
    );

CREATE POLICY "Tenant admins can manage tenant users" ON users
    FOR ALL USING (
        tenant_id = (
            SELECT tenant_id FROM users 
            WHERE id = auth.uid()
            AND role IN ('tenant_admin', 'manager')
        )
    );

-- Subscriptions table policies
CREATE POLICY "Users can view their tenant subscription" ON subscriptions
    FOR SELECT USING (
        tenant_id = (
            SELECT tenant_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Outlets table policies
CREATE POLICY "Users can view their tenant outlets" ON outlets
    FOR SELECT USING (
        tenant_id = (
            SELECT tenant_id FROM users 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Tenant admins can manage outlets" ON outlets
    FOR ALL USING (
        tenant_id = (
            SELECT tenant_id FROM users 
            WHERE id = auth.uid()
            AND role IN ('tenant_admin', 'manager')
        )
    );

-- Products table policies
CREATE POLICY "Users can view their tenant products" ON products
    FOR SELECT USING (
        tenant_id = (
            SELECT tenant_id FROM users 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Tenant staff can manage products" ON products
    FOR ALL USING (
        tenant_id = (
            SELECT tenant_id FROM users 
            WHERE id = auth.uid()
            AND role IN ('tenant_admin', 'manager', 'staff')
        )
    );

-- Sales table policies
CREATE POLICY "Users can view their tenant sales" ON sales
    FOR SELECT USING (
        tenant_id = (
            SELECT tenant_id FROM users 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can create sales for their tenant" ON sales
    FOR INSERT WITH CHECK (
        tenant_id = (
            SELECT tenant_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Sale items table policies
CREATE POLICY "Users can view their tenant sale items" ON sale_items
    FOR SELECT USING (
        tenant_id = (
            SELECT tenant_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Open tabs table policies
CREATE POLICY "Users can view their tenant tabs" ON open_tabs
    FOR SELECT USING (
        tenant_id = (
            SELECT tenant_id FROM users 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Staff can manage tabs" ON open_tabs
    FOR ALL USING (
        tenant_id = (
            SELECT tenant_id FROM users 
            WHERE id = auth.uid()
            AND role IN ('tenant_admin', 'manager', 'cashier', 'staff')
        )
    );

-- Inventory logs table policies
CREATE POLICY "Users can view their tenant inventory logs" ON inventory_logs
    FOR SELECT USING (
        tenant_id = (
            SELECT tenant_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Feature flags table policies
CREATE POLICY "Users can view their tenant feature flags" ON feature_flags
    FOR SELECT USING (
        tenant_id = (
            SELECT tenant_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Plans table policies (read-only for authenticated users)
CREATE POLICY "Authenticated users can view plans" ON plans
    FOR SELECT USING (auth.role() = 'authenticated');

-- Function to check if user has access to specific feature
CREATE OR REPLACE FUNCTION has_feature_access(
    p_feature_key TEXT,
    p_user_id UUID DEFAULT auth.uid()
) RETURNS BOOLEAN AS $$
DECLARE
    v_tenant_id UUID;
    v_business_type business_type;
    v_feature_enabled BOOLEAN;
    v_feature_settings JSONB;
BEGIN
    -- Get user's tenant and business type
    SELECT u.tenant_id, t.business_type
    INTO v_tenant_id, v_business_type
    FROM users u
    JOIN tenants t ON u.tenant_id = t.id
    WHERE u.id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check feature flag
    SELECT is_enabled, settings
    INTO v_feature_enabled, v_feature_settings
    FROM feature_flags
    WHERE tenant_id = v_tenant_id AND feature_key = p_feature_key;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check if feature is enabled for this business type
    IF v_feature_enabled THEN
        RETURN v_feature_settings->>'enabled_for' LIKE '%' || v_business_type || '%';
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check subscription limits
CREATE OR REPLACE FUNCTION check_subscription_limit(
    p_limit_type TEXT, -- 'products', 'outlets', 'users'
    p_tenant_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_current_count INTEGER;
    v_max_allowed INTEGER;
    v_subscription_id UUID;
    v_plan_id UUID;
BEGIN
    -- Get current subscription
    SELECT id, plan_id
    INTO v_subscription_id, v_plan_id
    FROM subscriptions
    WHERE tenant_id = p_tenant_id AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Get max allowed from plan
    CASE p_limit_type
        WHEN 'products' THEN
            SELECT max_products INTO v_max_allowed FROM plans WHERE id = v_plan_id;
            SELECT COUNT(*) INTO v_current_count FROM products WHERE tenant_id = p_tenant_id;
        WHEN 'outlets' THEN
            SELECT max_outlets INTO v_max_allowed FROM plans WHERE id = v_plan_id;
            SELECT COUNT(*) INTO v_current_count FROM outlets WHERE tenant_id = p_tenant_id;
        WHEN 'users' THEN
            SELECT max_users INTO v_max_allowed FROM plans WHERE id = v_plan_id;
            SELECT COUNT(*) INTO v_current_count FROM users WHERE tenant_id = p_tenant_id;
        ELSE
            RETURN FALSE;
    END CASE;
    
    RETURN v_current_count < v_max_allowed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active subscription features
CREATE OR REPLACE FUNCTION get_subscription_features(
    p_tenant_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_plan_features JSONB;
BEGIN
    SELECT p.features
    INTO v_plan_features
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    WHERE s.tenant_id = p_tenant_id AND s.status = 'active'
    ORDER BY s.created_at DESC
    LIMIT 1;
    
    RETURN COALESCE(v_plan_features, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
