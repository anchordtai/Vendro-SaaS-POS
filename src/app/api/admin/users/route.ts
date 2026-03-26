import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET all users for admin
export async function GET() {
  try {
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select(`
        *,
        tenants(
          business_name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Admin users fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform the data to include tenant name and default status
    const transformedUsers = users?.map(user => ({
      ...user,
      tenant_name: user.tenants?.business_name || 'Unknown',
      last_login: user.last_login || null,
      status: user.status || true // Default to active if status column doesn't exist
    })) || [];

    return NextResponse.json(transformedUsers);

  } catch (error) {
    console.error('Admin users API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST create new user
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, role, tenant_id, password } = body;

    if (!name || !email || !tenant_id || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Step 1: Create auth user
    const { data: authData, error: authError } = await supabaseAuth.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role
      }
    });

    if (authError) {
      console.error('Auth user creation error:', authError);
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    // Step 2: Create user record
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        tenant_id,
        name,
        email,
        role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select(`
        *,
        tenants(
          business_name
        )
      `)
      .single();

    if (userError) {
      console.error('User creation error:', userError);
      // Rollback auth user creation
      await supabaseAuth.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    // Transform the response
    const transformedUser = {
      ...user,
      tenant_name: user.tenants?.business_name || 'Unknown',
      last_login: null,
      status: user.status || true // Default to active
    };

    return NextResponse.json(transformedUser, { status: 201 });

  } catch (error) {
    console.error('Admin user creation API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
