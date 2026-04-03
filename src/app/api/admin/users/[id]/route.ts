import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// DELETE a user
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Delete user from database
    const { error } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('User deletion error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Also delete from auth (try, but don't fail if it doesn't work)
    try {
      await supabaseAdmin.auth.admin.deleteUser(id);
    } catch (authError) {
      console.error(`Failed to delete auth user ${id}:`, authError);
      // Continue anyway - the database record is deleted
    }

    return NextResponse.json({ message: 'User deleted successfully' });

  } catch (error) {
    console.error('User deletion API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
