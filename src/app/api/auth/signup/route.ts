import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { 
      email, 
      password, 
      name,
      business_name,
      business_type,
      business_size 
    } = await request.json();
    
    console.log('🚀 SIGNUP ATTEMPT - Enhanced Logging');
    console.log('Email:', email);
    console.log('Business:', business_name);
    console.log('Business Type:', business_type);
    console.log('Business Size:', business_size);

    // Validate required fields
    if (!email || !password || !name || !business_name || !business_type || !business_size) {
      console.log('❌ Missing required fields');
      return NextResponse.json(
        { error: 'All fields are required: email, password, name, business_name, business_type, business_size' },
        { status: 400 }
      );
    }

    // Validate business type and size
    const validBusinessTypes = ['pharmacy', 'hotel_bar', 'nightclub', 'grocery', 'retail'];
    const validBusinessSizes = ['small', 'medium', 'large'];

    if (!validBusinessTypes.includes(business_type)) {
      return NextResponse.json(
        { error: 'Invalid business type. Must be one of: ' + validBusinessTypes.join(', ') },
        { status: 400 }
      );
    }

    if (!validBusinessSizes.includes(business_size)) {
      return NextResponse.json(
        { error: 'Invalid business size. Must be one of: ' + validBusinessSizes.join(', ') },
        { status: 400 }
      );
    }

    // Step 1: Create auth user with metadata
    console.log('🔑 Step 1: Creating auth user...');
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for development
      user_metadata: {
        name,
        business_name,
        business_type,
        business_size,
        role: 'tenant_admin'
      }
    });

    if (authError) {
      console.log('❌ Auth user creation failed:', authError.message);
      
      // Handle specific errors
      if (authError.message.includes('User already registered')) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to create account: ' + authError.message },
        { status: 500 }
      );
    }

    if (!authData?.user) {
      console.log('❌ No auth user data returned');
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      );
    }

    console.log('✅ Auth user created successfully:', authData.user.id);

    // Step 2: Create tenant
    console.log('🏢 Step 2: Creating tenant...');
    let tenantData;
    try {
      const { data: tenant, error: tenantError } = await supabaseAdmin
        .from('tenants')
        .insert({
          business_name,
          business_type,
          business_size,
          email,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (tenantError) {
        console.log('❌ Tenant creation failed:', tenantError.message);
        
        // Cleanup auth user on failure
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        
        return NextResponse.json(
          { error: 'Failed to create business: ' + tenantError.message },
          { status: 500 }
        );
      }

      tenantData = tenant;
      console.log('✅ Tenant created successfully:', tenantData.id);

    } catch (tenantErr) {
      console.log('❌ Tenant creation exception:', tenantErr);
      
      // Cleanup auth user on failure
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      
      return NextResponse.json(
        { error: 'Failed to create business' },
        { status: 500 }
      );
    }

    // Step 3: Get starter plan
    console.log('💳 Step 3: Getting starter plan...');
    let planData;
    try {
      const { data: plan, error: planError } = await supabaseAdmin
        .from('plans')
        .select('*')
        .eq('tier', 'starter')
        .eq('is_active', true)
        .single();

      if (planError || !plan) {
        console.log('⚠️ No starter plan found, using default');
        // Create a default plan if none exists
        const { data: defaultPlan, error: defaultPlanError } = await supabaseAdmin
          .from('plans')
          .insert({
            name: 'Starter Plan',
            tier: 'starter',
            monthly_price: 0,
            yearly_price: 0,
            max_products: 100,
            max_outlets: 1,
            max_users: 3,
            features: ['POS', 'Inventory', 'Basic Reports'],
            is_active: true
          })
          .select()
          .single();

        if (defaultPlanError) {
          console.log('❌ Failed to create default plan:', defaultPlanError.message);
        } else {
          planData = defaultPlan;
        }
      } else {
        planData = plan;
      }

      console.log('✅ Plan ready:', planData?.id || 'default');

    } catch (planErr) {
      console.log('⚠️ Plan setup failed, continuing:', planErr);
    }

    // Step 4: Create subscription
    console.log('💳 Step 4: Creating subscription...');
    let subscriptionData;
    try {
      const { data: subscription, error: subscriptionError } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          tenant_id: tenantData.id,
          plan_id: planData?.id || null,
          status: 'trial',
          billing_cycle: 'monthly',
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString()
        })
        .select('*, plan:plan_id(*)')
        .single();

      if (subscriptionError) {
        console.log('❌ Subscription creation failed:', subscriptionError.message);
        
        // Cleanup on failure
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        await supabaseAdmin.from('tenants').delete().eq('id', tenantData.id);
        
        return NextResponse.json(
          { error: 'Failed to create subscription: ' + subscriptionError.message },
          { status: 500 }
        );
      }

      subscriptionData = subscription;
      console.log('✅ Subscription created successfully:', subscriptionData.id);

    } catch (subscriptionErr) {
      console.log('❌ Subscription creation exception:', subscriptionErr);
      
      // Cleanup on failure
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      await supabaseAdmin.from('tenants').delete().eq('id', tenantData.id);
      
      return NextResponse.json(
        { error: 'Failed to create subscription' },
        { status: 500 }
      );
    }

    // Step 5: Create user record (this should be handled by trigger, but let's ensure it)
    console.log('👤 Step 5: Creating user record...');
    try {
      const { data: userRecord, error: userError } = await supabaseAdmin
        .from('users')
        .insert({
          id: authData.user.id,
          tenant_id: tenantData.id,
          email,
          name,
          role: 'tenant_admin',
          is_active: true,
          created_at: new Date().toISOString()
        })
        .select('*, tenant:tenant_id(*)')
        .single();

      if (userError) {
        console.log('❌ User record creation failed:', userError.message);
        
        // Don't cleanup for user record errors as trigger might handle it
        console.log('⚠️ User record might be created by trigger');
      } else {
        console.log('✅ User record created successfully:', userRecord.id);
      }

    } catch (userErr) {
      console.log('⚠️ User record creation exception:', userErr);
      console.log('⚠️ User record might be created by trigger');
    }

    // Step 6: Create session for immediate login
    console.log('🔐 Step 6: Creating session...');
    let sessionData;
    try {
      const { data: session, error: sessionError } = await supabaseAdmin.auth.signInWithPassword({
        email,
        password
      });

      if (sessionError) {
        console.log('⚠️ Session creation failed:', sessionError.message);
        // Don't fail the signup, just no immediate session
      } else {
        sessionData = session;
        console.log('✅ Session created successfully');
      }

    } catch (sessionErr) {
      console.log('⚠️ Session creation exception:', sessionErr);
    }

    // Step 7: Get final user data
    console.log('👤 Step 7: Getting final user data...');
    let finalUserData;
    try {
      const { data: finalUser, error: finalUserError } = await supabaseAdmin
        .from('users')
        .select('*, tenant:tenant_id(*)')
        .eq('id', authData.user.id)
        .single();

      if (!finalUserError && finalUser) {
        finalUserData = finalUser;
      } else {
        console.log('⚠️ Could not fetch final user data');
      }

    } catch (finalUserErr) {
      console.log('⚠️ Final user fetch exception:', finalUserErr);
    }

    // Step 8: Prepare response
    const response = {
      success: true,
      message: 'Account created successfully!',
      user: finalUserData ? {
        id: finalUserData.id,
        email: finalUserData.email,
        name: finalUserData.name,
        role: finalUserData.role,
        tenant_id: finalUserData.tenant_id,
        is_active: finalUserData.is_active
      } : {
        id: authData.user.id,
        email,
        name,
        role: 'tenant_admin',
        tenant_id: tenantData.id,
        is_active: true
      },
      tenant: tenantData,
      subscription: subscriptionData,
      session: sessionData?.session || null,
      redirectTo: '/dashboard'
    };

    console.log('✅ Signup completed successfully:', {
      userId: authData.user.id,
      tenantId: tenantData.id,
      subscriptionId: subscriptionData?.id,
      hasSession: !!sessionData?.session
    });

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('💥 Signup system error:', error);
    return NextResponse.json(
      { error: 'Internal server error during signup' },
      { status: 500 }
    );
  }
}
