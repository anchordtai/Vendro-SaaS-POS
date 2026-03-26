import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/lib/payment-service';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const {
      planId,
      tenantId,
      billingCycle,
      customerEmail,
      customerName,
      customerPhone
    } = await request.json();

    // Validate input
    if (!planId || !tenantId || !billingCycle || !customerEmail || !customerName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify user has access to this tenant
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: userRecord } = await supabase
      .from('users')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (!userRecord || userRecord.tenant_id !== tenantId || !['tenant_admin', 'manager'].includes(userRecord.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Initialize payment
    const paymentResult = await PaymentService.initializePayment({
      planId,
      tenantId,
      billingCycle,
      customerEmail,
      customerName,
      customerPhone
    });

    return NextResponse.json(paymentResult);
  } catch (error) {
    console.error('Payment initialization error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize payment' },
      { status: 500 }
    );
  }
}
