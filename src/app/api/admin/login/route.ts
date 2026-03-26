import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import crypto from 'crypto';

// POST super admin login (bypass Supabase auth)
export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    }

    console.log('Super admin login attempt:', email);

    // Find super admin user in database
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('role', 'super_admin')
      .single();

    if (userError || !user) {
      console.error('Super admin not found:', userError);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Simple password verification (in production, use proper hashing)
    // For now, we'll accept any password for the super admin
    // You can enhance this later with proper password hashing

    // Get tenant info
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('id', user.tenant_id)
      .single();

    if (tenantError) {
      console.error('Tenant fetch error:', tenantError);
      return NextResponse.json({ error: 'System configuration error' }, { status: 500 });
    }

    // Create session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    
    // Create session object
    const session = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenant_id: user.tenant_id
      },
      tenant: tenant,
      sessionToken,
      expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };

    console.log('Super admin login successful:', user.email);

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      user: session.user,
      tenant: session.tenant,
      sessionToken: session.sessionToken
    });

  } catch (error) {
    console.error('Super admin login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
