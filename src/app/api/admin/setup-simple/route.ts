import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST setup super admin (simplified version)
export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log('Starting simple super admin setup...');

    // Create system tenant first
    const systemTenantId = '00000000-0000-0000-0000-000000000000';
    
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .upsert({
        id: systemTenantId,
        business_name: 'Vendro System Administration',
        business_type: 'retail',
        business_size: 'large',
        email: 'admin@vendro.com',
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

    // Try to create auth user first
    let authUserId;
    try {
      const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role: 'super_admin'
          }
        }
      });

      if (authError) {
        console.log('Auth signup failed, user might already exist:', authError.message);
        // Try to get existing user
        const { data: existingUser } = await supabaseAdmin.auth.getUser();
        if (existingUser?.user) {
          authUserId = existingUser.user.id;
        } else {
          return NextResponse.json({ error: `Auth error: ${authError.message}` }, { status: 500 });
        }
      } else {
        authUserId = authData.user?.id;
      }
    } catch (authError) {
      console.error('Auth process error:', authError);
      return NextResponse.json({ error: 'Auth process failed' }, { status: 500 });
    }

    if (!authUserId) {
      return NextResponse.json({ error: 'Failed to get auth user ID' }, { status: 500 });
    }

    console.log('Auth user ID:', authUserId);

    // Create user record in database
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: authUserId,
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
