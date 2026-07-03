import { sanitizeRelativeRedirectPath } from "@/lib/auth/redirects";
import { SITE_URL } from "@/lib/seo/site";
import { publicIntentQueryValue, type PreAuthOnboardingIntent } from "@/lib/auth/preAuthOnboardingIntent";

const PRODUCTION_APEX_HOST = "pratiqo.ca";
const PRODUCTION_WWW_HOST = "www.pratiqo.ca";
const PRODUCTION_HOSTS = new Set([PRODUCTION_WWW_HOST, PRODUCTION_APEX_HOST]);

function isLocalDevHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

function isVercelPreviewHost(hostname: string): boolean {
  return hostname.endsWith(".vercel.app");
}

function isProductionHost(hostname: string): boolean {
  return PRODUCTION_HOSTS.has(hostname);
}

export function isProductionApexHost(hostname: string): boolean {
  return hostname === PRODUCTION_APEX_HOST;
}

/**
 * Resolve the browser/server origin used for OAuth redirects and post-auth navigation.
 * Preview and local dev stay on the initiating origin; production apex always maps to www.
 */
export function resolveOAuthRedirectOriginFromHost(
  hostname: string,
  origin: string,
  configuredSiteUrl?: string | null,
): string {
  if (isVercelPreviewHost(hostname) || isLocalDevHost(hostname)) {
    return origin;
  }

  if (isProductionApexHost(hostname)) {
    return SITE_URL;
  }

  if (isProductionHost(hostname)) {
    const configured = configuredSiteUrl?.trim().replace(/\/$/, "");
    if (configured) {
      try {
        return new URL(configured).origin;
      } catch {
        /* ignore invalid env */
      }
    }
    return origin;
  }

  // Custom staging domains and unknown hosts: never canonicalize to production.
  return origin;
}

/** Server-side canonical origin for redirects (OAuth callback, auth errors). */
export function resolveRequestCanonicalOrigin(requestUrl: URL): string {
  return resolveOAuthRedirectOriginFromHost(
    requestUrl.hostname,
    requestUrl.origin,
    process.env.NEXT_PUBLIC_SITE_URL,
  );
}

/** Prefer configured public site URL on production host; else current origin (preview/local). */
export function resolveOAuthRedirectOrigin(): string {
  if (typeof window === "undefined") return "";
  return resolveOAuthRedirectOriginFromHost(
    window.location.hostname,
    window.location.origin,
    process.env.NEXT_PUBLIC_SITE_URL,
  );
}

/** Build the Supabase OAuth redirectTo URL (must be allowlisted in Supabase). */
export function buildOAuthCallbackUrl(
  origin: string,
  params: { intent?: string; role?: string; next: string; ref?: string },
): string {
  const qs = new URLSearchParams();
  if (params.intent) qs.set("intent", params.intent);
  if (params.role) qs.set("role", params.role);
  qs.set("next", params.next);
  if (params.ref) qs.set("ref", params.ref);
  const base = origin.replace(/\/$/, "");
  return `${base}/auth/callback?${qs.toString()}`;
}

export function buildLoginUrlWithAuthError(
  origin: string,
  options?: { authError?: string; intent?: string | null; role?: string | null; next?: string | null },
): URL {
  const url = new URL("/login", origin);
  if (options?.authError) url.searchParams.set("auth_error", options.authError);
  const safeNext = sanitizeRelativeRedirectPath(options?.next ?? null);
  if (options?.intent === "learner" || options?.intent === "teacher") {
    url.searchParams.set("intent", publicIntentQueryValue(options.intent as PreAuthOnboardingIntent));
  } else if (options?.role === "teacher") {
    url.searchParams.set("intent", "teacher");
  }
  if (safeNext) url.searchParams.set("next", safeNext);
  return url;
}
