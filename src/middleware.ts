import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase";
import { fetchTenantSubscription, isTrialExpired } from "@/services/subscription/subscription-service";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

let supabaseAnon: ReturnType<typeof createClient> | null = null;
try {
  if (supabaseUrl && supabaseAnonKey) {
    supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
  }
} catch (e) {
  console.error("[middleware] anon client init failed", e);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const publicRoutes = [
    "/",
    "/login",
    "/signup",
    "/signup/success",
    "/pricing",
    "/api/payments",
    "/payment/success",
    "/payment/failed",
    "/admin/setup",
    "/admin/setup-simple",
    "/admin/setup-manual",
    "/admin/login",
  ];

  const publicAuthApi =
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/signup" ||
    pathname === "/api/auth/logout";

  const isPublicRoute =
    publicAuthApi ||
    publicRoutes.some(
      (route) => pathname === route || pathname.startsWith(route)
    );

  if (isPublicRoute) {
    return NextResponse.next();
  }

  let user: { id: string } | null = null;

  const sessionCookie = request.cookies.get("vendro_session")?.value;
  if (sessionCookie && supabaseAnon) {
    try {
      const session = JSON.parse(sessionCookie);
      if (session?.session?.access_token && session?.session?.refresh_token) {
        const { data, error } = await supabaseAnon.auth.setSession({
          access_token: session.session.access_token,
          refresh_token: session.session.refresh_token,
        });
        if (!error && data?.user) {
          user = data.user;
        }
      }
    } catch (e) {
      console.warn("[middleware] session cookie parse failed", e);
    }
  }

  if (!user && supabaseAnon) {
    const { data } = await supabaseAnon.auth.getUser();
    if (data?.user) user = data.user;
  }

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const { data: row } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (row?.role !== "super_admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  const { data: userRow, error: userFetchErr } = await supabaseAdmin
    .from("users")
    .select("tenant_id, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (userFetchErr) {
    console.error("[middleware] users fetch", {
      userId: user.id,
      message: userFetchErr.message,
    });
  }

  if (!userRow?.tenant_id || !userRow.is_active) {
    console.log("[middleware] missing or inactive user row", { userId: user.id });
    return NextResponse.redirect(new URL("/login?error=inactive", request.url));
  }

  if (userRow.role === "super_admin") {
    if (pathname.startsWith("/dashboard")) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    const res = NextResponse.next();
    res.headers.set("x-tenant-id", userRow.tenant_id);
    res.headers.set("x-user-role", "super_admin");
    res.headers.set("x-subscription-status", "super_admin");
    return res;
  }

  const { data: tenant, error: tenantErr } = await supabaseAdmin
    .from("tenants")
    .select("id")
    .eq("id", userRow.tenant_id)
    .maybeSingle();

  if (tenantErr || !tenant) {
    console.log("[middleware] tenant not found", {
      tenant_id: userRow.tenant_id,
    });
    return NextResponse.redirect(new URL("/login?error=tenant", request.url));
  }

  const subscription = await fetchTenantSubscription(
    supabaseAdmin,
    userRow.tenant_id
  );

  if (pathname.startsWith("/dashboard")) {
    console.log("[middleware] subscription check", {
      userId: user.id,
      tenant_id: userRow.tenant_id,
      status: subscription?.status ?? "none",
    });

    if (!subscription) {
      return NextResponse.redirect(
        new URL("/pricing?reason=no_subscription", request.url)
      );
    }

    if (!["trial", "active"].includes(subscription.status)) {
      return NextResponse.redirect(
        new URL("/pricing?reason=inactive", request.url)
      );
    }

    if (subscription.status === "trial" && isTrialExpired(subscription)) {
      return NextResponse.redirect(
        new URL("/pricing?reason=trial_expired", request.url)
      );
    }
  }

  if (pathname.startsWith("/dashboard/admin")) {
    if (!["tenant_admin", "manager"].includes(userRow.role)) {
      return NextResponse.redirect(
        new URL("/dashboard?error=unauthorized", request.url)
      );
    }
  }

  if (pathname.startsWith("/dashboard/cashier")) {
    if (!["cashier", "staff"].includes(userRow.role)) {
      return NextResponse.redirect(
        new URL("/dashboard?error=unauthorized", request.url)
      );
    }
  }

  const response = NextResponse.next();
  response.headers.set("x-tenant-id", userRow.tenant_id);
  response.headers.set("x-user-role", userRow.role);
  response.headers.set(
    "x-subscription-status",
    subscription?.status ?? "none"
  );

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
