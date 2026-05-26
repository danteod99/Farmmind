import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { isAdmin } from "@/app/lib/admin";

/**
 * Auditoría black-box de RLS:
 * Intenta SELECT en cada tabla crítica usando la anon key (sin sesión).
 * Si devuelve filas → la tabla NO tiene RLS bien configurada y es vulnerable.
 * Si devuelve [] o error → la tabla está protegida.
 */

const CRITICAL_TABLES = [
  // Money / billing
  "smm_balances",
  "smm_orders",
  "smm_transactions",
  "smm_autorecharge",
  "payment_attempts",
  "promo_codes",
  "promo_code_uses",
  // Identity / roles
  "profiles",
  "user_attribution",
  // Resellers (api_keys aqui)
  "smm_resellers",
  "smm_reseller_prices",
  // Network MLM
  "network_positions",
  "network_pending_placements",
  // Courses (paywall)
  "courses",
  "course_modules",
  "course_lessons",
  "course_progress",
  // Chat
  "conversations",
  "messages",
  // Desktop apps
  "tm_devices",
  "tm_subscriptions",
];

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Cliente anonimo (simulando atacante con la key publica)
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  type Result = {
    table: string;
    status: "VULNERABLE" | "PROTECTED" | "NOT_FOUND" | "ERROR";
    rowsReturned: number;
    sampleColumns: string[];
    errorCode: string | null;
    risk: string;
  };

  const results: Result[] = await Promise.all(
    CRITICAL_TABLES.map(async (table): Promise<Result> => {
      try {
        const { data, error } = await anonClient.from(table).select("*").limit(3);

        if (error) {
          // Codigo PGRST301 = unauthorized via RLS (bueno)
          // Codigo 42P01 = table not found
          if (error.code === "PGRST301" || /permission denied|rls/i.test(error.message)) {
            return {
              table,
              status: "PROTECTED",
              rowsReturned: 0,
              sampleColumns: [],
              errorCode: error.code,
              risk: "✅ Bloqueado por RLS",
            };
          }
          if (error.code === "42P01" || /does not exist/i.test(error.message)) {
            return {
              table,
              status: "NOT_FOUND",
              rowsReturned: 0,
              sampleColumns: [],
              errorCode: error.code,
              risk: "⚪ Tabla no existe",
            };
          }
          return {
            table,
            status: "ERROR",
            rowsReturned: 0,
            sampleColumns: [],
            errorCode: error.code,
            risk: `❓ Error: ${error.message.slice(0, 80)}`,
          };
        }

        if (data && data.length > 0) {
          const cols = Object.keys(data[0]);
          // Detectar columnas sensibles
          const sensitive = cols.filter((c) =>
            /api_key|secret|password|token|stripe|webhook/i.test(c)
          );
          return {
            table,
            status: "VULNERABLE",
            rowsReturned: data.length,
            sampleColumns: cols.slice(0, 10),
            errorCode: null,
            risk: sensitive.length > 0
              ? `🚨 CRÍTICO: leyó ${data.length} filas con columnas sensibles: ${sensitive.join(", ")}`
              : `🚨 VULNERABLE: leyó ${data.length} filas`,
          };
        }

        // Empty array → table exists but RLS or no data
        return {
          table,
          status: "PROTECTED",
          rowsReturned: 0,
          sampleColumns: [],
          errorCode: null,
          risk: "✅ Sin acceso o vacía",
        };
      } catch (e) {
        return {
          table,
          status: "ERROR",
          rowsReturned: 0,
          sampleColumns: [],
          errorCode: null,
          risk: `❓ Exception: ${(e as Error).message.slice(0, 80)}`,
        };
      }
    })
  );

  const summary = {
    total: results.length,
    vulnerable: results.filter((r) => r.status === "VULNERABLE").length,
    protected: results.filter((r) => r.status === "PROTECTED").length,
    not_found: results.filter((r) => r.status === "NOT_FOUND").length,
    errors: results.filter((r) => r.status === "ERROR").length,
  };

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    description:
      "Auditoría black-box: simula a un atacante usando NEXT_PUBLIC_SUPABASE_ANON_KEY sin sesión. Tablas marcadas VULNERABLE permiten lectura sin autenticación.",
    summary,
    results: results.sort((a, b) => {
      const order = { VULNERABLE: 0, ERROR: 1, NOT_FOUND: 2, PROTECTED: 3 };
      return order[a.status] - order[b.status];
    }),
  });
}
