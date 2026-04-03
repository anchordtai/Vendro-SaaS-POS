import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserRole } from "@/types/saas";
import { PLATFORM_TENANT_ID, TRIAL_DAYS } from "./constants";

export interface ProvisionSignupParams {
  authUserId: string;
  name: string;
  /** Stored on tenants.email (business contact) */
  tenantEmail: string;
  /** Stored on public.users.email (must match auth login email) */
  authEmail: string;
  business_name: string;
  business_type: string;
  business_size: string;
}

async function getOrCreateStarterPlan(admin: SupabaseClient): Promise<string> {
  const { data: plan, error: findErr } = await admin
    .from("plans")
    .select("id")
    .eq("tier", "starter")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!findErr && plan?.id) {
    return plan.id;
  }

  const { data: created, error: insertErr } = await admin
    .from("plans")
    .insert({
      name: "Starter Plan",
      tier: "starter",
      monthly_price: 0,
      yearly_price: 0,
      max_products: 100,
      max_outlets: 1,
      max_users: 3,
      features: ["POS", "Inventory", "Basic Reports"],
      is_active: true,
    })
    .select("id")
    .single();

  if (insertErr || !created?.id) {
    throw new Error(
      `Starter plan missing and could not be created: ${insertErr?.message ?? "unknown"}`
    );
  }
  return created.id;
}

