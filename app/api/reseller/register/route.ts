import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { panel_name, brand_color, description } = await req.json();

    // Get authenticated user
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    // Check if already a reseller
    const { data: existing } = await supabaseAdmin
      .from("smm_resellers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (existing) {
      return NextResponse.json({ error: "Ya tienes un Child Panel activo" }, { status: 400 });
    }

    // Create reseller account
    const { data: reseller, error: createError } = await supabaseAdmin
      .from("smm_resellers")
      .insert({
        user_id:      user.id,
        panel_name:   panel_name || "",
        brand_color:  brand_color || "#007ABF",
        description:  description || "",
        company_name: panel_name || "",
        is_active:    true,
        balance:      0,
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating reseller:", createError);
      return NextResponse.json({ error: "Error al crear el panel" }, { status: 500 });
    }

    return NextResponse.json({ reseller });
  } catch (err) {
    console.error("Register reseller error:", err);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
