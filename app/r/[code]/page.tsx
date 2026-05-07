import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import LandingClient from "./LandingClient";

export const dynamic = "force-dynamic";

interface SponsorData {
  display_name: string;
  email: string;
  is_founder: boolean;
}

async function getSponsorData(code: string): Promise<SponsorData | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: refRow } = await admin
    .from("network_referral_codes")
    .select("user_id")
    .eq("code", code)
    .maybeSingle();

  if (!refRow?.user_id) return null;

  const { data: pos } = await admin
    .from("network_positions")
    .select("display_name, is_founder")
    .eq("user_id", refRow.user_id)
    .maybeSingle();

  const { data: u } = await admin.auth.admin.getUserById(refRow.user_id);

  return {
    display_name: pos?.display_name || u.user?.user_metadata?.full_name || u.user?.email?.split("@")[0] || "Tu sponsor",
    email: u.user?.email || "",
    is_founder: pos?.is_founder === true,
  };
}

export default async function ReferralLandingPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const cleanCode = (code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);

  if (!cleanCode) {
    redirect("/");
  }

  // Setear cookie 'ref' (sobrevive al OAuth roundtrip)
  const cookieStore = await cookies();
  cookieStore.set("ref", cleanCode, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 dias
    sameSite: "lax",
    secure: true,
    httpOnly: false,
  });

  const sponsor = await getSponsorData(cleanCode);

  // Si el codigo no existe, mostramos la landing igual pero sin sponsor
  return <LandingClient code={cleanCode} sponsor={sponsor} />;
}
