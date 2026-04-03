import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET all tenants for admin
export async function GET() {
  try {
    // Get tenants with basic info first
    const { data: tenants, error: tenantsError } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });

    if (tenantsError) {
      console.error('Admin tenants fetch error:', tenantsError);
      return NextResponse.json({ error: tenantsError.message }, { status: 500 });
    }

    // Get additional data for each tenant
    const transformedTenants = await Promise.all(
      (tenants || []).map(async (tenant) => {
        try {
          // Get user count
          const { count: usersCount } = await supabaseAdmin
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenant.id);

          // Get product count
          const { count: productsCount } = await supabaseAdmin
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenant.id);

          // Get sales data
          const { data: salesData } = await supabaseAdmin
            .from('sales')
            .select('total_amount')
            .eq('tenant_id', tenant.id);

          // Get subscription info
          const { data: subscriptionData } = await supabaseAdmin
            .from('subscriptions')
            .select('id, status, trial_ends_at, created_at')
            .eq('tenant_id', tenant.id)
            .order('created_at', { ascending: false })
            .limit(1);

          const totalSales = salesData?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;
          const totalSalesCount = salesData?.length || 0;

          return {
            ...tenant,
            users_count: usersCount || 0,
            total_products: productsCount || 0,
            total_sales: totalSalesCount,
            total_revenue: totalSales,
            subscription: subscriptionData?.[0] || null,
            status: 'active' // Default status since column doesn't exist
          };
        } catch (error) {
          console.error('Error processing tenant:', tenant.id, error);
          return {
            ...tenant,
            users_count: 0,
            total_products: 0,
            total_sales: 0,
            total_revenue: 0,
            subscription: null,
            status: 'active'
          };
        }
      })
    );

    return NextResponse.json(transformedTenants);

  } catch (error) {
    console.error('Admin tenants API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST create a new tenant with admin user
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      business_name, 
      business_type, 
      business_size, 
      admin_name, 
      admin_email, 
      admin_password 
    } = body;

    if (!business_name || !business_type || !business_size || !admin_name || !admin_email || !admin_password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Step 1: Create tenant first
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .insert({
        business_name,
        business_type,
        business_size,
        email: admin_email,
        phone: null,
        address: null,
        city: null,
        country: null
      })
      .select()
      .single();

    if (tenantError) {
      console.error('Tenant creation error:', tenantError);
      return NextResponse.json({ error: 'Failed to create tenant' }, { status: 500 });
    }

    // Step 2: Create auth user with tenant metadata
    const { data: authData, error: authError } = await supabaseAuth.auth.admin.createUser({
      email: admin_email,
      password: admin_password,
      email_confirm: true,
      user_metadata: {
        name: admin_name,
        role: 'tenant_admin',
        tenant_id: tenant.id
      }
    });

    if (authError) {
      console.error('Auth user creation error:', authError);
      // Cleanup tenant on auth failure
      await supabaseAdmin.from('tenants').delete().eq('id', tenant.id);
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    // Step 3: Create user record manually
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        tenant_id: tenant.id,
        name: admin_name,
        email: admin_email,
        role: 'tenant_admin',
        password_hash: 'managed_by_supabase',
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (userError) {
      console.error('User creation error:', userError);
      // Rollback everything
      await supabaseAdmin.from('tenants').delete().eq('id', tenant.id);
      await supabaseAuth.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    // Step 4: Create trial subscription
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7); // 7-day trial

    const { error: subscriptionError } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        tenant_id: tenant.id,
        plan_id: null, // Will be set when they choose a plan
        status: 'trial',
        billing_cycle: 'monthly',
        trial_ends_at: trialEndsAt.toISOString(),
        current_period_start: new Date().toISOString(),
        current_period_end: trialEndsAt.toISOString()
      });

    if (subscriptionError) {
      console.error('Subscription creation error:', subscriptionError);
      // Don't fail the whole process for subscription errors
    }

    return NextResponse.json({
      success: true,
      tenant,
      user: {
        id: authData.user.id,
        email: admin_email,
        name: admin_name,
        role: 'tenant_admin'
      }
    });

  } catch (error) {
    console.error('Admin tenant creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
