import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";

async function getRequester() {
  const raw = cookies().get("vendro_session")?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const userId = parsed?.user?.id as string | undefined;
    if (!userId) return null;
    const { data: requester } = await supabaseAdmin
      .from("users")
      .select("id, tenant_id, role, is_active")
      .eq("id", userId)
      .maybeSingle();
    if (!requester?.is_active) return null;
    return requester;
  } catch {
    return null;
  }
}

function requireTenantAdmin(role: string) {
  return role === "tenant_admin" || role === "manager";
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requester = await getRequester();
  if (!requester) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!requireTenantAdmin(requester.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const targetId = params.id;
  const body = await request.json();
  const allowed = {
    name: body.name,
    email: body.email,
    role: body.role,
    phone: body.phone,
    outlet_id: body.outlet_id,
    is_active: body.is_active,
  } as Record<string, any>;

  // Ensure user is within same tenant
  const { data: target } = await supabaseAdmin
    .from("users")
    .select("id, tenant_id")
    .eq("id", targetId)
    .maybeSingle();
  if (!target || target.tenant_id !== requester.tenant_id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .update({ ...allowed, updated_at: new Date().toISOString() })
    .eq("id", targetId)
    .select("id, tenant_id, outlet_id, email, name, role, phone, is_active, last_login, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requester = await getRequester();
  if (!requester) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!requireTenantAdmin(requester.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const targetId = params.id;
  if (targetId === requester.id) {
    return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
  }

  const { data: target } = await supabaseAdmin
    .from("users")
    .select("id, tenant_id")
    .eq("id", targetId)
    .maybeSingle();
  if (!target || target.tenant_id !== requester.tenant_id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { error: dbErr } = await supabaseAdmin.from("users").delete().eq("id", targetId);
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  // Also delete auth user (best-effort)
  try {
    await supabaseAdmin.auth.admin.deleteUser(targetId);
  } catch (e) {
    console.error("[api/tenant/users] auth delete failed", e);
  }

  return NextResponse.json({ success: true });
}

