import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

// POST manual super admin setup (bypass auth)
export async function POST(request: Request) {
  try {
    const { email, name } = await request.json();

    if (!email || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log('Starting manual super admin setup...');

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

    // Generate a UUID for the super admin user
    const superAdminId = uuidv4();

    // Create user record directly in database (bypassing auth)
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: superAdminId,
        tenant_id: systemTenantId,
        name,
        email,
        role: 'super_admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (userError) {
      console.error('User record creation error:', userError);
      return NextResponse.json({ error: `User error: ${userError.message}` }, { status: 500 });
    }

    console.log('Manual super admin setup completed!');

    return NextResponse.json({
      success: true,
      message: 'Super admin created successfully (manual setup)',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        note: 'This is a manual setup. You will need to create the auth user manually in Supabase dashboard.'
      },
      instructions: {
        step1: 'Go to your Supabase dashboard',
        step2: 'Navigate to Authentication > Users',
        step3: 'Click "Add user"',
        step4: `Enter email: ${email}`,
        step5: `Enter user ID: ${superAdminId}`,
        step6: 'Set a password and save'
      }
    });

  } catch (error) {
    console.error('Manual super admin setup error:', error);
    return NextResponse.json({ error: `Internal server error: ${error.message}` }, { status: 500 });
  }
}
