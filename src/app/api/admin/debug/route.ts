import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET debug database status
export async function GET() {
  try {
    const debug = {
      tables: {},
      errors: []
    };

    // Check tenants table
    try {
      const { data: tenants, error: tenantsError } = await supabaseAdmin
        .from('tenants')
        .select('count')
        .limit(1);
      
      debug.tables.tenants = tenantsError ? { error: tenantsError.message } : { status: 'OK', count: tenants?.length || 0 };
    } catch (e) {
      debug.tables.tenants = { error: e.message };
      debug.errors.push(`Tenants table: ${e.message}`);
    }

    // Check users table
    try {
      const { data: users, error: usersError } = await supabaseAdmin
        .from('users')
        .select('count')
        .limit(1);
      
      debug.tables.users = usersError ? { error: usersError.message } : { status: 'OK', count: users?.length || 0 };
    } catch (e) {
      debug.tables.users = { error: e.message };
      debug.errors.push(`Users table: ${e.message}`);
    }

    // Check products table
    try {
      const { data: products, error: productsError } = await supabaseAdmin
        .from('products')
        .select('count')
        .limit(1);
      
      debug.tables.products = productsError ? { error: productsError.message } : { status: 'OK', count: products?.length || 0 };
    } catch (e) {
      debug.tables.products = { error: e.message };
      debug.errors.push(`Products table: ${e.message}`);
    }

    // Check customers table
    try {
      const { data: customers, error: customersError } = await supabaseAdmin
        .from('customers')
        .select('count')
        .limit(1);
      
      debug.tables.customers = customersError ? { error: customersError.message } : { status: 'OK', count: customers?.length || 0 };
    } catch (e) {
      debug.tables.customers = { error: e.message };
      debug.errors.push(`Customers table: ${e.message}`);
    }

    // Check sales table
    try {
      const { data: sales, error: salesError } = await supabaseAdmin
        .from('sales')
        .select('count')
        .limit(1);
      
      debug.tables.sales = salesError ? { error: salesError.message } : { status: 'OK', count: sales?.length || 0 };
    } catch (e) {
      debug.tables.sales = { error: e.message };
      debug.errors.push(`Sales table: ${e.message}`);
    }

    // Check subscriptions table
    try {
      const { data: subscriptions, error: subscriptionsError } = await supabaseAdmin
        .from('subscriptions')
        .select('count')
        .limit(1);
      
      debug.tables.subscriptions = subscriptionsError ? { error: subscriptionsError.message } : { status: 'OK', count: subscriptions?.length || 0 };
    } catch (e) {
      debug.tables.subscriptions = { error: e.message };
      debug.errors.push(`Subscriptions table: ${e.message}`);
    }

    // Test super admin creation
    try {
      const { data: existingAdmin, error: adminError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('role', 'super_admin')
        .limit(1);
      
      debug.superAdmin = adminError ? { error: adminError.message } : { 
        status: 'OK', 
        exists: existingAdmin && existingAdmin.length > 0,
        count: existingAdmin?.length || 0 
      };
    } catch (e) {
      debug.superAdmin = { error: e.message };
      debug.errors.push(`Super admin check: ${e.message}`);
    }

    return NextResponse.json(debug);

  } catch (error) {
    return NextResponse.json({ 
      error: 'Debug failed', 
      message: error.message 
    }, { status: 500 });
  }
}
