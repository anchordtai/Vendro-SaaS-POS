import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenant_id');
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*, plan:plan_id(*)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching subscription:', error);
      return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 });
    }

    if (!subscription) {
      return NextResponse.json({ 
        status: 'no_subscription',
        message: 'No subscription found' 
      });
    }

    // Check if trial has expired
    let status = subscription.status;
    if (subscription.status === 'trial' && subscription.trial_ends_at) {
      const trialEnd = new Date(subscription.trial_ends_at);
      const now = new Date();
      if (now > trialEnd) {
        status = 'trial_expired';
      }
    }

    return NextResponse.json({
      status,
      subscription: {
        ...subscription,
        calculated_status: status
      }
    });

  } catch (error) {
    console.error('Error in subscription status API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
