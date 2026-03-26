import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

// GET sales for a tenant
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenant_id = searchParams.get('tenant_id');
    const limit = searchParams.get('limit');

    if (!tenant_id) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    let query = supabaseAdmin
      .from('sales')
      .select(`
        *,
        user:users(name, email),
        sale_items(
          id,
          product_id,
          product_name,
          quantity,
          unit_price,
          total_price
        )
      `)
      .eq('tenant_id', tenant_id)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const { data, error } = await query;

    if (error) {
      console.error('Sales fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch sales' },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);

  } catch (error) {
    console.error('Sales API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create new sale
export async function POST(request: NextRequest) {
  try {
    const saleData = await request.json();
    const { tenant_id, user_id, items, customer_name, customer_email, payment_method, notes } = saleData;

    // Generate receipt number
    const receipt_number = `RCP${Date.now()}`;

    // Calculate totals
    const subtotal = items.reduce((sum: number, item: any) => sum + (item.unit_price * item.quantity), 0);
    const total_amount = subtotal; // No tax - total equals subtotal

    // Start a transaction-like operation
    const { data: sale, error: saleError } = await supabaseAdmin
      .from('sales')
      .insert({
        tenant_id,
        user_id,
        cashier_id: user_id, // Set cashier_id to user_id for now
        cashier_name: null, // Will be updated later if needed
        receipt_number,
        customer_name,
        customer_email,
        subtotal,
        total_amount, // No tax_amount field
        payment_method,
        payment_status: 'completed',
        notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (saleError) {
      console.error('Sale creation error:', saleError);
      return NextResponse.json(
        { error: saleError.message },
        { status: 400 }
      );
    }

    // Insert sale items
    const saleItemsToInsert = items.map((item: any) => ({
      sale_id: sale.id,
      tenant_id: tenant_id, // Add tenant_id to sale items
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.unit_price * item.quantity, // Add subtotal
      total_price: item.unit_price * item.quantity,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { error: itemsError } = await supabaseAdmin
      .from('sale_items')
      .insert(saleItemsToInsert);

    if (itemsError) {
      console.error('Sale items creation error:', itemsError);
      console.error('Sale items data:', saleItemsToInsert);
      return NextResponse.json(
        { error: `Failed to create sale items: ${itemsError.message}` },
        { status: 500 }
      );
    }

    // Update inventory
    for (const item of items) {
      // Update product stock
      await supabaseAdmin
        .from('products')
        .update({ 
          stock_quantity: supabaseAdmin.rpc('increment', { 
            x: -item.quantity, 
            y: `stock_quantity` 
          })
        })
        .eq('id', item.product_id);

      // Create inventory transaction
      await supabase
        .from('inventory_transactions')
        .insert({
          tenant_id,
          product_id: item.product_id,
          transaction_type: 'sale',
          quantity_change: -item.quantity,
          reference_id: sale.id,
          notes: `Sale ${receipt_number}`,
          created_by: user_id,
          created_at: new Date().toISOString()
        });
    }

    return NextResponse.json({ sale }, { status: 201 });

  } catch (error) {
    console.error('Sale creation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
