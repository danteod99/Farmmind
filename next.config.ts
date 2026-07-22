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
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' connect.facebook.net",
      "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
      "img-src 'self' data: blob: www.facebook.com *.supabase.co *.googleusercontent.com",
      "media-src 'self' blob:",
      "font-src 'self' fonts.gstatic.com",
      "connect-src 'self' *.supabase.co api.nowpayments.io connect.facebook.net api.stripe.com api.anthropic.com",
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
      {
        // Multiediting: aislamiento cross-origin para habilitar SharedArrayBuffer
        // (ffmpeg.wasm multihilo). "credentialless" mantiene funcionando las
        // imágenes externas (avatars) en Chrome/Firefox; Safari cae al motor 1-hilo.
        source: "/smm/multiediting",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
    ];
  },
};

export default nextConfig;
