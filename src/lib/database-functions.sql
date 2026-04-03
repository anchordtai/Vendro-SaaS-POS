-- Database functions for the POS system

-- Function to update product stock safely
CREATE OR REPLACE FUNCTION update_product_stock(p_product_id UUID, p_quantity INTEGER)
RETURNS TABLE(success BOOLEAN, new_stock INTEGER) AS $$
BEGIN
    -- Lock the product row to prevent race conditions
    PERFORM 1 FROM products WHERE id = p_product_id FOR UPDATE;
    
    -- Update the stock
    UPDATE products 
    SET stock_quantity = stock_quantity + p_quantity,
        updated_at = NOW()
    WHERE id = p_product_id;
    
    -- Get the new stock level
    RETURN QUERY
    SELECT 
        TRUE as success,
        stock_quantity as new_stock
    FROM products 
    WHERE id = p_product_id;
    
    -- Check if stock went negative
    IF EXISTS (
        SELECT 1 FROM products 
        WHERE id = p_product_id AND stock_quantity < 0
    ) THEN
        -- Rollback the transaction
        RAISE EXCEPTION 'Insufficient stock for product %', p_product_id;
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY
        SELECT 
            FALSE as success,
            COALESCE((SELECT stock_quantity FROM products WHERE id = p_product_id), 0) as new_stock;
END;
$$ LANGUAGE plpgsql;

-- Function to get today's sales stats for a cashier
CREATE OR REPLACE FUNCTION get_cashier_today_stats(p_tenant_id UUID, p_cashier_id UUID DEFAULT NULL)
RETURNS TABLE(
    total_sales BIGINT,
    total_amount DECIMAL,
    total_transactions BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_sales,
        COALESCE(SUM(total_amount), 0) as total_amount,
        COUNT(*) as total_transactions
    FROM sales 
    WHERE tenant_id = p_tenant_id 
        AND (p_cashier_id IS NULL OR cashier_id = p_cashier_id)
        AND payment_status = 'completed'
        AND DATE(created_at) = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Function to get dashboard stats for a tenant
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_tenant_id UUID)
RETURNS TABLE(
    total_products BIGINT,
    total_sales BIGINT,
    total_revenue DECIMAL,
    total_users BIGINT,
    low_stock_products BIGINT,
    today_sales BIGINT,
    today_revenue DECIMAL,
    weekly_sales BIGINT,
    weekly_revenue DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH 
    product_stats AS (
        SELECT 
            COUNT(*) as total_products,
            COUNT(CASE WHEN stock_quantity <= 10 THEN 1 END) as low_stock_products
        FROM products 
        WHERE tenant_id = p_tenant_id AND is_active = true
    ),
    sales_stats AS (
        SELECT 
            COUNT(*) as total_sales,
            COALESCE(SUM(total_amount), 0) as total_revenue
        FROM sales 
        WHERE tenant_id = p_tenant_id AND payment_status = 'completed'
    ),
    today_stats AS (
        SELECT 
            COUNT(*) as today_sales,
            COALESCE(SUM(total_amount), 0) as today_revenue
        FROM sales 
        WHERE tenant_id = p_tenant_id 
            AND payment_status = 'completed'
            AND DATE(created_at) = CURRENT_DATE
    ),
    weekly_stats AS (
        SELECT 
            COUNT(*) as weekly_sales,
            COALESCE(SUM(total_amount), 0) as weekly_revenue
        FROM sales 
        WHERE tenant_id = p_tenant_id 
            AND payment_status = 'completed'
            AND created_at >= CURRENT_DATE - INTERVAL '7 days'
    ),
    user_stats AS (
        SELECT COUNT(*) as total_users
        FROM users 
        WHERE tenant_id = p_tenant_id
    )
    SELECT 
        ps.total_products,
        ss.total_sales,
        ss.total_revenue,
        us.total_users,
        ps.low_stock_products,
        ts.today_sales,
        ts.today_revenue,
        ws.weekly_sales,
        ws.weekly_revenue
    FROM product_stats ps, sales_stats ss, today_stats ts, weekly_stats ws, user_stats us;
END;
$$ LANGUAGE plpgsql;

-- Legacy RPC: provisioning is implemented in-app (see src/services/auth/onboarding.ts).
-- Kept for backwards compatibility; prefer ensurePublicUserRecord in API routes.
CREATE OR REPLACE FUNCTION self_heal_user(p_auth_user_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    user_id UUID,
    tenant_id UUID
) AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.users WHERE id = p_auth_user_id) THEN
        RETURN QUERY
        SELECT TRUE, 'User already exists'::TEXT, p_auth_user_id, u.tenant_id
        FROM public.users u WHERE u.id = p_auth_user_id;
        RETURN;
    END IF;
    RETURN QUERY
    SELECT FALSE, 'Use /api/auth/login or ensurePublicUserRecord (server)'::TEXT,
           NULL::UUID, NULL::UUID;
END;
$$ LANGUAGE plpgsql;
