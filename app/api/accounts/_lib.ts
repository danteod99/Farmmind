// Shared helpers for dark.shopping integration.

export const DS_BASE = "https://dark.shopping/api/v1";

// Categorías permitidas: solo Gmail, Instagram, Facebook, TikTok, Telegram.
export const CATEGORY_MAP: Record<string, { id: number; name: string; emoji: string }> = {
  gmail:     { id: 129, name: "Gmail",     emoji: "📧" },
  instagram: { id: 30,  name: "Instagram", emoji: "📸" },
  facebook:  { id: 31,  name: "Facebook",  emoji: "👥" },
  tiktok:    { id: 33,  name: "TikTok",    emoji: "🎵" },
  telegram:  { id: 43,  name: "Telegram",  emoji: "✈️" },
};

export function getCategoryKeyById(id: number): string | null {
  for (const [key, cfg] of Object.entries(CATEGORY_MAP)) {
    if (cfg.id === id) return key;
  }
  return null;
}

export const ALLOWED_CATEGORY_IDS = Object.values(CATEGORY_MAP).map((c) => c.id);

// Markup y conversión.
export function getMarkup(): number {
  const m = parseFloat(process.env.DARKSHOPPING_MARKUP || "3");
  return Number.isFinite(m) && m > 0 ? m : 3;
}

export function getUsdPerRub(): number {
  const r = parseFloat(process.env.DARKSHOPPING_USD_PER_RUB || "0.011");
  return Number.isFinite(r) && r > 0 ? r : 0.011;
}

export function rubToUsd(rubPrice: number, quantity = 1): number {
  const usd = rubPrice * quantity * getUsdPerRub() * getMarkup();
  return Math.round(usd * 100) / 100;
}

// Llamada genérica al API de dark.shopping. Maneja errores y rate limiting básico.
type DSResponse<T> = { success: boolean; data: T };

export async function dsCall<T = unknown>(
  path: string,
  params: Record<string, string | number | boolean | undefined> = {},
  init: { method?: "GET" | "POST"; revalidate?: number; cache?: RequestCache } = {}
): Promise<DSResponse<T>> {
  const key = process.env.DARKSHOPPING_API_KEY;
  if (!key) throw new Error("DARKSHOPPING_API_KEY not set");

  const method = init.method || "GET";
  const merged: Record<string, string> = { key };
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    merged[k] = String(v);
  }

  let url = `${DS_BASE}/${path}`;
  let body: BodyInit | undefined;
  let headers: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (TrustMind farm)",
    Accept: "application/json",
  };

  if (method === "GET") {
    const qs = new URLSearchParams(merged).toString();
    url += `?${qs}`;
  } else {
    body = new URLSearchParams(merged).toString();
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  }

  const fetchInit: RequestInit & { next?: { revalidate?: number } } = {
    method,
    headers,
    body,
  };
  if (init.cache) fetchInit.cache = init.cache;
  else if (init.revalidate !== undefined) fetchInit.next = { revalidate: init.revalidate };

  const res = await fetch(url, fetchInit);
  if (!res.ok && res.status !== 400) {
    throw new Error(`dark.shopping ${path} HTTP ${res.status}`);
  }
  const json = (await res.json()) as DSResponse<T>;
  return json;
}

// Normaliza un producto de dark.shopping al shape que consume el frontend.
interface DSProductRaw {
  id: number | string;
  name?: string;
  description?: string;
  miniature?: string;
  price?: string | number;
  quantity?: number;
  minimum_order?: number;
  is_manual_order_delivery?: number | boolean;
  guarantee_time_seconds?: number;
  rating?: number;
  purchase_counter?: number;
  category?: { id?: number; name?: string };
}

export interface ProductDTO {
  id: string;
  name: string;
  description: string;
  image: string | null;
  price_usd: number;
  qty_available: number;
  min_qty: number;
  is_manual: boolean;
  guarantee_seconds: number;
  rating: number;
  category_key: string | null;
  category_name: string | null;
}

export function normalizeProduct(p: DSProductRaw): ProductDTO {
  const rub = parseFloat(String(p.price ?? 0)) || 0;
  return {
    id: String(p.id),
    name: p.name || "Producto",
    description: p.description || "",
    image: p.miniature || null,
    price_usd: rubToUsd(rub),
    qty_available: Number(p.quantity || 0),
    min_qty: Number(p.minimum_order || 1),
    is_manual: Boolean(p.is_manual_order_delivery),
    guarantee_seconds: Number(p.guarantee_time_seconds || 0),
    rating: Number(p.rating || 0),
    category_key: p.category?.id ? getCategoryKeyById(p.category.id) : null,
    category_name: p.category?.name || null,
  };
}
