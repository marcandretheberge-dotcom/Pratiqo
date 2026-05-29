import type { NextConfig } from "next";

/** Enforcing CSP — Phase A hardening; unsafe-inline kept where required; no eval in script/default. */
const cspValue = [
  // Fallback for any directive not explicitly listed below
  "default-src 'self' 'unsafe-inline' https://*.supabase.co https://*.stripe.com https://*.googleapis.com https://*.gstatic.com data: blob:",
  // Network requests: must list every origin explicitly — default-src does NOT apply here
  "connect-src 'self'"
    + " https://*.supabase.co wss://*.supabase.co"
    + " https://*.stripe.com https://api.stripe.com"
    + " https://maps.googleapis.com https://*.googleapis.com https://maps.gstatic.com",
  // Script sources (explicit so Google Maps JS API loads without relying on default-src)
  "script-src 'self' 'unsafe-inline'"
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
  // Phase A — additive hardening (no domain narrowing)
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'self'",
  "manifest-src 'self'",
  "form-action 'self' https://*.stripe.com",
].join("; ");

/**
 * Stricter candidate policy for Report-Only only (ENABLE_CSP_REPORT_ONLY=1).
 * — default-src tightened to 'self' to surface violations without enforcing.
 * — script-src matches enforcing except eval omitted (JSON-LD keeps unsafe-inline).
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
  async redirects() {
    return [
      // ── Canonical host: apex → www ────────────────────────────────────
      // Pratiqo's canonical production origin is `https://www.pratiqo.ca`
      // (see `lib/seo/site.ts` — used by metadataBase, every page's
      // `alternates.canonical`, the sitemap, robots.txt, and JSON-LD).
      //
      // We add an in-app 308 redirect from the apex (`pratiqo.ca`) to the
      // www subdomain so the URL Google crawls always matches the URL we
      // canonicalise to. The `has: [{ type: "host", value: "pratiqo.ca" }]`
      // condition fires only when the request `Host` header is the apex,
      // so this never loops on `www.pratiqo.ca`.
      //
      // Important non-goals:
      //   - Do NOT redirect the apex (or www) to `/fr`, `/en`, or `/es`.
      //     Pratiqo serves the same URL for every locale (cookie-driven),
      //     so forcing a locale path would split indexation and split
      //     PageRank between two URLs that render identical content.
      //   - Do NOT redirect on Accept-Language or geo IP — Googlebot must
      //     always reach the canonical homepage on a fresh request.
      //
      // Defence-in-depth note: this is a *fallback* — the primary apex→www
      // redirect should be configured at the hosting/DNS edge (Vercel
      // Domains: "Redirect to www.pratiqo.ca", or equivalent in Netlify).
      // If the edge rewrite already strips the apex before the request
      // reaches Next.js, this rule is simply inert. See the
      // `scripts/check_seo_edge_redirects.ts` live checker.
      {
        source: "/:path*",
        has: [{ type: "host", value: "pratiqo.ca" }],
        destination: "https://www.pratiqo.ca/:path*",
        permanent: true,
      },
      {
        source: "/devenir-tuteur",
        destination: "/devenir-professeur?vertical=academique",
        permanent: false,
      },
      // Legal route canonicalization. Legacy top-level paths used to host
      // their own legal pages with content that diverged over time from the
      // canonical /legal/* pages. The legacy page files have been removed
      // and these 308 redirects keep external/inbound links working while
      // telling search engines the move is permanent.
      {
        source: "/cgu",
        destination: "/legal/cgu",
        permanent: true,
      },
      {
        source: "/confidentialite",
        destination: "/legal/confidentialite",
        permanent: true,
      },
      {
        source: "/annulation",
        destination: "/legal/annulation",
        permanent: true,
      },
      {
        source: "/code-de-conduite",
        destination: "/legal/code-de-conduite",
        permanent: true,
      },
      // Pre-launch rename: the public/legal product was renamed from
      // "Teacher Pro" (an unclear "studio/tooling" framing) to
      // "Membre Pro" / "Pro Member" / "Miembro Pro" (a membership status
      // with economic advantages: reduced commission, ristourne/rewards).
      // /legal/teacher-pro is kept as a 308 redirect so any external/inbound
      // links keep working while the canonical route is /legal/membre-pro.
      {
        source: "/legal/teacher-pro",
        destination: "/legal/membre-pro",
        permanent: true,
      },
    ];
  },
  async headers() {
    // Permissions-Policy: Pratiqo does not currently request camera, microphone,
    // geolocation, payment, USB, or other privileged surfaces from the browser
    // (Stripe handles payment inside its own iframe, Maps uses lat/lng we
    // compute server-side). Disabling these by default reduces blast radius
    // from XSS or compromised third-party scripts.
    const permissionsPolicy = [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "payment=()",
      "usb=()",
      "magnetometer=()",
      "accelerometer=()",
      "gyroscope=()",
    ].join(", ");

    const routeHeaders: { key: string; value: string }[] = [
      { key: "Content-Security-Policy", value: cspValue },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      // Defense-in-depth: stop the browser from MIME-sniffing user-uploaded
      // content (avatar bucket is public) into executable types.
      { key: "X-Content-Type-Options", value: "nosniff" },
      // Privacy: prevent the full URL (which can include a sanitized `next`
      // query string or a teacher slug) from leaking to third-party origins.
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: permissionsPolicy },
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
