import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      // blob: y worker-src son necesarios para el motor de video (ffmpeg.wasm),
      // que corre en un Web Worker y carga el core como blob:.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: connect.facebook.net",
      "worker-src 'self' blob:",
      "child-src 'self' blob:",
      "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
      "img-src 'self' data: blob: www.facebook.com *.supabase.co *.googleusercontent.com",
      "media-src 'self' blob:",
      "font-src 'self' fonts.gstatic.com",
      "connect-src 'self' blob: data: *.supabase.co api.nowpayments.io connect.facebook.net api.stripe.com api.anthropic.com",
      "frame-src js.stripe.com www.loom.com",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
      // NOTA: se quitaron los headers COOP/COEP de /smm/multiediting. Se usaban para
      // habilitar SharedArrayBuffer (ffmpeg.wasm multihilo), pero el motor ahora corre
      // en single-thread. El COEP "credentialless" rompía el Web Worker + blob del
      // motor ("timeout cargando el motor"). Sin ese aislamiento, el worker carga bien.
    ];
  },
};

export default nextConfig;
