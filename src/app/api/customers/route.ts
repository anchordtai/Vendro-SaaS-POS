import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

// GET all customers for a tenant
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenant_id = searchParams.get('tenant_id');
    const search = searchParams.get('search');

    if (!tenant_id) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    // Use supabaseAdmin for admin operations
    let query = supabaseAdmin
      .from('customers')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('is_active', true);

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data: customers, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Customers fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get sales count and total spent for each customer
    const transformedCustomers = await Promise.all(
      (customers || []).map(async (customer) => {
        const { data: salesData, error: salesError } = await supabaseAdmin
          .from('sales')
          .select('total_amount')
          .eq('customer_id', customer.id)
          .eq('status', 'completed');

        const orders = salesData?.length || 0;
        const totalSpent = salesData?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;

        return {
          ...customer,
          orders,
          totalSpent
        };
      })
    );

    return NextResponse.json(transformedCustomers);
  } catch (error) {
    console.error('Customers API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST create new customer
export async function POST(request: NextRequest) {
  try {
    const customerData = await request.json();
    const { tenant_id, name, email, phone, address } = customerData;

    // Validate required fields
    if (!tenant_id || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: customer, error } = await supabaseAdmin
      .from('customers')
      .insert({
        tenant_id,
        name,
        email: email || null,
        phone: phone || null,
        address: address || null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Customer creation error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ...customer, orders: 0, totalSpent: 0 }, { status: 201 });
  } catch (error) {
    console.error('Customer creation API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT update customer
export async function PUT(request: NextRequest) {
  try {
    const customerData = await request.json();
    const { id, ...updates } = customerData;

    if (!id) {
      return NextResponse.json({ error: 'Customer ID required' }, { status: 400 });
    }

    const { data: customer, error } = await supabaseAdmin
      .from('customers')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Customer update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(customer);
  } catch (error) {
    console.error('Customer update API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE customer (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Customer ID required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('customers')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Customer deletion error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Customer deletion API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
