import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import { ensurePublicUserRecord } from "@/services/auth/onboarding";

export async function GET(_request: NextRequest) {
  try {
    const cookieStore = cookies();
    const raw = cookieStore.get("vendro_session")?.value;

    if (!raw) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let userId: string | undefined;
    try {
      const parsed = JSON.parse(raw);
      userId = parsed?.user?.id;
    } catch {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select(
        "id, email, name, role, tenant_id, is_active, last_login, outlet_id"
      )
      .eq("id", userId)
      .maybeSingle();

    if (userError) {
      console.error("[api/auth/user] lookup", userError.message);
      return NextResponse.json({ error: "User lookup failed" }, { status: 500 });
    }

    if (!userData) {
      console.log("[api/auth/user] self-heal", { userId });
      const healed = await ensurePublicUserRecord(supabaseAdmin, userId);
      if (!healed.ok) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      const retry = await supabaseAdmin
        .from("users")
        .select(
          "id, email, name, role, tenant_id, is_active, last_login, outlet_id"
        )
        .eq("id", userId)
        .maybeSingle();
      userData = retry.data;
    }

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(userData);
  } catch (error) {
    console.error("[api/auth/user]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
