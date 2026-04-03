import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { tenant_id } = await request.json();

    if (!tenant_id) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }

    console.log('Creating trial subscription for tenant:', tenant_id);

    // Get starter plan
    let { data: plan, error: planError } = await supabaseAdmin
      .from('plans')
      .select('*')
      .eq('tier', 'starter')
      .eq('is_active', true)
      .maybeSingle();

    if (planError || !plan) {
      console.log('Creating default starter plan...');
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
        throw new Error('Failed to create default plan: ' + defaultPlanError.message);
      }
      plan = defaultPlan;
    }

    // Check if subscription already exists
    const { data: existingSubscription, error: existingError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('tenant_id', tenant_id)
      .maybeSingle();

    if (!existingError && existingSubscription) {
      // Update existing subscription to trial
      const { data: updatedSubscription, error: updateError } = await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'trial',
          plan_id: plan.id,
          trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('tenant_id', tenant_id)
        .select('*, plan:plan_id(*)')
        .single();

      if (updateError) {
        throw new Error('Failed to update subscription: ' + updateError.message);
      }

      return NextResponse.json({
        success: true,
        subscription: updatedSubscription,
        message: 'Trial subscription updated successfully'
      });
    }

    // Create new trial subscription
    const { data: subscription, error: subscriptionError } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        tenant_id: tenant_id,
        plan_id: plan.id,
        status: 'trial',
        billing_cycle: 'monthly',
        trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString()
      })
      .select('*, plan:plan_id(*)')
      .single();

    if (subscriptionError) {
      throw new Error('Failed to create subscription: ' + subscriptionError.message);
    }

    console.log('Trial subscription created successfully:', subscription.id);

    return NextResponse.json({
      success: true,
      subscription,
      message: '7-day trial subscription created successfully'
    });

  } catch (error: any) {
    console.error('Error creating trial subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create trial subscription' },
      { status: 500 }
    );
  }
}
