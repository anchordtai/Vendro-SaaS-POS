import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(
  request: Request,
  { params }: { params: { id: string; action: string } }
) {
  try {
    const { id, action } = params;
    
    let updateData: any = {};
    let successMessage = '';

    switch (action) {
      case 'upgrade':
        // Upgrade trial to active subscription
        updateData = {
          status: 'active',
          trial_ends_at: null,
          updated_at: new Date().toISOString()
        };
        successMessage = 'Subscription upgraded successfully';
        break;

      case 'cancel':
        // Cancel subscription
        updateData = {
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        successMessage = 'Subscription cancelled successfully';
        break;

      case 'reactivate':
        // Reactivate expired subscription
        updateData = {
          status: 'active',
          cancelled_at: null,
          next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          updated_at: new Date().toISOString()
        };
        successMessage = 'Subscription reactivated successfully';
        break;

      case 'extend':
        // Extend subscription by 30 days
        const { data: currentSub } = await supabaseAdmin
          .from('subscriptions')
          .select('next_billing_date')
          .eq('id', id)
          .single();

        const currentBillingDate = currentSub?.next_billing_date 
          ? new Date(currentSub.next_billing_date)
          : new Date();
        
        const newBillingDate = new Date(currentBillingDate.getTime() + 30 * 24 * 60 * 60 * 1000);

        updateData = {
          next_billing_date: newBillingDate.toISOString(),
          updated_at: new Date().toISOString()
        };
        successMessage = 'Subscription extended successfully';
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const { data: subscription, error } = await supabaseAdmin
      .from('subscriptions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Subscription ${action} error:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: successMessage,
      subscription
    });

  } catch (error) {
    console.error('Subscription action API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
