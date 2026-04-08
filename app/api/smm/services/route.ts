import { getServices } from "@/app/lib/jap";
import { getBFServices } from "@/app/lib/bulkfollows";
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

// Plataformas/regiones bloqueadas
const BLOCKED_PLATFORMS = [
  // Rusia/CIS
  "vk", "vkontakte", "ok.ru", "odnoklassniki", "rutube", "yandex",
  // China
  "weibo", "wechat", "douyin", "kuaishou", "xiaohongshu", "bilibili", "baidu", "qq ", "qqgroup", "qq group", "xhs", "zhihu",
  // India
  "sharechat", "moj ", "josh ", "roposo", "koo ", "chingari", "mitron", "trell",
  // Sudeste Asiatico
  "zalo", "line ", "kakaotalk", "kakao", "grab", "shopee",
  // Japon/Korea
  "mixi", "naver", "picsart", "daum",
  // Otros
  "imo ", "viber", "likee", "bigo",
  // Hindi/India keywords en nombres
  "indian", "india", "hindi", "hindu", "desi", "bollywood",
  "pakistan", "bangladesh", "nepali", "tamil", "telugu", "kannada", "malayalam",
  // Arabe
  "arab", "arabic", "saudi", "emirates", "qatar", "kuwait", "bahrain",
  // Turco
  "turkish", "türk", "turk",
  // Ruso
  "russian", "россия", "русск",
  // Chino
  "chinese", "china", "中国",
  // Coreano
  "korean", "한국",
  // Japones
  "japanese", "japan", "日本",
];

function isAllowed(category: string, name: string): boolean {
  const text = (category + " " + name).toLowerCase();
  // Block first
  if (BLOCKED_PLATFORMS.some((b) => text.includes(b))) return false;
  // Then allow if any allowed platform is present
  return ALLOWED_PLATFORMS.some((p) => text.includes(p));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const featured = searchParams.get("featured") === "true";
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

    // Markup sobre precio: 200% de ganancia = precio × 3
    const MARKUP_MULTIPLIER = 3.0;

    // Fetch from both providers in parallel
    const [japRaw, bfRaw] = await Promise.all([
      getServices().catch(() => []),
      getBFServices().catch(() => []),
    ]);

    // Clean service data — remove provider info from frontend
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cleanService = (s: any, providerTag: string, idOffset = 0) => ({
      service: Number(s.service) + idOffset,
      name: String(s.name || ''),
      type: String(s.type || ''),
      category: String(s.category || ''),
      rate: (parseFloat(String(s.rate || '0')) * MARKUP_MULTIPLIER).toFixed(2),
      min: String(s.min || ''),
      max: String(s.max || ''),
      description: String(s.description || ''),
      refill: Boolean(s.refill),
      cancel: Boolean(s.cancel),
      // Internal tag — NOT exposed to frontend, only used by order route
      _p: providerTag,
    });

    const japServices = (Array.isArray(japRaw) ? japRaw : [])
      .filter((s) => isAllowed(s.category, s.name))
      .map((s) => cleanService(s, "j"));

    const bfServices = (Array.isArray(bfRaw) ? bfRaw : [])
      .filter((s) => isAllowed(s.category, s.name))
      .map((s) => cleanService(s, "b", 900000));

    // Merge and remove internal tag before sending to frontend
    const allServices = [...japServices, ...bfServices].map(({ _p, ...rest }) => rest);

    // If featured=true, only return services from top platforms (faster initial load)
    if (featured) {
      const FEATURED = ["instagram", "tiktok", "youtube", "facebook", "twitter", "telegram", "spotify"];
      const featuredServices = allServices.filter((s) => {
        const cat = s.category.toLowerCase();
        return FEATURED.some((p) => cat.includes(p));
      });
      // Return max 30 per platform, capped at ~100 total
      const result: typeof featuredServices = [];
      for (const platform of FEATURED) {
        const platServices = featuredServices.filter((s) => s.category.toLowerCase().includes(platform));
        result.push(...platServices.slice(0, 30));
        if (result.length >= 100) break;
      }
      return Response.json({ services: result, total: allServices.length });
    }

    return Response.json({ services: allServices });
  } catch (error) {
    console.error("SMM services error:", error);
    return Response.json({ error: "Error obteniendo servicios" }, { status: 500 });
  }
}
