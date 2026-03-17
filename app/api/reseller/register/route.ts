import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;
const BASE_DOMAIN = "trustmind.online";

// Generate a URL-safe slug from panel name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 40);
}

// Auto-provision subdomain on Vercel
async function provisionSubdomain(subdomain: string): Promise<boolean> {
  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) return false;
  const domain = `${subdomain}.${BASE_DOMAIN}`;
  const teamParam = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : "";
  try {
    const res = await fetch(
      `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains${teamParam}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: domain }),
      }
    );
    const data = await res.json();
    // OK if added or already exists
    return res.ok || (data.error?.message || "").includes("already");
  } catch (e) {
    console.error("[Vercel subdomain]", e);
    return false;
  }
}

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

    // Generate unique slug
    let slug = generateSlug(panel_name || "panel");
    // Check if slug already taken, append random suffix if so
    const { data: slugTaken } = await supabaseAdmin
      .from("smm_resellers")
      .select("id")
      .eq("slug", slug)
      .single();
    if (slugTaken) {
      slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
    }

    // Free subdomain: slug.trustmind.online
    const freeSubdomain = `${slug}.${BASE_DOMAIN}`;

    // Create reseller account with slug and free subdomain
    const { data: reseller, error: createError } = await supabaseAdmin
      .from("smm_resellers")
      .insert({
        user_id:        user.id,
        panel_name:     panel_name || "",
        brand_color:    brand_color || "#007ABF",
        description:    description || "",
        company_name:   panel_name || "",
        slug:           slug,
        custom_domain:  freeSubdomain,
        is_active:      true,
        balance:        0,
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating reseller:", createError);
      return NextResponse.json({ error: "Error al crear el panel" }, { status: 500 });
    }

    // Auto-provision the free subdomain on Vercel (non-blocking)
    provisionSubdomain(slug).then((ok) => {
      if (ok) {
        // Mark as verified since it's our own subdomain
        supabaseAdmin
          .from("smm_resellers")
          .update({ domain_verified: true, domain_verified_at: new Date().toISOString() })
          .eq("id", reseller.id)
          .then(() => {});
      }
    });

    return NextResponse.json({ reseller });
  } catch (err) {
    console.error("Register reseller error:", err);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
