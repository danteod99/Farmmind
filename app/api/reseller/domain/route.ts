/**
 * POST /api/reseller/domain
 * Automatically adds a custom domain to the Vercel project
 * and updates the reseller's domain in the DB.
 *
 * DELETE /api/reseller/domain
 * Removes a custom domain from the Vercel project.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID; // optional, for team accounts

async function getUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

async function getReseller(userId: string) {
  const { data } = await supabaseAdmin
    .from("smm_resellers")
    .select("id, custom_domain, slug")
    .eq("user_id", userId)
    .single();
  return data;
}

// ── POST: Add domain to Vercel + update DB ──
export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { domain } = await req.json();
  if (!domain || typeof domain !== "string") {
    return NextResponse.json({ error: "Dominio requerido" }, { status: 400 });
  }

  // Clean domain
  const cleanDomain = domain
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "")
    .replace(/^www\./, "");

  // Validate domain format strictly
  const domainRegex = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;
  if (!cleanDomain || !domainRegex.test(cleanDomain)) {
    return NextResponse.json({ error: "Dominio inválido" }, { status: 400 });
  }

  // Block reserved/dangerous domains
  const blockedDomains = ["trustmind.online", "vercel.app", "localhost", "example.com"];
  if (blockedDomains.some((d) => cleanDomain === d || cleanDomain.endsWith(`.${d}`))) {
    return NextResponse.json({ error: "Este dominio no está permitido" }, { status: 400 });
  }

  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
    return NextResponse.json({ error: "Vercel not configured" }, { status: 500 });
  }

  const reseller = await getReseller(user.id);
  if (!reseller) {
    return NextResponse.json({ error: "No eres reseller" }, { status: 403 });
  }

  try {
    // 1. Add domain to Vercel project
    const teamParam = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : "";
    const vercelRes = await fetch(
      `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains${teamParam}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: cleanDomain }),
      }
    );

    const vercelData = await vercelRes.json();

    if (!vercelRes.ok) {
      // Domain might already exist on this project (which is fine)
      if (vercelData.error?.code === "domain_already_in_use" ||
          vercelData.error?.code === "DOMAIN_ALREADY_EXISTS" ||
          (vercelData.error?.message || "").includes("already")) {
        // Already added, continue
      } else {
        console.error("[Vercel Domain API]", vercelData);
        return NextResponse.json({
          error: vercelData.error?.message || "Error al agregar dominio en Vercel",
          vercel_error: vercelData.error,
        }, { status: 400 });
      }
    }

    // 2. Update reseller's custom_domain in DB
    await supabaseAdmin
      .from("smm_resellers")
      .update({
        custom_domain: cleanDomain,
        domain_verified: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reseller.id);

    // 3. Check domain config from Vercel
    const configRes = await fetch(
      `https://api.vercel.com/v6/domains/${cleanDomain}/config${teamParam}`,
      {
        headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
      }
    );
    const configData = configRes.ok ? await configRes.json() : null;

    return NextResponse.json({
      success: true,
      domain: cleanDomain,
      verified: vercelData.verified ?? false,
      verification: vercelData.verification ?? null,
      config: configData,
    });
  } catch (err) {
    console.error("[Domain API Error]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// ── GET: Check domain DNS status ──
export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
    return NextResponse.json({ error: "Vercel not configured" }, { status: 500 });
  }

  const reseller = await getReseller(user.id);
  if (!reseller || !reseller.custom_domain) {
    return NextResponse.json({ error: "No domain configured" }, { status: 404 });
  }

  const domain = reseller.custom_domain;
  const teamParam = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : "";

  try {
    // Check domain config (DNS records)
    const configRes = await fetch(
      `https://api.vercel.com/v6/domains/${domain}/config${teamParam}`,
      {
        headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
      }
    );
    const configData = configRes.ok ? await configRes.json() : null;

    // Verify the domain on the project
    const verifyRes = await fetch(
      `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains/${domain}/verify${teamParam}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
      }
    );
    const verifyData = verifyRes.ok ? await verifyRes.json() : null;

    const isConfigured = configData?.misconfigured === false;

    // Update DB if verified
    if (isConfigured) {
      await supabaseAdmin
        .from("smm_resellers")
        .update({
          domain_verified: true,
          domain_verified_at: new Date().toISOString(),
        })
        .eq("id", reseller.id);
    }

    return NextResponse.json({
      domain,
      configured: isConfigured,
      misconfigured: configData?.misconfigured ?? true,
      config: configData,
      verification: verifyData,
    });
  } catch (err) {
    console.error("[Domain Check Error]", err);
    return NextResponse.json({ error: "Error checking domain" }, { status: 500 });
  }
}

// ── DELETE: Remove domain from Vercel ──
export async function DELETE(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
    return NextResponse.json({ error: "Vercel not configured" }, { status: 500 });
  }

  const reseller = await getReseller(user.id);
  if (!reseller || !reseller.custom_domain) {
    return NextResponse.json({ error: "No domain to remove" }, { status: 404 });
  }

  const domain = reseller.custom_domain;
  const teamParam = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : "";

  try {
    await fetch(
      `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains/${domain}${teamParam}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
      }
    );

    await supabaseAdmin
      .from("smm_resellers")
      .update({
        custom_domain: "",
        domain_verified: false,
        domain_verified_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reseller.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Domain Delete Error]", err);
    return NextResponse.json({ error: "Error removing domain" }, { status: 500 });
  }
}
