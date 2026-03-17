/**
 * POST /api/panel/[slug]/auth/register
 * Links a user to a reseller as a client.
 * Called after Google OAuth or email signup.
 */

import { createClient } from "@supabase/supabase-js";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = await req.json();
  const { user_id, email, name, auth_method } = body;

  if (!user_id || !slug) {
    return Response.json({ error: "Missing user_id or slug" }, { status: 400 });
  }

  const admin = getAdmin();

  // Find the reseller by slug
  const { data: reseller } = await admin
    .from("smm_resellers")
    .select("id")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!reseller) {
    return Response.json({ error: "Panel not found" }, { status: 404 });
  }

  // Check if client record already exists
  const { data: existing } = await admin
    .from("smm_reseller_clients")
    .select("id")
    .eq("reseller_id", reseller.id)
    .eq("user_id", user_id)
    .single();

  if (existing) {
    // Update last_login
    await admin
      .from("smm_reseller_clients")
      .update({ last_login: new Date().toISOString() })
      .eq("id", existing.id);

    return Response.json({ success: true, existing: true });
  }

  // Create new client record
  const { error: insertError } = await admin
    .from("smm_reseller_clients")
    .insert({
      reseller_id: reseller.id,
      user_id,
      email: email || "",
      auth_method: auth_method || "email",
      balance: 0,
      last_login: new Date().toISOString(),
    });

  if (insertError) {
    console.error("[Panel Auth]", insertError);
    return Response.json({ error: "Failed to create client" }, { status: 500 });
  }

  // Ensure user has a balance record
  const { data: balanceExists } = await admin
    .from("smm_balances")
    .select("id")
    .eq("user_id", user_id)
    .single();

  if (!balanceExists) {
    await admin.from("smm_balances").insert({
      user_id,
      balance: 0,
    });
  }

  // Mark user as panel_client — but only if they're NOT already a reseller
  const { data: isReseller } = await admin
    .from("smm_resellers")
    .select("id")
    .eq("user_id", user_id)
    .single();

  if (!isReseller) {
    await admin.auth.admin.updateUserById(user_id, {
      user_metadata: {
        role: "panel_client",
        panel_slug: slug,
        reseller_id: reseller.id,
      },
    });
  }

  return Response.json({ success: true, existing: false });
}
