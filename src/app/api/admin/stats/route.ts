import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

// GET system-wide statistics for super admin
export async function GET() {
  try {
    // Get tenant statistics
    const { count: totalTenants, error: tenantsError } = await supabaseAdmin
      .from('tenants')
      .select('*', { count: 'exact', head: true });

    // Since there's no status column, we'll count all tenants as active for now
    const activeTenants = totalTenants;
    const trialTenants = 0;
    const expiredTenants = 0;

    // Get user statistics
    const { count: totalUsers, error: usersError } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Since status column doesn't exist, count all users as active
    const activeUsers = totalUsers;

    // Get product statistics
    const { count: totalProducts, error: productsError } = await supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Get sales statistics
    const { count: totalSales, error: salesError } = await supabaseAdmin
      .from('sales')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');

    // Get customer statistics
    const { count: totalCustomers, error: customersError } = await supabaseAdmin
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Get revenue statistics
    const { data: revenueData, error: revenueError } = await supabaseAdmin
      .from('sales')
      .select('total_amount')
      .eq('status', 'completed');

    // Get monthly revenue
    const thisMonth = new Date().toISOString().slice(0, 7);
    const { data: monthlyRevenueData, error: monthlyRevenueError } = await supabaseAdmin
      .from('sales')
      .select('total_amount')
      .eq('status', 'completed')
      .gte('created_at', thisMonth + '-01');

    const totalRevenue = revenueData?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;
    const monthlyRevenue = monthlyRevenueData?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;

    const stats = {
      total_tenants: totalTenants || 0,
      active_tenants: activeTenants || 0,
      trial_tenants: trialTenants || 0,
      expired_tenants: expiredTenants || 0,
      total_users: totalUsers || 0,
      active_users: activeUsers || 0,
      total_products: totalProducts || 0,
      total_sales: totalSales || 0,
      total_customers: totalCustomers || 0,
      total_revenue: totalRevenue,
      monthly_revenue: monthlyRevenue
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Admin stats API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
