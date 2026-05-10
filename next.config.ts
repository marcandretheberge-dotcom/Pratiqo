import type { NextConfig } from "next";

/** Enforcing CSP — unchanged (Phase A included; unsafe-inline / unsafe-eval retained). */
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
  // Phase A — additive hardening (no removal of unsafe-inline / unsafe-eval or domain narrowing)
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'self'",
  "manifest-src 'self'",
  "form-action 'self' https://*.stripe.com",
].join("; ");

/**
 * Stricter candidate policy for Report-Only only (ENABLE_CSP_REPORT_ONLY=1).
 * — default-src tightened to 'self' to surface violations without enforcing.
 * — script-src matches enforcing except unsafe-eval omitted (JSON-LD keeps unsafe-inline).
 * — No report-uri/report-to until a collector endpoint exists.
 */
const cspReportOnlyValue = [
  "default-src 'self'",
  "connect-src 'self'"
    + " https://*.supabase.co wss://*.supabase.co"
    + " https://*.stripe.com https://api.stripe.com"
    + " https://maps.googleapis.com https://*.googleapis.com https://maps.gstatic.com",
  "script-src 'self' 'unsafe-inline'"
    + " https://maps.googleapis.com https://maps.gstatic.com"
    + " https://*.supabase.co https://*.stripe.com https://js.stripe.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https: https://maps.googleapis.com https://maps.gstatic.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "frame-src https://js.stripe.com https://hooks.stripe.com https://www.google.com"
    + " https://www.youtube.com https://www.youtube-nocookie.com"
    + " https://player.vimeo.com",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'self'",
  "manifest-src 'self'",
  "form-action 'self' https://*.stripe.com",
].join("; ");

/** Next.js embeds matched route headers at build time — set ENABLE_CSP_REPORT_ONLY=1 before `next build` for Report-Only in production. */
function isCspReportOnlyEnabled(): boolean {
  return process.env.ENABLE_CSP_REPORT_ONLY?.trim() === "1";
}

const nextConfig: NextConfig = {
  experimental: {
    forceSwcTransforms: true,
    optimizePackageImports: ["lucide-react"],
  },
  async headers() {
    const routeHeaders: { key: string; value: string }[] = [
      { key: "Content-Security-Policy", value: cspValue },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    ];

    if (isCspReportOnlyEnabled()) {
      routeHeaders.push({
        key: "Content-Security-Policy-Report-Only",
        value: cspReportOnlyValue,
      });
    }

    return [
      {
        source: "/:path*",
        headers: routeHeaders,
      },
    ];
  },
};

export default nextConfig;
