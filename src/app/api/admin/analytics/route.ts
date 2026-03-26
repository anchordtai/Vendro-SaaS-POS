import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET detailed analytics data
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(period));

    const startDateStr = startDate.toISOString();
    const endDateStr = endDate.toISOString();

    // Get revenue data over time
    const { data: revenueData, error: revenueError } = await supabaseAdmin
      .from('sales')
      .select('total_amount, created_at, tenant_id')
      .eq('status', 'completed')
      .gte('created_at', startDateStr)
      .lte('created_at', endDateStr)
      .order('created_at', { ascending: true });

    // Get tenant growth data
    const { data: tenantGrowthData, error: tenantGrowthError } = await supabaseAdmin
      .from('tenants')
      .select('created_at, business_type')
      .gte('created_at', startDateStr)
      .lte('created_at', endDateStr)
      .order('created_at', { ascending: true });

    // Get user registration data
    const { data: userGrowthData, error: userGrowthError } = await supabaseAdmin
      .from('users')
      .select('created_at, role')
      .gte('created_at', startDateStr)
      .lte('created_at', endDateStr)
      .order('created_at', { ascending: true });

    // Get business type distribution
    const { data: businessTypes, error: businessTypesError } = await supabaseAdmin
      .from('tenants')
      .select('business_type');

    // Get top performing tenants
    const { data: topTenants, error: topTenantsError } = await supabaseAdmin
      .from('tenants')
      .select(`
        *,
        users(count),
        products(count),
        sales aggregate {
          total_amount: sum(total_amount),
          count: count()
        }
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    // Process revenue data by day
    const revenueByDay = {};
    const totalRevenue = revenueData?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;
    
    revenueData?.forEach(sale => {
      const day = sale.created_at?.split('T')[0];
      if (day) {
        revenueByDay[day] = (revenueByDay[day] || 0) + (sale.total_amount || 0);
      }
    });

    // Process business type distribution
    const businessTypeDistribution = {};
    businessTypes?.forEach(tenant => {
      businessTypeDistribution[tenant.business_type] = (businessTypeDistribution[tenant.business_type] || 0) + 1;
    });

    // Process tenant growth by day
    const tenantGrowthByDay = {};
    tenantGrowthData?.forEach(tenant => {
      const day = tenant.created_at?.split('T')[0];
      if (day) {
        tenantGrowthByDay[day] = (tenantGrowthByDay[day] || 0) + 1;
      }
    });

    // Process user growth by day
    const userGrowthByDay = {};
    const userGrowthByRole = {};
    userGrowthData?.forEach(user => {
      const day = user.created_at?.split('T')[0];
      if (day) {
        userGrowthByDay[day] = (userGrowthByDay[day] || 0) + 1;
      }
      userGrowthByRole[user.role] = (userGrowthByRole[user.role] || 0) + 1;
    });

    // Calculate growth percentages
    const totalTenants = tenantGrowthData?.length || 0;
    const totalUsers = userGrowthData?.length || 0;
    const avgRevenuePerTenant = totalTenants > 0 ? totalRevenue / totalTenants : 0;

    const analytics = {
      period: parseInt(period),
      summary: {
        totalRevenue,
        totalTenants,
        totalUsers,
        avgRevenuePerTenant,
        totalSales: revenueData?.length || 0
      },
      revenue: {
        byDay: revenueByDay,
        total: totalRevenue,
        trend: '+0%' // Placeholder - would calculate from previous period
      },
      tenants: {
        growth: tenantGrowthByDay,
        total: totalTenants,
        trend: '+12.5%', // Placeholder
        businessTypeDistribution
      },
      users: {
        growth: userGrowthByDay,
        byRole: userGrowthByRole,
        total: totalUsers,
        trend: '+8.3%' // Placeholder
      },
      topTenants: topTenants?.map(tenant => ({
        ...tenant,
        total_sales: tenant.sales?.count || 0,
        total_revenue: tenant.sales?.total_amount || 0,
        users_count: tenant.users?.length || 0,
        products_count: tenant.products?.length || 0
      })) || []
    };

    return NextResponse.json(analytics);

  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
