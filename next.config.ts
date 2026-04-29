import type { NextConfig } from "next";

const cspValue = [
  "default-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://*.stripe.com https://*.googleapis.com https://*.gstatic.com data: blob:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.stripe.com https://api.stripe.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "frame-src https://js.stripe.com https://hooks.stripe.com https://www.google.com",
].join("; ");

const nextConfig: NextConfig = {
  experimental: {
    forceSwcTransforms: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: cspValue },
          { key: "X-Frame-Options",         value: "SAMEORIGIN" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default nextConfig;
