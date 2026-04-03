import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET all subscriptions with tenant and plan details
export async function GET() {
  try {
    const { data: subscriptions, error } = await supabaseAdmin
      .from('subscriptions')
      .select(`
        *,
        tenants (
          id,
          business_name,
          business_type,
          business_size
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Subscriptions fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get plan details separately and merge
    const subscriptionsWithPlans = await Promise.all(
      (subscriptions || []).map(async (sub) => {
        // Get plan info - handle missing price column
        let planInfo = null;
        if (sub.plan_id) {
          const { data: planData } = await supabaseAdmin
            .from('plans')
            .select('id, name, features')
            .eq('id', sub.plan_id)
            .single();
          
          planInfo = planData ? {
            ...planData,
            price: getDefaultPrice(sub.plan_name) // Use default price based on plan name
          } : null;
        }

        return {
          ...sub,
          plan: planInfo || {
            id: sub.plan_id,
            name: sub.plan_name || 'Basic',
            price: getDefaultPrice(sub.plan_name),
            features: []
          }
        };
      })
    );

    return NextResponse.json(subscriptionsWithPlans);

  } catch (error) {
    console.error('Subscriptions API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to get default prices based on plan names
function getDefaultPrice(planName: string): number {
  const prices: { [key: string]: number } = {
    'basic': 5000,
    'pro': 15000,
    'enterprise': 50000,
    'Basic': 5000,
    'Pro': 15000,
    'Enterprise': 50000
  };
  return prices[planName] || 5000;
}

// POST create a new subscription (if needed)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { data: subscription, error } = await supabaseAdmin
      .from('subscriptions')
      .insert([body])
      .select()
      .single();

    if (error) {
      console.error('Subscription creation error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(subscription);

  } catch (error) {
    console.error('Subscription creation API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
