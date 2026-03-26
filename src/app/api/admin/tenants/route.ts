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
    const { data: tenants, error } = await supabaseAdmin
      .from('tenants')
      .select(`
        *,
        subscriptions(
          plan_name,
          status,
          expires_at,
          trial_ends_at
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Admin tenants fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get additional statistics for each tenant
    const enrichedTenants = await Promise.all(
      (tenants || []).map(async (tenant) => {
        // Get user count
        const { count: usersCount } = await supabaseAdmin
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenant.id);

        // Get total sales
        const { data: salesData } = await supabaseAdmin
          .from('sales')
          .select('total_amount')
          .eq('tenant_id', tenant.id)
          .eq('status', 'completed');

        const totalSales = salesData?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;

        // Get product count
        const { count: productsCount } = await supabaseAdmin
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenant.id)
          .eq('is_active', true);

        // Get customer count
        const { count: customersCount } = await supabaseAdmin
          .from('customers')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenant.id)
          .eq('is_active', true);

        return {
          ...tenant,
          status: 'active', // Default status since column doesn't exist
          users_count: usersCount || 0,
          total_sales: totalSales,
          total_products: productsCount || 0,
          total_customers: customersCount || 0
        };
      })
    );

    return NextResponse.json(enrichedTenants);

  } catch (error) {
    console.error('Admin tenants API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST create new tenant with admin user
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

    // Step 1: Create auth user
    const { data: authData, error: authError } = await supabaseAuth.auth.admin.createUser({
      email: admin_email,
      password: admin_password,
      email_confirm: true,
      user_metadata: {
        name: admin_name,
        role: 'tenant_admin'
      }
    });

    if (authError) {
      console.error('Auth user creation error:', authError);
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    // Step 2: Create tenant
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .insert({
        business_name,
        business_type,
        business_size,
        email: admin_email, // Add required email
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (tenantError) {
      console.error('Tenant creation error:', tenantError);
      // Rollback auth user creation
      await supabaseAuth.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: tenantError.message }, { status: 500 });
    }

    // Step 3: Create user record
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        tenant_id: tenant.id,
        name: admin_name,
        email: admin_email,
        role: 'tenant_admin',
        status: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
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
    trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14-day trial

    const { error: subscriptionError } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        tenant_id: tenant.id,
        plan_id: 'trial',
        plan_name: 'Trial Plan',
        status: 'trial',
        trial_ends_at: trialEndsAt.toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (subscriptionError) {
      console.error('Subscription creation error:', subscriptionError);
      // Continue anyway - tenant and user are created
    }

    // Return the created tenant with user info
    const responseTenant = {
      ...tenant,
      status: 'trial', // Default status
      users_count: 1,
      total_sales: 0,
      total_products: 0,
      total_customers: 0,
      subscription: {
        plan_name: 'Trial Plan',
        status: 'trial',
        expires_at: null,
        trial_ends_at: trialEndsAt.toISOString()
      }
    };

    return NextResponse.json(responseTenant, { status: 201 });

  } catch (error) {
    console.error('Admin tenant creation API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
