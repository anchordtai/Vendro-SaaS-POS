import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

// Thermal printer receipt format
const formatReceipt = (receiptData: any) => {
  const receipt = [];
  
  // Header
  receipt.push('================================');
  receipt.push(receiptData.print_header || 'SALES RECEIPT');
  receipt.push('================================');
  receipt.push('');
  
  // Business info (you can customize this)
  receipt.push('Your Business Name');
  receipt.push('Address, City');
  receipt.push('Phone: +234 XXX XXX XXXX');
  receipt.push('');
  
  // Receipt details
  receipt.push(`Receipt #: ${receiptData.receipt_number}`);
  receipt.push(`Date: ${receiptData.date}`);
  receipt.push(`Cashier: ${receiptData.cashier}`);
  receipt.push('--------------------------------');
  
  // Items
  receipt.push('ITEMS');
  receipt.push('--------------------------------');
  
  receiptData.items.forEach((item: any) => {
    const name = item.name.padEnd(20);
    const qty = item.quantity.toString().padStart(3);
    const price = item.price.padStart(10);
    const total = item.total.padStart(10);
    
    receipt.push(name);
    receipt.push(`  Qty: ${qty}  Price: ${price}`);
    receipt.push(`              Total: ${total}`);
    receipt.push('');
  });
  
  // Totals
  receipt.push('--------------------------------');
  receipt.push(`Subtotal: ${receiptData.currency || '₦'}${receiptData.subtotal?.toFixed(2) || '0.00'}`);
  receipt.push('--------------------------------');
  receipt.push(`TOTAL: ${receiptData.currency || '₦'}${receiptData.total_amount?.toFixed(2) || '0.00'}`);
  receipt.push('--------------------------------');
  
  // Payment
  receipt.push(`Payment: ${receiptData.payment_method.toUpperCase()}`);
  receipt.push('');
  
  // Footer
  receipt.push(receiptData.print_footer || 'Thank you for your business!');
  receipt.push('================================');
  receipt.push('');
  
  return receipt.join('\n');
};

// POST - Print receipt
export async function POST(request: NextRequest) {
  try {
    const { sale_id, receipt_data } = await request.json();

    // Get print settings for tenant
    const { data: sale } = await supabaseAdmin
      .from('sales')
      .select('tenant_id')
      .eq('id', sale_id)
      .single();

    if (!sale) {
      return NextResponse.json(
        { error: 'Sale not found' },
        { status: 404 }
      );
    }

    const { data: printSettings } = await supabaseAdmin
      .from('print_settings')
      .select('*')
      .eq('tenant_id', sale.tenant_id)
      .single();

    // Format receipt for thermal printer
    const receiptText = formatReceipt({
      ...receipt_data,
      print_header: printSettings?.print_header || 'SALES RECEIPT',
      print_footer: printSettings?.print_footer || 'Thank you for your business!'
    });

    // Create receipt record
    const { data: receipt, error: receiptError } = await supabaseAdmin
      .from('receipts')
      .insert({
        sale_id,
        receipt_number: receipt_data.receipt_number,
        receipt_data: receipt_data,
        print_status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (receiptError) {
      console.error('Receipt creation error:', receiptError);
      return NextResponse.json(
        { error: 'Failed to create receipt record' },
        { status: 500 }
      );
    }

    // For thermal printing, you would typically:
    // 1. Connect to the thermal printer via USB/Bluetooth/Network
    // 2. Send the formatted text to the printer
    // 3. Handle printer status and errors

    // Since we're in a web environment, we'll simulate the printing
    // In a real implementation, you would use a printer service or driver
    
    try {
      // Simulate printer connection and printing
      console.log('Printing receipt:', receiptText);
      
      // Update receipt status to printed
      await supabase
        .from('receipts')
        .update({
          print_status: 'printed',
          printed_at: new Date().toISOString(),
          printer_name: printSettings?.printer_name || 'Default Printer'
        })
        .eq('id', receipt.id);

      return NextResponse.json({ 
        success: true, 
        receipt_id: receipt.id,
        message: 'Receipt printed successfully' 
      });

    } catch (printError) {
      console.error('Printing error:', printError);
      
      // Update receipt status to failed
      await supabase
        .from('receipts')
        .update({
          print_status: 'failed'
        })
        .eq('id', receipt.id);

      return NextResponse.json(
        { error: 'Failed to print receipt' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Receipt printing API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get receipt status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sale_id = searchParams.get('sale_id');

    if (!sale_id) {
      return NextResponse.json(
        { error: 'Sale ID is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('receipts')
      .select('*')
      .eq('sale_id', sale_id)
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Receipt not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ receipt: data });

  } catch (error) {
    console.error('Receipt status API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
