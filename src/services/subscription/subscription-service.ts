import type { SupabaseClient } from "@supabase/supabase-js";
import type { Subscription } from "@/types/saas";

/**
 * Latest subscription for a tenant (trial or active only).
 * Use maybeSingle() at call site to avoid PostgREST 406 when none match.
 */
export async function fetchTenantSubscription(
  admin: SupabaseClient,
  tenantId: string
): Promise<Subscription | null> {
  const { data, error } = await admin
    .from("subscriptions")
    .select("*, plan:plan_id(*)")
    .eq("tenant_id", tenantId)
    .in("status", ["trial", "active"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[subscription-service] fetchTenantSubscription", {
      tenantId,
      message: error.message,
      code: error.code,
    });
    return null;
  }
  return data as Subscription | null;
}

export function isTrialExpired(sub: Subscription | null): boolean {
  if (!sub || sub.status !== "trial") return false;
  if (!sub.trial_ends_at && !sub.current_period_end) return false;
  const end = new Date(sub.trial_ends_at || sub.current_period_end || "");
  return end.getTime() < Date.now();
}
