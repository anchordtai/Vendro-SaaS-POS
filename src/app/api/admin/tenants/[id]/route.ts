import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// DELETE a tenant (cascade delete all related data)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Get all users for this tenant to delete auth accounts
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('tenant_id', id);

    if (usersError) {
      console.error('Users fetch error:', usersError);
      return NextResponse.json({ error: usersError.message }, { status: 500 });
    }

    // Delete all data in the correct order (respecting foreign keys)
    
    // 1. Delete sales items first
    const { error: salesItemsError } = await supabaseAdmin
      .from('sale_items')
      .delete()
      .in('sale_id', 
        supabaseAdmin
          .from('sales')
          .select('id')
          .eq('tenant_id', id)
      );

    // 2. Delete sales
    const { error: salesError } = await supabaseAdmin
      .from('sales')
      .delete()
      .eq('tenant_id', id);

    // 3. Delete products
    const { error: productsError } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('tenant_id', id);

    // 4. Delete customers
    const { error: customersError } = await supabaseAdmin
      .from('customers')
      .delete()
      .eq('tenant_id', id);

    // 5. Delete subscriptions
    const { error: subscriptionsError } = await supabaseAdmin
      .from('subscriptions')
      .delete()
      .eq('tenant_id', id);

    // 6. Delete user records
    const { error: userRecordsError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('tenant_id', id);

    // 7. Delete auth users
    if (users && users.length > 0) {
      for (const user of users) {
        try {
          await supabaseAuth.auth.admin.deleteUser(user.id);
        } catch (authError) {
          console.error(`Failed to delete auth user ${user.id}:`, authError);
          // Continue anyway
        }
      }
    }

    // 8. Finally delete the tenant
    const { error: tenantError } = await supabaseAdmin
      .from('tenants')
      .delete()
      .eq('id', id);

    if (tenantError) {
      console.error('Tenant deletion error:', tenantError);
      return NextResponse.json({ error: tenantError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Tenant and all associated data deleted successfully'
    });

  } catch (error) {
    console.error('Tenant deletion API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
