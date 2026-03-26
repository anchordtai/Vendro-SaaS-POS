import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST setup super admin (one-time setup)
export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log('Starting super admin setup...');

    // First, let's just try to create the user record directly
    // We'll use a temporary UUID for the system tenant
    
    // Create system tenant first
    const systemTenantId = '00000000-0000-0000-0000-000000000000';
    
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .upsert({
        id: systemTenantId,
        business_name: 'Vendro System Administration',
        business_type: 'retail', // Use valid enum value
        business_size: 'large', // Use valid enum value
        email: 'admin@vendro.com', // Add required email
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (tenantError) {
      console.error('Tenant creation error:', tenantError);
      return NextResponse.json({ error: `Tenant error: ${tenantError.message}` }, { status: 500 });
    }

    console.log('System tenant created/verified');

    // Create auth user using admin API if available, otherwise use regular signup
    let authData;
    try {
      // Try admin approach first
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name,
          role: 'super_admin'
        }
      });
      
      if (error) throw error;
      authData = data;
    } catch (adminError) {
      console.log('Admin auth failed, trying regular signup:', adminError.message);
      
      // Fallback to regular signup
      const { data, error } = await supabaseAdmin.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role: 'super_admin'
          }
        }
      });

      if (error) {
        console.error('Auth signup error:', error);
        return NextResponse.json({ error: `Auth error: ${error.message}` }, { status: 500 });
      }

      if (!data.user) {
        return NextResponse.json({ error: 'Failed to create auth user' }, { status: 500 });
      }

      authData = data;
    }

    console.log('Auth user created:', authData.user.id);

    // Create user record in the database
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: authData.user.id,
        tenant_id: systemTenantId,
        name,
        email,
        role: 'super_admin',
        status: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (userError) {
      console.error('User record creation error:', userError);
      return NextResponse.json({ error: `User error: ${userError.message}` }, { status: 500 });
    }

    console.log('Super admin setup completed successfully!');

    return NextResponse.json({
      success: true,
      message: 'Super admin created successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Super admin setup error:', error);
    return NextResponse.json({ error: `Internal server error: ${error.message}` }, { status: 500 });
  }
}
