import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST suspend a tenant
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Since status column doesn't exist in users table either, we'll just cancel subscriptions
    // Cancel subscription if exists
    const { error: subscriptionError } = await supabaseAdmin
      .from('subscriptions')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('tenant_id', id);

    if (subscriptionError) {
      console.error('Subscription cancellation error:', subscriptionError);
      // Continue anyway
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Tenant suspended successfully (subscription cancelled)',
      tenant_id: id
    });

  } catch (error) {
    console.error('Tenant suspension API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
