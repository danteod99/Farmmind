/**
 * Admin API — Reseller Management
 *
 * GET  /api/admin/resellers         → list all resellers
 * POST /api/admin/resellers         → create reseller (body: { email, company_name })
 * PATCH /api/admin/resellers        → update reseller (body: { id, is_active?, company_name?, custom_domain?, add_balance? })
 */

import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isAdmin } from "@/app/lib/admin";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function verifyAdmin() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setAll(cookiesToSet: any[]) {
          cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options: unknown }) =>
            cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
          );
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) return null;
  return user;
}

// ── GET: list all resellers ───────────────────────────────────────────────────

export async function GET() {
  const admin = await verifyAdmin();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const db = getSupabaseAdmin();

  // Get resellers + join with auth.users via user_id to get email
  const { data: resellers, error } = await db
    .from("smm_resellers")
    .select("id, user_id, api_key, company_name, custom_domain, balance, is_active, created_at")
    .order("created_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Fetch user emails from auth.users
  const userIds = (resellers ?? []).map((r) => r.user_id);
  const emailMap: Record<string, string> = {};

  if (userIds.length > 0) {
    const { data: { users } } = await db.auth.admin.listUsers();
    users.forEach((u) => { emailMap[u.id] = u.email ?? ""; });
  }

  const result = (resellers ?? []).map((r) => ({
    ...r,
    email: emailMap[r.user_id] ?? "",
  }));

  return Response.json(result);
}

// ── POST: create reseller ─────────────────────────────────────────────────────

export async function POST(req: Request) {
  const admin = await verifyAdmin();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { email, company_name = "" } = await req.json();
  if (!email) return Response.json({ error: "email required" }, { status: 400 });

  const db = getSupabaseAdmin();

  // Find user by email
  const { data: { users } } = await db.auth.admin.listUsers();
  const user = users.find((u) => u.email === email);
  if (!user) return Response.json({ error: `No user found with email: ${email}` }, { status: 404 });

  // Check not already a reseller
  const { data: existing } = await db
    .from("smm_resellers")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (existing) return Response.json({ error: "User is already a reseller" }, { status: 409 });

  // Create reseller account
  const { data: newReseller, error: insertError } = await db
    .from("smm_resellers")
    .insert({ user_id: user.id, company_name })
    .select()
    .single();

  if (insertError) return Response.json({ error: insertError.message }, { status: 500 });

  return Response.json({ success: true, reseller: newReseller });
}

// ── PATCH: update reseller ────────────────────────────────────────────────────

export async function PATCH(req: Request) {
  const admin = await verifyAdmin();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, is_active, company_name, custom_domain, add_balance } = body;

  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  const db = getSupabaseAdmin();
  const updates: Record<string, unknown> = {};

  if (is_active !== undefined) updates.is_active = is_active;
  if (company_name !== undefined) updates.company_name = company_name;
  if (custom_domain !== undefined) updates.custom_domain = custom_domain;

  if (add_balance !== undefined && add_balance > 0) {
    // Get current balance and add
    const { data: current } = await db
      .from("smm_resellers")
      .select("balance")
      .eq("id", id)
      .single();
    updates.balance = (parseFloat(current?.balance ?? 0) + parseFloat(add_balance)).toFixed(6);
  }

  const { data, error } = await db
    .from("smm_resellers")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ success: true, reseller: data });
}
