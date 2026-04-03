import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { provisionTenantSignup } from "@/services/auth/onboarding";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email,
      password,
      name,
      business_name,
      business_type,
      business_size,
      business_email,
    } = body;

    const tenantEmail = (business_email || email || "").toLowerCase().trim();
    const authEmail = (email || "").toLowerCase().trim();

    console.log("[signup] attempt", { authEmail, business: business_name });

    if (
      !authEmail ||
      !password ||
      !name ||
      !business_name ||
      !business_type ||
      !business_size
    ) {
      return NextResponse.json(
        {
          error:
            "All fields are required: email, password, name, business_name, business_type, business_size",
        },
        { status: 400 }
      );
    }

    const validBusinessTypes = [
      "pharmacy",
      "hotel_bar",
      "nightclub",
      "grocery",
      "retail",
    ];
    const validBusinessSizes = ["small", "medium", "large"];

    if (!validBusinessTypes.includes(business_type)) {
      return NextResponse.json(
        {
          error:
            "Invalid business type. Must be one of: " +
            validBusinessTypes.join(", "),
        },
        { status: 400 }
      );
    }

    if (!validBusinessSizes.includes(business_size)) {
      return NextResponse.json(
        {
          error:
            "Invalid business size. Must be one of: " +
            validBusinessSizes.join(", "),
        },
        { status: 400 }
      );
    }

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: authEmail,
        password,
        email_confirm: true,
        user_metadata: {
          name,
          tenant_id: "pending",
          role: "tenant_admin",
          business_name,
          business_type,
          business_size,
        },
      });

    if (authError) {
      console.error("[signup] auth failed", authError.message);
      if (authError.message.includes("already registered")) {
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "Failed to create account: " + authError.message },
        { status: 500 }
      );
    }

    if (!authData?.user?.id) {
      return NextResponse.json(
        { error: "Failed to create user account" },
        { status: 500 }
      );
    }

    const authUserId = authData.user.id;

    try {
      const provisioned = await provisionTenantSignup(supabaseAdmin, {
        authUserId,
        name,
        tenantEmail,
        authEmail,
        business_name,
        business_type,
        business_size,
      });

      console.log("[signup] provisioned", {
        userId: authUserId,
        tenantId: provisioned.tenantId,
        subscriptionId: provisioned.subscriptionId,
      });

      const { data: sessionData, error: sessionError } =
        await supabaseAdmin.auth.signInWithPassword({
          email: authEmail,
          password,
        });

      if (sessionError) {
        console.warn("[signup] session not created", sessionError.message);
      }

      const { data: finalUser } = await supabaseAdmin
        .from("users")
        .select("*, tenant:tenant_id(*)")
        .eq("id", authUserId)
        .maybeSingle();

      const { data: tenantRow } = await supabaseAdmin
        .from("tenants")
        .select("*")
        .eq("id", provisioned.tenantId)
        .single();

      const { data: subRow } = await supabaseAdmin
        .from("subscriptions")
        .select("*, plan:plan_id(*)")
        .eq("id", provisioned.subscriptionId)
        .single();

      const payload = {
        success: true,
        message: "Account created successfully!",
        user: finalUser
          ? {
              id: finalUser.id,
              email: finalUser.email,
              name: finalUser.name,
              role: finalUser.role,
              tenant_id: finalUser.tenant_id,
              is_active: finalUser.is_active,
            }
          : {
              id: authUserId,
              email: authEmail,
              name,
              role: "tenant_admin",
              tenant_id: provisioned.tenantId,
              is_active: true,
            },
        tenant: tenantRow,
        subscription: subRow,
        session: sessionData?.session ?? null,
        redirectTo: "/dashboard",
      };

      const res = NextResponse.json(payload);

      if (sessionData?.session) {
        res.cookies.set(
          "vendro_session",
          JSON.stringify({
            user: payload.user,
            tenant: tenantRow,
            subscription: subRow,
            session: {
              access_token: sessionData.session.access_token,
              refresh_token: sessionData.session.refresh_token,
              expires_at: sessionData.session.expires_at,
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

      return res;
    } catch (provisionErr: unknown) {
      const msg =
        provisionErr instanceof Error ? provisionErr.message : "Provision failed";
      console.error("[signup] provision rollback", { authUserId, msg });
      await supabaseAdmin.auth.admin.deleteUser(authUserId);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  } catch (error: unknown) {
    console.error("[signup] fatal", error);
    return NextResponse.json(
      { error: "Internal server error during signup" },
      { status: 500 }
    );
  }
}
