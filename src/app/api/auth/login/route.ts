import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { ensurePublicUserRecord } from "@/services/auth/onboarding";
import { fetchTenantSubscription, isTrialExpired } from "@/services/subscription/subscription-service";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    console.log("[login] attempt", { email: email?.replace(/@.*/, "@***") });

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.signInWithPassword({
        email,
        password,
      });

    if (authError || !authData?.user) {
      console.warn("[login] auth failed", authError?.message);
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const authUserId = authData.user.id;

    let { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("*, tenant:tenant_id(*)")
      .eq("id", authUserId)
      .maybeSingle();

    if (userError) {
      console.error("[login] users lookup", {
        userId: authUserId,
        message: userError.message,
      });
    }

    if (!userData) {
      console.log("[login] self-heal start", { userId: authUserId });
      const healed = await ensurePublicUserRecord(supabaseAdmin, authUserId);
      if (!healed.ok) {
        console.error("[login] self-heal failed", healed.error);
        return NextResponse.json(
          { error: "Account setup failed. Please contact support." },
          { status: 500 }
        );
      }
      const retry = await supabaseAdmin
        .from("users")
        .select("*, tenant:tenant_id(*)")
        .eq("id", authUserId)
        .maybeSingle();
      userData = retry.data;
      if (!userData) {
        return NextResponse.json(
          { error: "Account setup incomplete. Please try again." },
          { status: 500 }
        );
      }
      console.log("[login] self-heal ok", {
        userId: authUserId,
        tenant_id: userData.tenant_id,
      });
    }

    if (!userData.is_active) {
      return NextResponse.json({ error: "Account is inactive" }, { status: 403 });
    }

    const { data: tenantData, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .select("id, business_name, business_type, business_size")
      .eq("id", userData.tenant_id)
      .maybeSingle();

    if (tenantError || !tenantData) {
      console.error("[login] tenant missing", {
        tenant_id: userData.tenant_id,
        message: tenantError?.message,
      });
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    let subscription = null as Awaited<
      ReturnType<typeof fetchTenantSubscription>
    >;
    let subscriptionStatus = "none";
    let redirectTo: string | null = null;

    if (userData.role === "super_admin") {
      subscriptionStatus = "super_admin";
    } else {
      subscription = await fetchTenantSubscription(
        supabaseAdmin,
        userData.tenant_id
      );
      if (!subscription) {
        subscriptionStatus = "no_subscription";
        redirectTo = `/pricing?tenant_id=${userData.tenant_id}&reason=no_subscription`;
      } else if (subscription.status === "trial" && isTrialExpired(subscription)) {
        subscriptionStatus = "trial_expired";
        redirectTo = `/pricing?reason=trial_expired&tenant_id=${userData.tenant_id}`;
      } else {
        subscriptionStatus = subscription.status;
      }
    }

    try {
      await supabaseAdmin
        .from("users")
        .update({ last_login: new Date().toISOString() })
        .eq("id", authUserId);
    } catch {
      /* non-fatal */
    }

    const body = {
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        tenant_id: userData.tenant_id,
        is_active: userData.is_active,
        last_login: userData.last_login,
      },
      tenant: tenantData,
      subscription,
      session: authData.session,
      subscriptionStatus,
      redirectTo,
    };

    console.log("[login] success", {
      userId: userData.id,
      tenant_id: userData.tenant_id,
      role: userData.role,
      subscriptionStatus,
    });

    const responseData = NextResponse.json(body);

    if (authData.session) {
      responseData.cookies.set(
        "vendro_session",
        JSON.stringify({
          user: body.user,
          tenant: tenantData,
          subscription,
          session: {
            access_token: authData.session.access_token,
            refresh_token: authData.session.refresh_token,
            expires_at: authData.session.expires_at,
          },
        }),
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7,
        }
      );
    }

    return responseData;
  } catch (error: unknown) {
    console.error("[login] fatal", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
