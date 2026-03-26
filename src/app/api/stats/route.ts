import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

// GET dashboard stats for a tenant
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenant_id = searchParams.get('tenant_id');

    if (!tenant_id) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    // Get total sales count
    const { count: totalSales, error: salesError } = await supabaseAdmin
      .from('sales')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant_id)
      .eq('status', 'completed');

    // Get today's sales count
    const today = new Date().toISOString().split('T')[0];
    const { count: todaySales, error: todaySalesError } = await supabaseAdmin
      .from('sales')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant_id)
      .eq('status', 'completed')
      .gte('created_at', today);

    // Get total revenue
    const { data: revenueData, error: revenueError } = await supabaseAdmin
      .from('sales')
      .select('total_amount')
      .eq('tenant_id', tenant_id)
      .eq('status', 'completed');

    // Get total products count
    const { count: totalProducts, error: productsError } = await supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant_id)
      .eq('is_active', true);

    // Get low stock products count
    const { count: lowStock, error: lowStockError } = await supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .lt('stock', 10);

    // Get total customers count
    const { count: customerCount, error: customersError } = await supabaseAdmin
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant_id)
      .eq('is_active', true);

    // Get monthly growth (compare this month with last month)
    const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7);

    const { data: thisMonthSales, error: thisMonthError } = await supabaseAdmin
      .from('sales')
      .select('total_amount')
      .eq('tenant_id', tenant_id)
      .eq('status', 'completed')
      .gte('created_at', thisMonth + '-01');

    const { data: lastMonthSales, error: lastMonthError } = await supabaseAdmin
      .from('sales')
      .select('total_amount')
      .eq('tenant_id', tenant_id)
      .eq('status', 'completed')
      .gte('created_at', lastMonth + '-01')
      .lt('created_at', thisMonth + '-01');

    // Calculate totals and growth
    const totalRevenue = revenueData?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;
    const thisMonthRevenue = thisMonthSales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;
    const lastMonthRevenue = lastMonthSales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;
    
    const monthlyGrowth = lastMonthRevenue > 0 
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
      : 0;

    // Get pending orders count
    const { count: pendingOrders, error: pendingError } = await supabaseAdmin
      .from('sales')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant_id)
      .eq('status', 'pending');

    const stats = {
      totalSales: totalSales || 0,
      todaySales: todaySales || 0,
      totalRevenue: totalRevenue,
      totalProducts: totalProducts || 0,
      lowStock: lowStock || 0,
      customerCount: customerCount || 0,
      monthlyGrowth: Math.round(monthlyGrowth * 10) / 10, // Round to 1 decimal
      pendingOrders: pendingOrders || 0
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
