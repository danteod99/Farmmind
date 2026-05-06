import { NextResponse } from "next/server";

// /r/[code] — short link de invitacion.
// Setea cookie 'ref' y redirige al landing principal.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const cleanCode = (code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);

  const url = new URL("/", _req.url);
  if (cleanCode) {
    url.searchParams.set("ref", cleanCode);
  }
  const res = NextResponse.redirect(url);
  if (cleanCode) {
    res.cookies.set("ref", cleanCode, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 dias
      sameSite: "lax",
      secure: true,
      httpOnly: false, // accesible desde JS para leer en signup
    });
  }
  return res;
}
