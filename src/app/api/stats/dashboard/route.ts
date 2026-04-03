import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenant_id');
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }

    // Get current date
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get products count
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select('id, stock_quantity')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    // Get total sales count and revenue
    const { data: totalSalesData, error: totalSalesError } = await supabase
      .from('sales')
      .select('total_amount')
      .eq('tenant_id', tenantId)
      .eq('payment_status', 'completed');

    // Get today's sales
    const { data: todaySalesData, error: todaySalesError } = await supabase
      .from('sales')
      .select('total_amount')
      .eq('tenant_id', tenantId)
      .eq('payment_status', 'completed')
      .gte('created_at', todayStart.toISOString());

    // Get weekly sales
    const { data: weeklySalesData, error: weeklySalesError } = await supabase
      .from('sales')
      .select('total_amount')
      .eq('tenant_id', tenantId)
      .eq('payment_status', 'completed')
      .gte('created_at', weekStart.toISOString());

    // Get users count
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, is_active')
      .eq('tenant_id', tenantId);

    if (productsError || totalSalesError || todaySalesError || weeklySalesError || usersError) {
      console.error('Error fetching stats:', { productsError, totalSalesError, todaySalesError, weeklySalesError, usersError });
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }

    // Calculate stats
    const totalProducts = productsData?.length || 0;
    const lowStockProducts = productsData?.filter(p => p.stock_quantity <= 10).length || 0;
    
    const totalSales = totalSalesData?.length || 0;
    const totalRevenue = totalSalesData?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;
    
    const todaySales = todaySalesData?.length || 0;
    const todayRevenue = todaySalesData?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;
    
    const weeklySales = weeklySalesData?.length || 0;
    const weeklyRevenue = weeklySalesData?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;
    
    const totalUsers = usersData?.length || 0;

    const stats = {
      totalProducts,
      totalSales,
      totalRevenue,
      totalUsers,
      lowStockProducts,
      todaySales,
      todayRevenue,
      weeklySales,
      weeklyRevenue
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error in stats API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
