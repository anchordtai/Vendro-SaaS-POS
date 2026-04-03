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

export async function GET() {
  const requester = await getRequester();
  if (!requester) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!requireTenantAdmin(requester.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, tenant_id, outlet_id, email, name, role, phone, is_active, last_login, created_at, updated_at")
    .eq("tenant_id", requester.tenant_id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
  const requester = await getRequester();
  if (!requester) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!requireTenantAdmin(requester.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { name, email, password, role, phone, outlet_id } = body;

  if (!name || !email || !password || !role) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Step 1: Create auth user
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email: String(email).trim().toLowerCase(),
      password: String(password),
      email_confirm: true,
      user_metadata: {
        name,
        role,
        tenant_id: requester.tenant_id,
      },
    });

  if (authError || !authData?.user?.id) {
    return NextResponse.json(
      { error: `Failed to create user account: ${authError?.message || "unknown"}` },
      { status: 500 }
    );
  }

  const newUserId = authData.user.id;

  // Step 2: Create public.users row
  const { data: userRow, error: userErr } = await supabaseAdmin
    .from("users")
    .insert({
      id: newUserId,
      tenant_id: requester.tenant_id,
      outlet_id: outlet_id || null,
      email: String(email).trim().toLowerCase(),
      name,
      role,
      phone: phone || null,
      password_hash: "managed_by_supabase",
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id, tenant_id, outlet_id, email, name, role, phone, is_active, last_login, created_at, updated_at")
    .single();

  if (userErr) {
    // rollback auth user
    await supabaseAdmin.auth.admin.deleteUser(newUserId);
    return NextResponse.json({ error: userErr.message }, { status: 500 });
  }

  return NextResponse.json(userRow, { status: 201 });
}

