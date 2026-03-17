/**
 * GET /api/panel/[slug]/balance
 * Returns the authenticated user's balance.
 */

import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const user = await getUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const admin = getAdmin();

  const { data: balance } = await admin
    .from("smm_balances")
    .select("balance")
    .eq("user_id", user.id)
    .single();

  return Response.json({
    balance: parseFloat(balance?.balance ?? 0),
  });
}
