import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

// GET all products for a tenant
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenant_id = searchParams.get('tenant_id');
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    if (!tenant_id) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    let query = supabaseAdmin
      .from('products')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('is_active', true);

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: products, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Products fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Add sales count of 0 for now (will be calculated later if needed)
    const transformedProducts = products?.map(product => ({
      ...product,
      sales: 0
    })) || [];

    return NextResponse.json(transformedProducts);
  } catch (error) {
    console.error('Products API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST create new product
export async function POST(request: NextRequest) {
  try {
    const productData = await request.json();
    const { tenant_id, name, price, stock, category, sku, description } = productData;

    // Validate required fields
    if (!tenant_id || !name || !price || !stock) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generate SKU if not provided
    const finalSku = sku || `PRD-${Date.now()}`;

    const { data: product, error } = await supabaseAdmin
      .from('products')
      .insert({
        tenant_id,
        name,
        price: parseFloat(price),
        stock: parseInt(stock),
        category: category || 'Other',
        sku: finalSku,
        description: description || '',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Product creation error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ...product, sales: 0 }, { status: 201 });
  } catch (error) {
    console.error('Product creation API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT update product
export async function PUT(request: NextRequest) {
  try {
    const productData = await request.json();
    const { id, ...updates } = productData;

    if (!id) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    }

    const { data: product, error } = await supabaseAdmin
      .from('products')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Product update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Product update API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE product (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('products')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Product deletion error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Product deletion API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
