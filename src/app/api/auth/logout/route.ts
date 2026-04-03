import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    await supabase.auth.signOut();
    const res = NextResponse.json({ message: 'Logged out successfully' });
    res.cookies.delete("vendro_session");
    res.cookies.delete("pos_session");
    return res;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}
