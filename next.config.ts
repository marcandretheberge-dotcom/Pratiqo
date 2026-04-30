import type { NextConfig } from "next";

const cspValue = [
  // Fallback for any directive not explicitly listed below
  "default-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://*.stripe.com https://*.googleapis.com https://*.gstatic.com data: blob:",
  // Network requests: must list every origin explicitly — default-src does NOT apply here
  "connect-src 'self'"
    + " https://*.supabase.co wss://*.supabase.co"
    + " https://*.stripe.com https://api.stripe.com"
    + " https://maps.googleapis.com https://*.googleapis.com https://maps.gstatic.com",
  // Script sources (explicit so Google Maps JS API loads without relying on default-src)
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    + " https://maps.googleapis.com https://maps.gstatic.com"
    + " https://*.supabase.co https://*.stripe.com https://js.stripe.com",
  // Stylesheets (Google Maps injects inline styles; unsafe-inline is required)
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Images: tiles served from maps.gstatic.com + maps.googleapis.com + data URIs
  "img-src 'self' data: blob: https: https://maps.googleapis.com https://maps.gstatic.com",
  // Fonts: Google Maps icon fonts live on fonts.gstatic.com
  "font-src 'self' data: https://fonts.gstatic.com",
  "frame-src https://js.stripe.com https://hooks.stripe.com https://www.google.com"
    + " https://www.youtube.com https://www.youtube-nocookie.com"
    + " https://player.vimeo.com",
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
