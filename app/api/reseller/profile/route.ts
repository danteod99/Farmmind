import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET — fetch reseller profile
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: reseller, error } = await supabaseAdmin
    .from("smm_resellers")
    .select("id, api_key, company_name, panel_name, logo_url, brand_color, description, custom_domain, balance, is_active")
    .eq("user_id", user.id)
    .single();

  if (error) return NextResponse.json({ reseller: null });
  return NextResponse.json({ reseller });
}

// PATCH — update reseller branding/settings
export async function PATCH(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const allowedFields = ["panel_name", "logo_url", "brand_color", "description", "custom_domain", "company_name"];
  const updates: Record<string, string> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) updates[field] = body[field];
  }

  const { data: reseller, error } = await supabaseAdmin
    .from("smm_resellers")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  return NextResponse.json({ reseller });
}
