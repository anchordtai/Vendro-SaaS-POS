import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { TenantService } from '@/lib/tenant-service';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/login',
    '/signup',
    '/signup/success',
    '/pricing',
    '/api/auth',
    '/api/payments',
    '/payment/success',
    '/payment/failed',
    '/admin/setup',
    '/admin/setup-simple',
    '/admin/setup-manual',
    '/admin/login'
  ];

  // Check if the route is public
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route)
  );

  // Allow public routes
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Check authentication
  let user = null;
  
  // Try custom session first (for super admin)
  const sessionCookie = request.cookies.get('vendro_session')?.value;
  if (sessionCookie && pathname.startsWith('/admin')) {
    try {
      const session = JSON.parse(sessionCookie);
      if (session.user && session.user.role === 'super_admin') {
        user = { id: session.user.id };
      }
    } catch (_e) {
      // Invalid session, continue to Supabase auth
    }
  }
  
  // If no custom session, try Supabase auth
  if (!user) {
    const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser();
    user = supabaseUser;

    if (authError || !user) {
      // Redirect to login for protected routes
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Handle admin routes - only super_admin can access
  if (pathname.startsWith('/admin')) {
    if (sessionCookie) {
      try {
        const session = JSON.parse(sessionCookie);
        if (session.user && session.user.role === 'super_admin') {
          // Super admin bypasses tenant checks
          return NextResponse.next();
        }
      } catch (_e) {
        // Invalid session
      }
    }
    // Redirect non-super admins to their dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Get user's tenant and subscription
  try {
    const userRecord = await supabase
      .from('users')
      .select('tenant_id, role, is_active')
      .eq('id', user.id)
      .single();

    if (!userRecord.data || !userRecord.data.is_active) {
      // User not found or inactive
      return NextResponse.redirect(new URL('/login?error=inactive', request.url));
    }

    const tenant = await TenantService.getTenantById(userRecord.data.tenant_id);
    if (!tenant) {
      // Tenant not found
      return NextResponse.redirect(new URL('/login?error=tenant', request.url));
    }

    const subscription = await TenantService.getSubscription(userRecord.data.tenant_id);
    
    // Check subscription status for dashboard routes
    if (pathname.startsWith('/dashboard')) {
      if (!subscription || !['trial', 'active'].includes(subscription.status)) {
        // Redirect to pricing if subscription is expired
        return NextResponse.redirect(new URL('/pricing?reason=expired', request.url));
      }

      // Check if trial has expired (14-day trial)
      if (subscription.status === 'trial' && subscription.trial_ends_at) {
        const trialEnd = new Date(subscription.trial_ends_at);
        const now = new Date();
        if (now > trialEnd) {
          // Trial expired, redirect to pricing
          return NextResponse.redirect(new URL('/pricing?reason=trial_expired', request.url));
        }
      }
    }

    // Check role-based access
    if (pathname.startsWith('/dashboard/admin')) {
      if (!['tenant_admin', 'manager'].includes(userRecord.data.role)) {
        return NextResponse.redirect(new URL('/dashboard?error=unauthorized', request.url));
      }
    }

    // Add tenant info to headers for use in the application
    const response = NextResponse.next();
    response.headers.set('x-tenant-id', userRecord.data.tenant_id);
    response.headers.set('x-user-role', userRecord.data.role);
    response.headers.set('x-subscription-status', subscription?.status || 'none');

    return response;

  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.redirect(new URL('/login?error=server', request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
