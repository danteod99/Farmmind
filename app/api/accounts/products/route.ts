import {
  CATEGORY_MAP,
  ALLOWED_CATEGORY_IDS,
  dsCall,
  normalizeProduct,
  type ProductDTO,
} from "../_lib";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const categoryParam = (url.searchParams.get("category") || "all").toLowerCase();
  const q = url.searchParams.get("q") || "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const perPage = Math.min(50, Math.max(1, parseInt(url.searchParams.get("per_page") || "24", 10) || 24));

  // Resolver category_id(s)
  let categoryIds: number[];
  if (categoryParam === "all") {
    categoryIds = ALLOWED_CATEGORY_IDS;
  } else if (CATEGORY_MAP[categoryParam]) {
    categoryIds = [CATEGORY_MAP[categoryParam].id];
  } else {
    return Response.json({ error: "Categoría inválida" }, { status: 400 });
  }

  try {
    // Si es "all" hacemos paralelo a las 5 categorías y mezclamos.
    // Si es una, hacemos una sola llamada con paginación.
    let products: ProductDTO[] = [];
    let totalCount = 0;

    if (categoryIds.length === 1) {
      const params: Record<string, string | number | boolean> = {
        category_id: categoryIds[0],
        only_in_stock: 1,
        page,
        "per-page": perPage,
      };
      if (q) params.name = q;

      const res = await dsCall<{ items: unknown[]; _meta?: { totalCount?: number } }>(
        "product/list",
        params,
        { revalidate: 60 }
      );
      if (!res.success) {
        const dbg = url.searchParams.get("debug") === "1";
        return Response.json({
          error: "Error consultando dark.shopping",
          ...(dbg ? { upstream: res, key_present: !!process.env.DARKSHOPPING_API_KEY, key_len: (process.env.DARKSHOPPING_API_KEY || "").length } : {}),
        }, { status: 502 });
      }
      products = (res.data.items || []).map((p) => normalizeProduct(p as Parameters<typeof normalizeProduct>[0]));
      totalCount = res.data._meta?.totalCount || products.length;
    } else {
      // "all" — top-N por categoría para mostrar variedad
      const perCat = Math.max(4, Math.floor(perPage / categoryIds.length));
      const results = await Promise.allSettled(
        categoryIds.map((cid) => {
          const params: Record<string, string | number | boolean> = {
            category_id: cid,
            only_in_stock: 1,
            "per-page": perCat,
            page: 1,
          };
          if (q) params.name = q;
          return dsCall<{ items: unknown[]; _meta?: { totalCount?: number } }>(
            "product/list",
            params,
            { revalidate: 60 }
          );
        })
      );

      for (const r of results) {
        if (r.status === "fulfilled" && r.value.success) {
          const items = (r.value.data.items || []).map((p) =>
            normalizeProduct(p as Parameters<typeof normalizeProduct>[0])
          );
          products.push(...items);
          totalCount += r.value.data._meta?.totalCount || items.length;
        }
      }
    }

    // Filtro defensivo: solo auto-entrega (no manual)
    products = products.filter((p) => !p.is_manual && p.qty_available > 0);

    return Response.json({
      products,
      total: totalCount,
      page,
      per_page: perPage,
      categories: Object.entries(CATEGORY_MAP).map(([key, c]) => ({
        key,
        name: c.name,
        emoji: c.emoji,
      })),
    });
  } catch (e) {
    console.error("[/api/accounts/products] error:", e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