function trialEndIso(): string {
  return new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Full tenant onboarding after Auth user exists. Caller must delete auth user on failure if rolling back.
 */
export async function provisionTenantSignup(
  admin: SupabaseClient,
  params: ProvisionSignupParams
): Promise<{
  tenantId: string;
  outletId: string | null;
  subscriptionId: string;
  userRowId: string;
}> {
  const {
    authUserId,
    name,
    tenantEmail,
    authEmail,
    business_name,
    business_type,
    business_size,
  } = params;

  const planId = await getOrCreateStarterPlan(admin);
  const trialEnd = trialEndIso();
  const now = new Date().toISOString();

  const { data: tenant, error: tenantErr } = await admin
    .from("tenants")
    .insert({
      business_name,
      business_type,
      business_size,
      email: tenantEmail.toLowerCase(),
      created_at: now,
    })
    .select("id")
    .single();

  if (tenantErr || !tenant?.id) {
    throw new Error(`Tenant creation failed: ${tenantErr?.message ?? "unknown"}`);
  }

  const tenantId = tenant.id as string;

  let outletId: string | null = null;
  const { data: outlet, error: outletErr } = await admin
    .from("outlets")
    .insert({
      tenant_id: tenantId,
      name: "Main Outlet",
      is_active: true,
      settings: {},
    })
    .select("id")
    .single();

  if (outletErr) {
    console.error("[onboarding] default outlet failed (non-fatal)", {
      tenantId,
      message: outletErr.message,
    });
  } else {
    outletId = outlet?.id ?? null;
  }

  const { data: subscription, error: subErr } = await admin
    .from("subscriptions")
    .insert({
      tenant_id: tenantId,
      plan_id: planId,
      status: "trial",
      billing_cycle: "monthly",
      trial_ends_at: trialEnd,
      current_period_start: now,
      current_period_end: trialEnd,
      created_at: now,
    })
    .select("id")
    .single();

  if (subErr || !subscription?.id) {
    await admin.from("outlets").delete().eq("tenant_id", tenantId);
    await admin.from("tenants").delete().eq("id", tenantId);
    throw new Error(`Subscription creation failed: ${subErr?.message ?? "unknown"}`);
  }

  const { data: userRow, error: userErr } = await admin
    .from("users")
    .insert({
      id: authUserId,
      tenant_id: tenantId,
      outlet_id: outletId,
      email: authEmail.toLowerCase(),
      name,
      role: "tenant_admin" as UserRole,
      password_hash: "managed_by_supabase",
      is_active: true,
      created_at: now,
    })
    .select("id")
    .single();

  if (userErr || !userRow?.id) {
    await admin.from("subscriptions").delete().eq("tenant_id", tenantId);
    await admin.from("outlets").delete().eq("tenant_id", tenantId);
    await admin.from("tenants").delete().eq("id", tenantId);
    throw new Error(`User record creation failed: ${userErr?.message ?? "unknown"}`);
  }

  await admin.auth.admin.updateUserById(authUserId, {
    user_metadata: {
      name,
      tenant_id: tenantId,
      role: "tenant_admin",
      business_name,
    },
  });

  return {
    tenantId,
    outletId,
    subscriptionId: subscription.id as string,
    userRowId: userRow.id as string,
  };
}

/**
 * Self-healing: create tenant + outlet + subscription + public.users for an auth user with no profile.
 */
export async function ensurePublicUserRecord(
  admin: SupabaseClient,
  authUserId: string
): Promise<{ ok: true; tenant_id: string; role: UserRole } | { ok: false; error: string }> {
  const { data: existing, error: existingErr } = await admin
    .from("users")
    .select("id, tenant_id, role")
    .eq("id", authUserId)
    .maybeSingle();

  if (existingErr) {
    console.error("[onboarding] ensurePublicUserRecord lookup", {
      authUserId,
      message: existingErr.message,
    });
    return { ok: false, error: existingErr.message };
  }

  if (existing?.tenant_id) {
    return {
      ok: true,
      tenant_id: existing.tenant_id,
      role: existing.role as UserRole,
    };
  }

  const { data: authUser, error: authErr } =
    await admin.auth.admin.getUserById(authUserId);

  if (authErr || !authUser?.user) {
    console.error("[onboarding] ensurePublicUserRecord no auth user", {
      authUserId,
      message: authErr?.message,
    });
    return { ok: false, error: "Auth user not found" };
  }

  const email = authUser.user.email?.toLowerCase() ?? "";
  const meta = authUser.user.user_metadata || {};
  const name =
    (meta.name as string) ||
    email.split("@")[0] ||
    "User";
  const business_name =
    (meta.business_name as string) || `${name}'s Business`;
  const business_type = (meta.business_type as string) || "retail";
  const business_size = (meta.business_size as string) || "small";
  const metaRole = meta.role as string | undefined;

  if (metaRole === "super_admin") {
    const { data: plat } = await admin
      .from("tenants")
      .select("id")
      .eq("id", PLATFORM_TENANT_ID)
      .maybeSingle();

    if (!plat?.id) {
      const { error: platErr } = await admin.from("tenants").insert({
        id: PLATFORM_TENANT_ID,
        business_name: "Vendro Platform",
        business_type: "retail",
        business_size: "large",
        email: "platform@vendro.internal",
      });
      if (platErr) {
        console.error("[onboarding] platform tenant insert", platErr.message);
      }
    }

    const { error: userIns } = await admin.from("users").insert({
      id: authUserId,
      tenant_id: PLATFORM_TENANT_ID,
      email,
      name,
      role: "super_admin" as UserRole,
      password_hash: "managed_by_supabase",
      is_active: true,
    });

    if (userIns) {
      return { ok: false, error: userIns.message };
    }

    console.log("[onboarding] self-heal super_admin", { userId: authUserId });
    return { ok: true, tenant_id: PLATFORM_TENANT_ID, role: "super_admin" };
  }

  try {
    const result = await provisionTenantSignup(admin, {
      authUserId,
      name,
      tenantEmail: email,
      authEmail: email,
      business_name,
      business_type,
      business_size,
    });
    console.log("[onboarding] self-heal tenant user", {
      userId: authUserId,
      tenantId: result.tenantId,
    });
    return { ok: true, tenant_id: result.tenantId, role: "tenant_admin" };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "provision failed";
    console.error("[onboarding] ensurePublicUserRecord provision", {
      authUserId,
      msg,
    });
    return { ok: false, error: msg };
  }
}
