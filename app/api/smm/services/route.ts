import { getServices } from "@/app/lib/jap";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// ━━━ Plataformas relevantes para Latinoamérica / habla hispana ━━━
// Solo se muestran servicios cuya categoría o nombre contenga alguno de estos términos
const ALLOWED_PLATFORMS = [
  "instagram", "tiktok", "youtube", "facebook", "twitter", " x ",
  "telegram", "whatsapp", "twitch", "kick", "discord", "pinterest",
  "linkedin", "snapchat", "threads", "reddit", "spotify", "soundcloud",
  "apple music", "deezer", "shazam", "google", "web traffic", "website",
  "seo", "traffic", "reviews", "rating", "appstore", "play store",
  "google play", "app store", "clubhouse", "rumble", "tumblr",
  "daily motion", "dailymotion", "vimeo", "triller", "onlyfans",
  "twitch", "mixer", "amazon", "netflix",
];

// Plataformas que NO son de uso común en habla hispana (bloquear)
const BLOCKED_PLATFORMS = [
  "vk", "vkontakte", "ok.ru", "odnoklassniki",
  "weibo", "wechat", "douyin", "kuaishou", "xiaohongshu", "bilibili",
  "baidu", "qq ", "qqgroup", "qq group", "xhs",
  "sharechat", "moj ", "josh ", "roposo", "koo ",
  "zalo", "line ", "kakaotalk", "kakao",
  "mixi", "naver", "picsart",
  "imo ", "viber",
];

function isAllowed(category: string, name: string): boolean {
  const text = (category + " " + name).toLowerCase();
  // Block first
  if (BLOCKED_PLATFORMS.some((b) => text.includes(b))) return false;
  // Then allow if any allowed platform is present
  return ALLOWED_PLATFORMS.some((p) => text.includes(p));
}

export async function GET() {
  try {
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
    if (!user) return Response.json({ error: "No autenticado" }, { status: 401 });

    // Markup sobre precio de JAP: 200% de ganancia = precio × 3
    const MARKUP_MULTIPLIER = 3.0;

    const rawServices = await getServices();
    const services = rawServices
      .filter((s) => isAllowed(s.category, s.name))
      .map((s) => ({
        ...s,
        rate: (parseFloat(s.rate) * MARKUP_MULTIPLIER).toFixed(2),
      }));

    return Response.json({ services });
  } catch (error) {
    console.error("SMM services error:", error);
    return Response.json({ error: "Error obteniendo servicios" }, { status: 500 });
  }
}
