import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    console.log('🔐 LOGIN ATTEMPT - Enhanced Logging');
    console.log('Email:', email);
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

    if (!email || !password) {
      console.log('❌ Missing credentials');
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Step 1: Authenticate with Supabase
    console.log('🔑 Step 1: Authenticating with Supabase...');
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.log('❌ Authentication failed:', authError.message);
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    if (!authData?.user) {
      console.log('❌ No user data returned from auth');
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }

    console.log('✅ Authentication successful for user ID:', authData.user.id);

    // Step 2: Look up user in our database with self-healing
    console.log('👤 Step 2: Looking up user in database...');
    let userData, userError;
    
    try {
      const result = await supabaseAdmin
        .from('users')
        .select('*, tenant:tenant_id(*)')
        .eq('id', authData.user.id)
        .single();
      
      userData = result.data;
      userError = result.error;
    } catch (err) {
      console.log('❌ Database query error:', err);
      userError = err;
    }

    console.log('User lookup result:', { 
      found: !!userData, 
      error: userError?.message,
      userId: authData.user.id 
    });

    // Step 3: Self-healing if user not found
    if (userError || !userData) {
      console.log('🔄 Step 3: User not found, attempting self-healing...');
      
      try {
        const { data: healResult, error: healError } = await supabaseAdmin
          .rpc('self_heal_user', { auth_user_id: authData.user.id });

        if (healError) {
          console.log('❌ Self-healing failed:', healError.message);
          return NextResponse.json(
            { error: 'User account setup failed. Please contact support.' },
            { status: 500 }
          );
        }

        console.log('✅ Self-healing result:', healResult);

        if (!healResult || healResult.length === 0 || !healResult[0].success) {
          console.log('❌ Self-healing unsuccessful:', healResult);
          return NextResponse.json(
            { error: 'User account setup failed. Please contact support.' },
            { status: 500 }
          );
        }

        // Retry user lookup after self-healing
        console.log('🔄 Step 4: Retrying user lookup after self-healing...');
        const retryResult = await supabaseAdmin
          .from('users')
          .select('*, tenant:tenant_id(*)')
          .eq('id', authData.user.id)
          .single();

        if (retryResult.error || !retryResult.data) {
          console.log('❌ User lookup still failed after self-healing');
          return NextResponse.json(
            { error: 'User account setup incomplete. Please try again.' },
            { status: 500 }
          );
        }

        userData = retryResult.data;
        console.log('✅ User found after self-healing:', userData.id);

      } catch (healErr) {
        console.log('❌ Self-healing exception:', healErr);
        return NextResponse.json(
          { error: 'User account setup failed. Please contact support.' },
          { status: 500 }
        );
      }
    }

    // Step 5: Validate user status
    if (!userData.is_active) {
      console.log('❌ User account is inactive');
      return NextResponse.json(
        { error: 'Account is inactive' },
        { status: 403 }
      );
    }

    // Step 6: Get tenant info
    console.log('🏢 Step 5: Getting tenant information...');
    const { data: tenantData, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('id, business_name, business_type, business_size')
      .eq('id', userData.tenant_id)
      .single();

    if (tenantError || !tenantData) {
      console.log('❌ Tenant not found:', tenantError?.message);
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Step 7: Get subscription info
    console.log('💳 Step 6: Getting subscription information...');
    const { data: subscription, error: subscriptionError } = await supabaseAdmin
      .from('subscriptions')
      .select('*, plan:plan_id(*)')
      .eq('tenant_id', userData.tenant_id)
      .eq('status', 'active')
      .single();

    // Step 8: Update last login
    try {
      await supabaseAdmin
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', authData.user.id);
    } catch (updateErr) {
      console.log('⚠️ Failed to update last login:', updateErr);
      // Non-critical, continue
    }

    // Step 9: Check subscription status
    let subscriptionStatus = 'active';
    let redirectTo = null;
    
    if (subscription) {
      if (subscription.status === 'trial' && subscription.trial_ends_at) {
        const trialEnd = new Date(subscription.trial_ends_at);
        if (trialEnd < new Date()) {
          subscriptionStatus = 'trial_expired';
          redirectTo = `/pricing?tenant_id=${userData.tenant_id}`;
        }
      }
    } else {
      subscriptionStatus = 'no_subscription';
      redirectTo = `/pricing?tenant_id=${userData.tenant_id}`;
    }

    // Step 10: Prepare response
    const response = {
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        tenant_id: userData.tenant_id,
        is_active: userData.is_active,
        last_login: userData.last_login
      },
      tenant: tenantData,
      subscription: subscription,
      session: authData.session,
      subscriptionStatus,
      redirectTo
    };

    console.log('✅ Login successful:', {
      userId: userData.id,
      role: userData.role,
      tenantId: userData.tenant_id,
      subscriptionStatus
    });

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('💥 Login system error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
