import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

// GET - Print settings for tenant
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenant_id = searchParams.get('tenant_id');

    if (!tenant_id) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('print_settings')
      .select('*')
      .eq('tenant_id', tenant_id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Print settings fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch print settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      settings: data || {
        print_header: 'SALES RECEIPT',
        print_footer: 'Thank you for your business!',
        paper_width: 48,
        font_size: 'normal'
      }
    });

  } catch (error) {
    console.error('Print settings API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create or update print settings
export async function POST(request: NextRequest) {
  try {
    const settingsData = await request.json();
    const { tenant_id, print_header, print_footer, paper_width, font_size, printer_name, print_logo, logo_url } = settingsData;

    if (!tenant_id) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    // Upsert print settings
    const { data, error } = await supabaseAdmin
      .from('print_settings')
      .upsert({
        tenant_id,
        print_header: print_header || 'SALES RECEIPT',
        print_footer: print_footer || 'Thank you for your business!',
        paper_width: paper_width || 48,
        font_size: font_size || 'normal',
        printer_name: printer_name || null,
        print_logo: print_logo || false,
        logo_url: logo_url || null,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Print settings save error:', error);
      return NextResponse.json(
        { error: 'Failed to save print settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({ settings: data });

  } catch (error) {
    console.error('Print settings API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update print settings
export async function PUT(request: NextRequest) {
  try {
    const settingsData = await request.json();
    const { tenant_id, ...updateData } = settingsData;

    if (!tenant_id) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('print_settings')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('tenant_id', tenant_id)
      .select()
      .single();

    if (error) {
      console.error('Print settings update error:', error);
      return NextResponse.json(
        { error: 'Failed to update print settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({ settings: data });

  } catch (error) {
    console.error('Print settings API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
