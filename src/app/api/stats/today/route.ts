import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenant_id');
    const cashierId = searchParams.get('cashier_id');
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }

    // Get current date
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Build query for today's sales
    let salesQuery = supabase
      .from('sales')
      .select('total_amount')
      .eq('tenant_id', tenantId)
      .eq('payment_status', 'completed')
      .gte('created_at', todayStart.toISOString());

    if (cashierId) {
      salesQuery = salesQuery.eq('cashier_id', cashierId);
    }

    const { data: todaySalesData, error: todaySalesError } = await salesQuery;

    if (todaySalesError) {
      console.error('Error fetching today stats:', todaySalesError);
      return NextResponse.json({ error: 'Failed to fetch today stats' }, { status: 500 });
    }

    // Calculate stats
    const todaySales = todaySalesData?.length || 0;
    const todayRevenue = todaySalesData?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;
    const totalTransactions = todaySales;

    const stats = {
      totalSales: todaySales,
      totalAmount: todayRevenue,
      totalTransactions
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error in today stats API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
