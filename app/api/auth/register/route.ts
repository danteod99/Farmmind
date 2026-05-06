import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: Request) {
  try {
    const { email, password, ref } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email y contraseña son requeridos" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
    }

    const sb = getSupabaseAdmin();

    // Create user with admin API — auto-confirms email
    const { data, error } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      if (error.message.includes("already been registered") || error.message.includes("already exists")) {
        return NextResponse.json({ error: "Este correo ya tiene una cuenta. Intenta iniciar sesión." }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const userId = data.user?.id;

    // Si vino con codigo de referido, crear pending placement
    if (userId && ref) {
      const cleanRef = String(ref).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
      if (cleanRef) {
        const { data: refRow } = await sb
          .from("network_referral_codes")
          .select("user_id")
          .eq("code", cleanRef)
          .maybeSingle();

        if (refRow?.user_id && refRow.user_id !== userId) {
          await sb.from("network_pending_placements").insert({
            user_id: userId,
            sponsor_id: refRow.user_id,
            status: "pending",
          });
        }
      }
    }

    return NextResponse.json({ success: true, user_id: userId });
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
